// The API can also serve the React build (used for Azure App Service hosting).
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createApp } = require('../src/app');
const { createMemoryStore } = require('../src/store/memoryStore');

const silent = { info() {}, error() {} };
let dir;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qb-static-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>QuickBite</title>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

const app = () => createApp({ store: createMemoryStore(), logger: silent, staticDir: dir });

test('serves index.html at / without caching', async () => {
  const res = await request(app()).get('/');
  expect(res.status).toBe(200);
  expect(res.text).toContain('QuickBite');
  expect(res.headers['cache-control']).toBe('no-cache');
});

test('serves hashed assets with long caching', async () => {
  const res = await request(app()).get('/assets/app-abc123.js');
  expect(res.status).toBe(200);
  expect(res.headers['cache-control']).toContain('immutable');
});

test('unknown page paths fall back to the app', async () => {
  const res = await request(app()).get('/some/page');
  expect(res.status).toBe(200);
  expect(res.text).toContain('QuickBite');
});

test('API routes still win over the static fallback', async () => {
  expect((await request(app()).get('/api/health')).body.status).toBe('ok');
  expect((await request(app()).get('/api/nope')).status).toBe(404);
});

test('no static serving when the folder has no build', async () => {
  const bare = createApp({ store: createMemoryStore(), logger: silent, staticDir: '/does/not/exist' });
  expect((await request(bare).get('/')).status).toBe(404);
});
