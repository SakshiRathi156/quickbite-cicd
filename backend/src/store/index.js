const { createMemoryStore } = require('./memoryStore');

// Uses MySQL when DB_HOST is set, otherwise an in-memory store.
function createStore(dbConfig) {
  if (dbConfig && dbConfig.host) {
    // Required lazily so tests never load the MySQL driver.
    const { createMysqlStore } = require('./mysqlStore');
    return createMysqlStore(dbConfig);
  }
  return createMemoryStore();
}

module.exports = { createStore };
