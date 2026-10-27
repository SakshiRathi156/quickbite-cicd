const BASE = import.meta.env.VITE_API_BASE || '';

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  menu: () => call('/api/menu'),
  coupons: () => call('/api/coupons'),
  version: () => call('/api/version'),
  quote: (items, coupon) => call('/api/cart/quote', { method: 'POST', body: JSON.stringify({ items, coupon }) }),
  placeOrder: (payload) => call('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
  order: (id) => call(`/api/orders/${encodeURIComponent(id)}`),
};
