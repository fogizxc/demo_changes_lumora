import { Router, Request, Response } from 'express';
import {
  getPolyglotOverview,
  executeSimulatedMultiDbTransaction,
  postgres,
  mongo,
  redis,
  cassandra,
} from '../databases/manager.js';
import { requireSuperAdmin } from '../services/auth.js';
import { logAuditEvent } from '../services/audit.js';

export const databasesRouter = Router();

// Enterprise Security Hardening: All internal database tools require Super Admin privilege
databasesRouter.use(requireSuperAdmin);

// 1. Get real-time overview & metrics for all 4 databases
databasesRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const overview = getPolyglotOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch database metrics' });
  }
});

// 2. Fetch sample inspectable records across all 4 databases
databasesRouter.get('/samples', async (req: Request, res: Response) => {
  try {
    // 1. Postgres sample rows
    const postgresInvoices = postgres.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 5');
    const postgresShops = postgres.query('SELECT id, name, gst_number, shop_type, status FROM shops LIMIT 5');

    // 2. Mongo sample documents
    const mongoProducts = await mongo.collection('products_catalog').find({}, { limit: 5 });
    const mongoCustomers = await mongo.collection('customer_crm').find({}, { limit: 5 });

    // 3. Redis sample keys & values
    const redisKeys = await redis.keys('*');
    const redisSamples: Array<{ key: string; value: any; type: string }> = [];
    for (const k of redisKeys.slice(0, 8)) {
      if (k.startsWith('session:till:')) {
        const val = await redis.hgetall(k);
        redisSamples.push({ key: k, value: val, type: 'hash' });
      } else {
        const val = await redis.get(k);
        redisSamples.push({ key: k, value: val, type: 'string/json' });
      }
    }

    // 4. Cassandra sample wide-column rows
    const cassandraAudit = await cassandra.table('lumora_audit', 'audit_events_by_day').selectAll(5);
    const cassandraReceipts = await cassandra.table('lumora_archives', 'receipts_archive').selectAll(5);

    res.json({
      postgres: { invoices: postgresInvoices, shops: postgresShops },
      mongo: { products: mongoProducts, customers: mongoCustomers },
      redis: { keys: redisSamples },
      cassandra: { audit: cassandraAudit, receipts: cassandraReceipts },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load database samples' });
  }
});

// 3. Execute interactive live query on selected database (Protected with strict DDL/destructive block)
databasesRouter.post('/query', async (req: Request, res: Response) => {
  const { targetDatabase, queryText } = req.body;
  const start = performance.now();

  try {
    let result: any = null;
    const sanitizedQuery = (queryText || '').trim();

    // Security Hardening: Enforce strict READ-ONLY policies across all 4 database engines
    const forbiddenPatterns = [
      /\b(DROP|TRUNCATE|ALTER|ATTACH|DETACH|GRANT|REVOKE|DELETE|UPDATE|INSERT|REPLACE|PRAGMA|EXEC)\b/i,
      /;/g, // Prevent query stacking/chaining
      /\b(auth_tokens|password_hash)\b/i, // Prevent credential dump
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(sanitizedQuery)) {
        return res.status(403).json({
          error: 'Security Policy Violation: Database Console permits strictly audited, single-statement read-only SELECT queries. Modifying data or dumping authentication tables is forbidden.',
        });
      }
    }

    if (targetDatabase === 'POSTGRES') {
      if (!sanitizedQuery.trim().toUpperCase().startsWith('SELECT')) {
        return res.status(403).json({ error: 'Security Policy: Only SELECT statements are permitted on PostgreSQL engine.' });
      }
      const sql = sanitizedQuery || 'SELECT id, invoice_number, subtotal, tax_amount, total_amount, payment_status FROM invoices ORDER BY created_at DESC LIMIT 10';
      result = postgres.query(sql);
    } else if (targetDatabase === 'MONGO') {
      const colName = sanitizedQuery.includes('customer_crm') ? 'customer_crm' : 'products_catalog';
      result = await mongo.collection(colName).find({}, { limit: 10 });
    } else if (targetDatabase === 'REDIS') {
      const parts = (sanitizedQuery || 'KEYS *').trim().split(/\s+/);
      const cmd = parts[0]?.toUpperCase();
      const allowedRedisCmds = ['KEYS', 'GET', 'HGETALL', 'TTL'];
      if (!allowedRedisCmds.includes(cmd)) {
        return res.status(403).json({ error: `Security Policy: Redis command '${cmd}' is blocked. Only read-only inspect commands (KEYS, GET, HGETALL) are permitted.` });
      }
      if (cmd === 'KEYS') {
        const keys = await redis.keys(parts[1] || '*');
        result = keys;
      } else if (cmd === 'GET') {
        result = await redis.get(parts[1]);
      } else if (cmd === 'HGETALL') {
        result = await redis.hgetall(parts[1]);
      } else {
        result = await redis.keys('*');
      }
    } else if (targetDatabase === 'CASSANDRA') {
      if (!sanitizedQuery.trim().toUpperCase().startsWith('SELECT')) {
        return res.status(403).json({ error: 'Security Policy: Only SELECT CQL statements are permitted on Cassandra engine.' });
      }
      const cql = sanitizedQuery || 'SELECT * FROM lumora_audit.audit_events_by_day';
      result = await cassandra.executeCql(cql);
    } else {
      return res.status(400).json({ error: 'Invalid database target. Choose POSTGRES, MONGO, REDIS, or CASSANDRA.' });
    }

    logAuditEvent({
      actorId: req.auth!.userId!,
      actorRole: 'SUPER_ADMIN',
      action: 'DATABASE_QUERY_EXECUTED',
      targetType: 'DATABASE',
      targetId: targetDatabase,
      after: { query: sanitizedQuery },
    });

    const latencyMs = parseFloat((performance.now() - start).toFixed(3));
    res.json({
      database: targetDatabase,
      latencyMs,
      rowsCount: Array.isArray(result) ? result.length : 1,
      result,
    });
  } catch (err: any) {
    res.status(400).json({
      error: err.message || 'Query execution failed',
      latencyMs: parseFloat((performance.now() - start).toFixed(3)),
    });
  }
});

// 4. Run end-to-end multi-database POS transaction simulation
databasesRouter.post('/simulate-transaction', async (req: Request, res: Response) => {
  try {
    const items = req.body.items || [
      { name: 'Maggi 2-Minute Noodles 70g', sku: 'SNK-MAG-70', price: 14.0, quantity: 2 },
      { name: 'Tata Salt 1kg', sku: 'GRC-TAT-1K', price: 28.0, quantity: 1 },
      { name: 'Thums Up 750ml', sku: 'BEV-THU-750', price: 45.0, quantity: 1 },
    ];

    const result = await executeSimulatedMultiDbTransaction({
      items,
      customerPhone: req.body.customerPhone || '+91 98201 22334',
      paymentMethod: req.body.paymentMethod || 'UPI',
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Simulated transaction failed' });
  }
});
