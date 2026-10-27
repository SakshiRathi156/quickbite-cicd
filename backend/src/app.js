const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { quote, COUPONS } = require('./services/pricing');
const { trackOrder } = require('./services/tracking');
const { validateCustomer } = require('./services/validation');

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function newOrderId() {
  return 'QB' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Build the Express app. The store is injected so tests can use the in-memory one.
 */
function createApp({ store, trackingStepSeconds = 30, version = { commit: 'local' }, logger = console, staticDir = null }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '50kb' }));

  const menuMap = async () => new Map((await store.listMenu()).map((m) => [m.id, m]));

  // Health check — used by the load balancer, CodeDeploy ValidateService hook and CloudWatch.
  app.get('/api/health', asyncRoute(async (req, res) => {
    try {
      await store.ping();
      res.json({ status: 'ok', store: store.kind, commit: version.commit, uptime: Math.round(process.uptime()) });
    } catch (err) {
      logger.error('Health check failed:', err.message);
      res.status(503).json({ status: 'unhealthy', error: 'database unreachable' });
    }
  }));

  app.get('/api/version', (req, res) => res.json(version));

  app.get('/api/menu', asyncRoute(async (req, res) => {
    res.json(await store.listMenu());
  }));

  app.get('/api/coupons', (req, res) => {
    res.json(
      Object.entries(COUPONS).map(([code, c]) => ({ code, description: c.description, minSubtotal: c.minSubtotal }))
    );
  });

  // Price a cart without placing an order (used as the user edits the cart / applies a coupon).
  app.post('/api/cart/quote', asyncRoute(async (req, res) => {
    const { items, coupon } = req.body || {};
    res.json(quote(items, await menuMap(), coupon));
  }));

  app.post('/api/orders', asyncRoute(async (req, res) => {
    const { items, coupon, customer } = req.body || {};
    const validCustomer = validateCustomer(customer);
    const priced = quote(items, await menuMap(), coupon);
    const order = {
      id: newOrderId(),
      customer: validCustomer,
      ...priced,
      placedAt: new Date().toISOString(),
    };
    await store.saveOrder(order);
    logger.info(`Order ${order.id} placed: ₹${order.total}`);
    res.status(201).json({ ...order, tracking: trackOrder(order.placedAt, trackingStepSeconds) });
  }));

  // Live order tracking — the frontend polls this every few seconds.
  app.get('/api/orders/:id', asyncRoute(async (req, res) => {
    const order = await store.getOrder(String(req.params.id).toUpperCase());
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ ...order, tracking: trackOrder(order.placedAt, trackingStepSeconds) });
  }));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Single-server hosting (Azure App Service): the React build is copied into
  // backend/public by the pipeline and served from the same origin as the API.
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(
      express.static(staticDir, {
        setHeaders: (res, file) => {
          const hashed = file.includes(`${path.sep}assets${path.sep}`);
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      })
    );
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    logger.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
