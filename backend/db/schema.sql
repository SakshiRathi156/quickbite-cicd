-- QuickBite MySQL schema. Applied automatically when the API starts
-- (CREATE TABLE IF NOT EXISTS), so a fresh RDS database needs no manual setup.

CREATE TABLE IF NOT EXISTS menu_items (
  id INT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(60) NOT NULL,
  price INT NOT NULL,
  veg BOOLEAN NOT NULL DEFAULT TRUE,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(16) PRIMARY KEY,
  customer_name VARCHAR(80) NOT NULL,
  customer_phone VARCHAR(10) NOT NULL,
  customer_address VARCHAR(300) NOT NULL,
  coupon_code VARCHAR(20) NULL,
  subtotal INT NOT NULL,
  discount INT NOT NULL,
  delivery_fee INT NOT NULL,
  gst INT NOT NULL,
  total INT NOT NULL,
  placed_at DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id VARCHAR(16) NOT NULL,
  menu_item_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  price INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (order_id, menu_item_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
