const fs = require('fs');
const path = require('path');

// Version info is written by CodeBuild during the Build stage (see buildspec-build.yml).
function readVersion() {
  try {
    const file = path.join(__dirname, '..', 'version.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { commit: 'local', builtAt: null };
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  // Seconds between order status changes in the simulated live tracking.
  trackingStepSeconds: Number(process.env.TRACKING_STEP_SECONDS) || 30,
  db: {
    host: process.env.DB_HOST || '',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'quickbite',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quickbite',
  },
  // React build served by the API when present (Azure single-server hosting).
  staticDir: process.env.STATIC_DIR || path.join(__dirname, '..', 'public'),
  version: readVersion(),
};
