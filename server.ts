import path from 'path';
import fs from 'fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './server/db.js';
import { authenticate } from './server/services/auth.js';
import { authRouter } from './server/routes/auth.js';
import { superAdminRouter } from './server/routes/superAdmin.js';
import { shopAdminRouter } from './server/routes/shopAdmin.js';
import { posRouter } from './server/routes/pos.js';
import { testRouter } from './server/routes/test.js';
import { databasesRouter } from './server/routes/databases.js';
import { tenantsRouter } from './server/routes/tenants.js';
import { healthcareRouter } from './server/routes/healthcare.js';
import { gymRouter } from './server/routes/gym.js';
import { restaurantRouter } from './server/routes/restaurant.js';
import { repairRouter } from './server/routes/repair.js';
import { rentalRouter } from './server/routes/rental.js';
import { servicesRouter } from './server/routes/services.js';
import { appointmentsRouter } from './server/routes/appointments.js';
import { expensesRouter } from './server/routes/expenses.js';
import { initPolyglotDatabases } from './server/databases/manager.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite database and seed defaults
  initDatabase();

  // Initialize 4-Database Polyglot Architecture (Postgres, Mongo, Redis, Cassandra)
  initPolyglotDatabases().catch((err) => {
    console.error('Warning: Polyglot DB initialization error:', err);
  });

  // Basic security and parsing middleware
  app.use(express.json({ limit: '30mb' }));

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Extract auth token and attach req.auth
  app.use(authenticate);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/super-admin', superAdminRouter);
  app.use('/api/shop-admin', shopAdminRouter);
  app.use('/api/pos', posRouter);
  app.use('/api/databases', databasesRouter);
  app.use('/api/tenants', tenantsRouter);
  app.use('/api/healthcare', healthcareRouter);
  app.use('/api/gym', gymRouter);
  app.use('/api/restaurant', restaurantRouter);
  app.use('/api/repair', repairRouter);
  app.use('/api/rental', rentalRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/appointments', appointmentsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/test', testRouter);
  app.use('/api/system-tests', testRouter);

  // 404 handler for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`POS + Shop ERP Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
