// Integration tests: real HTTP requests through Express against the in-memory store.
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memoryStore');

const silent = { info() {}, error() {} };
const customer = { name: 'Ravi Kumar', phone: '9876543210', address: 'Flat 302, Bachupally, Hyderabad 500090' };

let app;
beforeEach(() => {
  app = createApp({ store: createMemoryStore(), trackingStepSeconds: 30, version: { commit: 'test' }, logger: silent });
});

describe('GET /api/health', () => {
  test('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', store: 'memory', commit: 'test' });
  });

  test('returns 503 when the database is down', async () => {
    const store = createMemoryStore();
    store.ping = async () => { throw new Error('ECONNREFUSED'); };
    const broken = createApp({ store, logger: silent });
    const res = await request(broken).get('/api/health');
    expect(res.status).toBe(503);
  });
});

describe('menu and coupons', () => {
  test('GET /api/menu returns the menu', async () => {
    const res = await request(app).get('/api/menu');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(5);
    expect(res.body[0]).toHaveProperty('price');
  });

  test('GET /api/coupons lists coupons', async () => {
    const res = await request(app).get('/api/coupons');
    expect(res.body.map((c) => c.code)).toContain('WELCOME50');
  });
});

describe('POST /api/cart/quote', () => {
  test('prices a cart with a coupon', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ id: 5, quantity: 1 }], coupon: 'FLAT75' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(296); // 319 - 75 + 12 GST + 40 delivery
  });

  test('returns 400 for a bad coupon', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .send({ items: [{ id: 1, quantity: 1 }], coupon: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not valid/);
  });

  test('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/cart/quote')
      .set('Content-Type', 'application/json')
      .send('{"items":');
    expect(res.status).toBe(400);
  });
});

describe('orders and live tracking', () => {
  test('places an order and tracks it', async () => {
    const placed = await request(app)
      .post('/api/orders')
      .send({ items: [{ id: 3, quantity: 2 }, { id: 12, quantity: 2 }], coupon: 'WELCOME50', customer });
    expect(placed.status).toBe(201);
    expect(placed.body.id).toMatch(/^QB[0-9A-F]{8}$/);
    expect(placed.body.coupon.discount).toBe(100);
    expect(placed.body.tracking.status).toBe('PLACED');

    const tracked = await request(app).get(`/api/orders/${placed.body.id}`);
    expect(tracked.status).toBe(200);
    expect(tracked.body.total).toBe(placed.body.total);
    expect(tracked.body.tracking.timeline).toHaveLength(5);
  });

  test('order ids are looked up case-insensitively', async () => {
    const placed = await request(app).post('/api/orders').send({ items: [{ id: 3, quantity: 1 }], customer });
    const res = await request(app).get(`/api/orders/${placed.body.id.toLowerCase()}`);
    expect(res.status).toBe(200);
  });

  test('unknown order returns 404', async () => {
    const res = await request(app).get('/api/orders/QB00000000');
    expect(res.status).toBe(404);
  });

  test.each([
    [{ ...customer, phone: '12345' }, /mobile number/],
    [{ ...customer, name: '' }, /name/],
    [{ ...customer, address: 'Hyd' }, /address/],
    [undefined, /Customer details/],
  ])('rejects invalid customer details', async (badCustomer, message) => {
    const res = await request(app).post('/api/orders').send({ items: [{ id: 3, quantity: 1 }], customer: badCustomer });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(message);
  });
});

test('unknown API routes return JSON 404', async () => {
  const res = await request(app).get('/api/nothing-here');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'Not found' });
});
