// In-memory store: used by the automated tests and for local runs without MySQL.
const seed = require('./seed');

function createMemoryStore() {
  const menu = seed.map((item) => ({ ...item }));
  const orders = new Map();

  return {
    kind: 'memory',
    async init() {},
    async ping() {
      return true;
    },
    async listMenu() {
      return menu.map((item) => ({ ...item }));
    },
    async saveOrder(order) {
      orders.set(order.id, JSON.parse(JSON.stringify(order)));
      return order;
    },
    async getOrder(id) {
      const order = orders.get(id);
      return order ? JSON.parse(JSON.stringify(order)) : null;
    },
    async close() {},
  };
}

module.exports = { createMemoryStore };
