import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import {
  Database,
  Server,
  Zap,
  Layers,
  HardDrive,
  Activity,
  Play,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  Code2,
  Table,
} from 'lucide-react';

interface DatabaseMetrics {
  postgres: any;
  mongo: any;
  redis: any;
  cassandra: any;
  timestamp: string;
}

interface SimulationTimelineStep {
  step: number;
  database: 'REDIS' | 'MONGO' | 'POSTGRES' | 'CASSANDRA';
  operation: string;
  description: string;
  latencyMs: number;
  payload: any;
}

export const DatabaseConsole: React.FC = () => {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [samples, setSamples] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'POSTGRES' | 'MONGO' | 'REDIS' | 'CASSANDRA'>('POSTGRES');

  // Query Terminal State
  const [queryInput, setQueryInput] = useState<string>('SELECT * FROM invoices LIMIT 5');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState<boolean>(false);

  // Simulation State
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<{
    invoiceId: string;
    totalTimeMs: number;
    grandTotal: number;
    timeline: SimulationTimelineStep[];
  } | null>(null);

  const fetchOverview = async () => {
    try {
      const [resMetrics, resSamples] = await Promise.all([
        api.databases.getOverview(),
        api.databases.getSamples(),
      ]);
      setMetrics(resMetrics);
      setSamples(resSamples);
    } catch (err) {
      console.error('Failed to load database overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const timer = setInterval(fetchOverview, 10000);
    return () => clearInterval(timer);
  }, []);

  // Update default query when switching tabs
  const handleTabChange = (tab: 'POSTGRES' | 'MONGO' | 'REDIS' | 'CASSANDRA') => {
    setActiveTab(tab);
    setQueryResult(null);
    if (tab === 'POSTGRES') {
      setQueryInput('SELECT id, invoice_number, subtotal, tax_amount, total_amount, payment_status FROM invoices LIMIT 5');
    } else if (tab === 'MONGO') {
      setQueryInput('db.products_catalog.find({ category: "Snacks" })');
    } else if (tab === 'REDIS') {
      setQueryInput('KEYS cache:barcode:*');
    } else if (tab === 'CASSANDRA') {
      setQueryInput('SELECT * FROM lumora_audit.audit_events_by_day');
    }
  };

  const handleExecuteQuery = async () => {
    setQueryLoading(true);
    try {
      const data = await api.databases.executeQuery({
        targetDatabase: activeTab,
        queryText: queryInput,
      });
      setQueryResult(data);
    } catch (err: any) {
      setQueryResult({ error: err.message || 'Execution failed' });
    } finally {
      setQueryLoading(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const data = await api.databases.simulateTransaction({
        items: [
          { name: 'Maggi 2-Minute Noodles 70g', sku: 'SNK-MAG-70', price: 14.0, quantity: 2 },
          { name: 'Tata Salt 1kg', sku: 'GRC-TAT-1K', price: 28.0, quantity: 1 },
          { name: 'Thums Up 750ml', sku: 'BEV-THU-750', price: 45.0, quantity: 1 },
        ],
        customerPhone: '+91 98201 22334',
        paymentMethod: 'UPI',
      });
      setSimResult(data);
      // Refresh metrics
      fetchOverview();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 select-none font-sans">
      {/* 1. Header with Live Pulse */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-neutral-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-[#68151F]/10 text-[#68151F]">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">
              4-Database Polyglot Architecture
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Coordinated enterprise storage: PostgreSQL (ACID Ledger), MongoDB (Dynamic Product & CRM Documents),
            Redis (In-Memory Hot Barcode Cache), and Apache Cassandra (Append-Only Audit SSTables).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>4 / 4 Engines Online</span>
          </div>

          <button
            type="button"
            onClick={fetchOverview}
            className="p-2 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Database Topology Cards (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Engine 1: PostgreSQL */}
        <div
          onClick={() => handleTabChange('POSTGRES')}
          className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === 'POSTGRES'
              ? 'border-[#102A43] bg-blue-50/20 shadow-md ring-2 ring-[#102A43]/20'
              : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                  🐘
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900">PostgreSQL</h3>
                  <span className="text-[10px] text-neutral-500 font-mono">v16.2 · Relational</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                ACID
              </span>
            </div>

            <div className="mt-4 text-xs font-semibold text-neutral-700">
              Core Ledger & GST Invoices
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
              Foreign keys, double-entry inventory ledger, and multi-tenant shop tables.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-400 block text-[10px]">Tables:</span>
              <span className="font-bold text-neutral-800 font-mono">
                {metrics?.postgres?.tablesCount || 14} tables
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Avg Latency:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {metrics?.postgres?.avgLatencyMs || 2.15} ms
              </span>
            </div>
          </div>
        </div>

        {/* Engine 2: MongoDB */}
        <div
          onClick={() => handleTabChange('MONGO')}
          className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === 'MONGO'
              ? 'border-[#137333] bg-emerald-50/20 shadow-md ring-2 ring-[#137333]/20'
              : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  🍃
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900">MongoDB</h3>
                  <span className="text-[10px] text-neutral-500 font-mono">v7.0 · Document</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                BSON
              </span>
            </div>

            <div className="mt-4 text-xs font-semibold text-neutral-700">
              Catalog & Customer CRM
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
              Polymorphic product attributes (expiry, batch, IMEI) and customer loyalty tiers.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-400 block text-[10px]">Collections:</span>
              <span className="font-bold text-neutral-800 font-mono">
                {metrics?.mongo?.collectionsCount || 3} col
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Avg Latency:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {metrics?.mongo?.avgLatencyMs || 1.15} ms
              </span>
            </div>
          </div>
        </div>

        {/* Engine 3: Redis */}
        <div
          onClick={() => handleTabChange('REDIS')}
          className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === 'REDIS'
              ? 'border-red-600 bg-red-50/20 shadow-md ring-2 ring-red-600/20'
              : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-800 flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900">Redis</h3>
                  <span className="text-[10px] text-neutral-500 font-mono">v7.2 · In-Memory</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold">
                0.18ms
              </span>
            </div>

            <div className="mt-4 text-xs font-semibold text-neutral-700">
              Hot Barcodes & Till Sessions
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
              Sub-millisecond barcode cache, held bills, and live cashier register states.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-400 block text-[10px]">Total Keys:</span>
              <span className="font-bold text-neutral-800 font-mono">
                {metrics?.redis?.keysCount || 6} keys
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Hit Ratio:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {metrics?.redis?.hitRate || '98.5%'}
              </span>
            </div>
          </div>
        </div>

        {/* Engine 4: Apache Cassandra */}
        <div
          onClick={() => handleTabChange('CASSANDRA')}
          className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
            activeTab === 'CASSANDRA'
              ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-600/20'
              : 'border-neutral-200/90 bg-white hover:border-neutral-300 shadow-2xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                  👁️
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900">Apache Cassandra</h3>
                  <span className="text-[10px] text-neutral-500 font-mono">v5.0 · Wide-Column</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                SSTable
              </span>
            </div>

            <div className="mt-4 text-xs font-semibold text-neutral-700">
              Audit Logs & Scan Trails
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
              Append-only SSTables for high-velocity hardware scans and tamper-proof bill archives.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-neutral-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-neutral-400 block text-[10px]">Write Throughput:</span>
              <span className="font-bold text-neutral-800 font-mono">
                {metrics?.cassandra?.writeThroughputIOPS || 1240} IOPS
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Write Latency:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {metrics?.cassandra?.avgWriteLatencyMs || 0.42} ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Multi-Database Transaction Simulator */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#68151F]" />
              <h3 className="text-sm font-extrabold text-neutral-900">
                Live Polyglot Transaction Simulator
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Simulate a real checkout sale and observe all 4 databases executing in parallel with sub-5ms total latency.
            </p>
          </div>

          <button
            type="button"
            disabled={simulating}
            onClick={handleRunSimulation}
            className="flex items-center space-x-2 px-4 py-2 bg-[#68151F] hover:bg-[#7D1422] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {simulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Execute 4-DB Checkout</span>
          </button>
        </div>

        {/* Timeline Visualization */}
        {simResult ? (
          <div className="mt-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between bg-neutral-50 px-4 py-2.5 rounded-2xl border border-neutral-200/80 text-xs">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-neutral-800">
                  Transaction {simResult.invoiceId} Completed Successfully
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-neutral-500">
                  Total Amount: <strong className="font-mono text-neutral-900">₹{simResult.grandTotal}</strong>
                </span>
                <span className="text-neutral-500">
                  Total Execution Time:{' '}
                  <strong className="font-mono text-emerald-700">{simResult.totalTimeMs} ms</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
              {simResult.timeline.map((step) => {
                const badgeColor =
                  step.database === 'REDIS'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : step.database === 'MONGO'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : step.database === 'POSTGRES'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                return (
                  <div
                    key={step.step}
                    className="p-3.5 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 flex flex-col justify-between text-xs space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                          Step {step.step}: {step.database}
                        </span>
                        <span className="font-mono font-bold text-neutral-600 text-[11px]">
                          {step.latencyMs} ms
                        </span>
                      </div>

                      <div className="font-mono text-[10px] font-bold text-neutral-800 mt-2 truncate">
                        {step.operation}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
                        {step.description}
                      </p>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-neutral-200/80 font-mono text-[10px] text-neutral-700 overflow-x-auto">
                      <pre>{JSON.stringify(step.payload, null, 1)}</pre>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-400 text-xs">
            <Activity className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-600">Ready to trace cross-database execution</p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Click &quot;Execute 4-DB Checkout&quot; to see real-time data propagation across Redis, Mongo, Postgres, and Cassandra.
            </p>
          </div>
        )}
      </div>

      {/* 4. Live Query Terminal & Data Inspector */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#68151F]" />
            <h3 className="text-sm font-extrabold text-neutral-900">
              Live Query Console & Inspectable Records
            </h3>
          </div>

          {/* Database Selector Tabs */}
          <div className="flex items-center space-x-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-bold">
            {(['POSTGRES', 'MONGO', 'REDIS', 'CASSANDRA'] as const).map((dbKey) => (
              <button
                key={dbKey}
                type="button"
                onClick={() => handleTabChange(dbKey)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeTab === dbKey
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {dbKey}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input Bar */}
        <div className="mt-4 flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
              placeholder="Enter query command..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#68151F]"
            />
          </div>
          <button
            type="button"
            disabled={queryLoading}
            onClick={handleExecuteQuery}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
          >
            {queryLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Execute</span>
          </button>
        </div>

        {/* Query Output View */}
        {queryResult && (
          <div className="mt-3 p-3 rounded-2xl bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto max-h-72">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[10px] text-neutral-400">
              <span>Status: SUCCESS · Latency: {queryResult.latencyMs || 0} ms</span>
              <span>Rows / Items: {queryResult.rowsCount || 0}</span>
            </div>
            <pre>{JSON.stringify(queryResult.result || queryResult, null, 2)}</pre>
          </div>
        )}

        {/* Sample Live Records Table preview for active tab */}
        <div className="mt-5 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-neutral-800 flex items-center space-x-1.5">
              <Table className="w-3.5 h-3.5 text-neutral-500" />
              <span>
                Live Data Preview:{' '}
                {activeTab === 'POSTGRES'
                  ? 'Invoices & Financial Ledger'
                  : activeTab === 'MONGO'
                  ? 'Product Documents & Attributes'
                  : activeTab === 'REDIS'
                  ? 'Hot Key-Value Pairs'
                  : 'SSTable Partitioned Audit Events'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">Auto-synced</span>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-3 max-h-60 overflow-y-auto">
            {activeTab === 'POSTGRES' && (
              <div className="divide-y divide-neutral-200 text-xs font-mono">
                {(samples?.postgres?.invoices || []).map((inv: any) => (
                  <div key={inv.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-neutral-900">{inv.invoice_number}</span>
                      <span className="text-neutral-500 ml-2 text-[11px]">Subtotal: ₹{inv.subtotal}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-emerald-700">₹{inv.total_amount}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                        {inv.payment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'MONGO' && (
              <div className="space-y-2 text-xs">
                {(samples?.mongo?.products || []).map((p: any) => (
                  <div key={p._id} className="p-2.5 rounded-xl bg-white border border-neutral-200/80 font-mono text-[11px]">
                    <div className="flex items-center justify-between font-bold text-neutral-900">
                      <span>{p.name} ({p.sku})</span>
                      <span className="text-emerald-700">₹{p.price}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      Nested Attributes: {JSON.stringify(p.attributes || {})}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'REDIS' && (
              <div className="divide-y divide-neutral-200 text-xs font-mono">
                {(samples?.redis?.keys || []).map((k: any) => (
                  <div key={k.key} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-red-700">{k.key}</span>
                      <span className="text-[10px] text-neutral-400 ml-2">({k.type})</span>
                    </div>
                    <div className="text-[11px] text-neutral-700 truncate max-w-xs">
                      {typeof k.value === 'object' ? JSON.stringify(k.value) : String(k.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'CASSANDRA' && (
              <div className="divide-y divide-neutral-200 text-xs font-mono">
                {(samples?.cassandra?.audit || []).map((a: any, idx: number) => (
                  <div key={idx} className="py-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-800">
                        Partition: {a.partition_key}
                      </span>
                      <span className="text-neutral-400 text-[10px]">
                        Cluster: {a.clustering_key}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-600 mt-0.5">
                      Event: {a.event_type || a.action} · Actor: {a.actor || a.device}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Architectural Guide Card */}
      <div className="bg-[#FAF7F2] border border-[#E5DFD5] rounded-3xl p-5 shadow-2xs text-xs text-neutral-700">
        <div className="flex items-center space-x-2 font-extrabold text-neutral-900 mb-2">
          <Info className="w-4 h-4 text-[#68151F]" />
          <span>LUMORA Polyglot Persistence Architecture Rules</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 text-[11px] leading-relaxed">
          <div className="p-3 bg-white rounded-2xl border border-[#E5DFD5]">
            <strong className="text-neutral-900 block mb-1">1. PostgreSQL (ACID)</strong>
            Never compromise on invoice numbers, tax math, or inventory balance sheet totals. All writes use atomic ACID transactions.
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E5DFD5]">
            <strong className="text-neutral-900 block mb-1">2. Redis (Cache)</strong>
            Never query the primary database for repetitive barcode scans. Warm the cache on boot and invalidate on stock changes.
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E5DFD5]">
            <strong className="text-neutral-900 block mb-1">3. MongoDB (Document)</strong>
            Use polymorphic schemas for different departments (grocery, electronics, apparel) and customer reward point documents.
          </div>
          <div className="p-3 bg-white rounded-2xl border border-[#E5DFD5]">
            <strong className="text-neutral-900 block mb-1">4. Cassandra (SSTables)</strong>
            Use append-only log structures for hardware scanner events, audit trails, and multi-store offline disaster recovery.
          </div>
        </div>
      </div>
    </div>
  );
};
