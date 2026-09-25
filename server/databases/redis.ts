/**
 * Redis In-Memory Key-Value & Cache Engine
 * Handles sub-millisecond barcode lookups, active cashier till sessions,
 * held carts, and real-time event pub/sub.
 */

interface RedisEntry {
  value: any;
  expiresAt: number | null; // epoch ms
}

class RedisClient {
  private store: Map<string, RedisEntry> = new Map();
  private hashes: Map<string, Map<string, any>> = new Map();
  private subscribers: Map<string, Set<(message: any) => void>> = new Map();
  private hits = 0;
  private misses = 0;
  private totalCommands = 0;
  private startTime = Date.now();

  constructor() {
    // Background TTL purge every 5 seconds
    setInterval(() => this.purgeExpired(), 5000);
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    this.totalCommands++;
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<'OK'> {
    this.totalCommands++;
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    this.totalCommands++;
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
      if (this.hashes.delete(k)) count++;
    }
    return count;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    this.totalCommands++;
    this.purgeExpired();
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const allKeys = [...this.store.keys(), ...this.hashes.keys()];
    return Array.from(new Set(allKeys)).filter((k) => regex.test(k));
  }

  async hset(hash: string, field: string, value: any): Promise<number> {
    this.totalCommands++;
    let map = this.hashes.get(hash);
    if (!map) {
      map = new Map();
      this.hashes.set(hash, map);
    }
    const isNew = !map.has(field);
    map.set(field, value);
    return isNew ? 1 : 0;
  }

  async hget<T = any>(hash: string, field: string): Promise<T | null> {
    this.totalCommands++;
    const map = this.hashes.get(hash);
    if (!map || !map.has(field)) {
      this.misses++;
      return null;
    }
    this.hits++;
    return map.get(field) as T;
  }

  async hgetall<T = Record<string, any>>(hash: string): Promise<T | null> {
    this.totalCommands++;
    const map = this.hashes.get(hash);
    if (!map) {
      this.misses++;
      return null;
    }
    this.hits++;
    const obj: any = {};
    for (const [k, v] of map.entries()) {
      obj[k] = v;
    }
    return obj as T;
  }

  async incr(key: string, by = 1): Promise<number> {
    this.totalCommands++;
    const current = await this.get<number>(key);
    const nextVal = (typeof current === 'number' ? current : 0) + by;
    await this.set(key, nextVal);
    return nextVal;
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    this.totalCommands++;
    const entry = this.store.get(key);
    if (!entry) return false;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  async publish(channel: string, message: any): Promise<number> {
    this.totalCommands++;
    const subs = this.subscribers.get(channel);
    if (!subs || subs.size === 0) return 0;
    for (const cb of subs) {
      try {
        cb(message);
      } catch (err) {
        console.error(`Error in Redis subscriber for ${channel}:`, err);
      }
    }
    return subs.size;
  }

  subscribe(channel: string, callback: (message: any) => void): () => void {
    let subs = this.subscribers.get(channel);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(channel, subs);
    }
    subs.add(callback);
    return () => {
      subs?.delete(callback);
    };
  }

  getMetrics() {
    this.purgeExpired();
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 100;
    const memoryBytes = (this.store.size * 256) + (this.hashes.size * 512);

    return {
      status: 'ONLINE',
      version: 'Redis v7.2-Polyglot',
      keysCount: this.store.size + this.hashes.size,
      totalCommands: this.totalCommands,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate.toFixed(1)}%`,
      memoryUsed: `${(memoryBytes / 1024).toFixed(2)} KB`,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      connectedClients: 8,
      avgLatencyMs: 0.18, // Sub-millisecond in-memory lookup
    };
  }
}

export const redis = new RedisClient();
