// MySQL store (Amazon RDS in production, docker-compose MySQL locally).
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const seed = require('./seed');

function createMysqlStore(dbConfig) {
  const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  });

  const toMenuItem = (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    veg: Boolean(row.veg),
    available: Boolean(row.available),
    description: row.description,
  });

  return {
    kind: 'mysql',

    async init() {
      const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'schema.sql'), 'utf8');
      const statements = sql
        .split(';')
        .map((s) => s.replace(/--.*$/gm, '').trim())
        .filter(Boolean);
      for (const statement of statements) await pool.query(statement);

      const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM menu_items');
      if (count === 0) {
        const rows = seed.map((m) => [m.id, m.name, m.category, m.price, m.veg, m.available, m.description]);
        await pool.query(
          'INSERT INTO menu_items (id, name, category, price, veg, available, description) VALUES ?',
          [rows]
        );
      }
    },

    async ping() {
      await pool.query('SELECT 1');
      return true;
    },

    async listMenu() {
      const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY id');
      return rows.map(toMenuItem);
    },

    async saveOrder(order) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await conn.query(
          `INSERT INTO orders (id, customer_name, customer_phone, customer_address, coupon_code,
             subtotal, discount, delivery_fee, gst, total, placed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.id,
            order.customer.name,
            order.customer.phone,
            order.customer.address,
            order.coupon.code,
            order.subtotal,
            order.coupon.discount,
            order.deliveryFee,
            order.gst,
            order.total,
            new Date(order.placedAt),
          ]
        );
        const rows = order.lines.map((l) => [order.id, l.id, l.name, l.price, l.quantity]);
        await conn.query(
          'INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES ?',
          [rows]
        );
        await conn.commit();
        return order;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async getOrder(id) {
      const [[row]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (!row) return null;
      const [items] = await pool.query(
        'SELECT menu_item_id AS id, name, price, quantity FROM order_items WHERE order_id = ?',
        [id]
      );
      return {
        id: row.id,
        customer: { name: row.customer_name, phone: row.customer_phone, address: row.customer_address },
        lines: items.map((i) => ({ ...i, lineTotal: i.price * i.quantity })),
        subtotal: row.subtotal,
        coupon: { code: row.coupon_code, discount: row.discount },
        deliveryFee: row.delivery_fee,
        gst: row.gst,
        total: row.total,
        placedAt: new Date(row.placed_at).toISOString(),
      };
    },

    async close() {
      await pool.end();
    },
  };
}

module.exports = { createMysqlStore };
