const config = require('./config');
const { createStore } = require('./store');
const { createApp } = require('./app');

async function main() {
  const store = createStore(config.db);
  await store.init();

  const app = createApp({
    store,
    trackingStepSeconds: config.trackingStepSeconds,
    version: config.version,
    staticDir: config.staticDir,
  });

  const server = app.listen(config.port, () => {
    console.log(
      `QuickBite API listening on :${config.port} (store=${store.kind}, commit=${config.version.commit})`
    );
  });

  // Graceful shutdown so CodeDeploy's ApplicationStop hook doesn't cut off requests.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await store.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Failed to start QuickBite API:', err);
  process.exit(1);
});
