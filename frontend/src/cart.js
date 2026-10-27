// Pure cart helpers (unit-tested with Vitest in the pipeline's Test stage).
// A cart is a plain object: { [menuItemId]: quantity }.

export const MAX_QTY = 20;

export function addItem(cart, id) {
  const qty = Math.min((cart[id] || 0) + 1, MAX_QTY);
  return { ...cart, [id]: qty };
}

export function removeItem(cart, id) {
  const next = { ...cart };
  if ((next[id] || 0) <= 1) delete next[id];
  else next[id] -= 1;
  return next;
}

export function itemCount(cart) {
  return Object.values(cart).reduce((sum, q) => sum + q, 0);
}

export function toApiItems(cart) {
  return Object.entries(cart).map(([id, quantity]) => ({ id: Number(id), quantity }));
}

export function formatRupees(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

export function groupByCategory(menu) {
  return menu.reduce((groups, item) => {
    (groups[item.category] ||= []).push(item);
    return groups;
  }, {});
}
