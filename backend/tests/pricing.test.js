const { quote, applyCoupon, PricingError, DELIVERY_FEE } = require('../src/services/pricing');
const seed = require('../src/store/seed');

const menu = new Map(seed.map((m) => [m.id, m]));
// id 1 = Biryani ₹289, id 3 = Masala Dosa ₹119, id 12 = Irani Chai ₹39

describe('quote()', () => {
  test('adds up line totals, GST and delivery fee', () => {
    const q = quote([{ id: 3, quantity: 2 }], menu, null); // 238
    expect(q.subtotal).toBe(238);
    expect(q.gst).toBe(12); // 5% of 238 = 11.9 -> 12
    expect(q.deliveryFee).toBe(DELIVERY_FEE);
    expect(q.total).toBe(238 + 12 + 40);
  });

  test('delivery is free for subtotals of ₹499 or more', () => {
    const q = quote([{ id: 1, quantity: 2 }], menu, null); // 578
    expect(q.deliveryFee).toBe(0);
  });

  test('rejects an empty cart', () => {
    expect(() => quote([], menu, null)).toThrow('Cart is empty');
  });

  test('rejects unknown menu items', () => {
    expect(() => quote([{ id: 999, quantity: 1 }], menu, null)).toThrow(PricingError);
  });

  test('rejects invalid quantities', () => {
    expect(() => quote([{ id: 3, quantity: 0 }], menu, null)).toThrow(/between 1 and 20/);
    expect(() => quote([{ id: 3, quantity: 21 }], menu, null)).toThrow(/between 1 and 20/);
    expect(() => quote([{ id: 3, quantity: 1.5 }], menu, null)).toThrow(/between 1 and 20/);
  });

  test('rejects unavailable items', () => {
    const m = new Map(menu);
    m.set(3, { ...m.get(3), available: false });
    expect(() => quote([{ id: 3, quantity: 1 }], m, null)).toThrow(/unavailable/);
  });
});

// The "apply coupon" test from the failure-handling slide: if a change breaks
// coupon maths, these fail, CodeBuild fails and nothing is deployed.
describe('apply coupon', () => {
  test('WELCOME50 gives 50% off', () => {
    expect(applyCoupon('WELCOME50', 200).discount).toBe(100);
    expect(applyCoupon('WELCOME50', 199).discount).toBe(100); // 99.5 rounds to 100
  });

  test('WELCOME50 is capped at ₹100', () => {
    expect(applyCoupon('WELCOME50', 1000).discount).toBe(100);
  });

  test('coupon codes are case-insensitive and trimmed', () => {
    expect(applyCoupon('  flat75 ', 300).code).toBe('FLAT75');
  });

  test('minimum order value is enforced', () => {
    expect(() => applyCoupon('FLAT75', 298)).toThrow(/minimum order of ₹299/);
  });

  test('unknown coupons are rejected', () => {
    expect(() => applyCoupon('FREEFOOD', 500)).toThrow(/not valid/);
  });

  test('FREEDEL removes the delivery fee', () => {
    const q = quote([{ id: 12, quantity: 1 }], menu, 'FREEDEL');
    expect(q.deliveryFee).toBe(0);
    expect(q.total).toBe(39 + 2); // 39 + 5% GST (1.95 -> 2)
  });

  test('GST is charged on the discounted amount', () => {
    const q = quote([{ id: 5, quantity: 1 }], menu, 'FLAT75'); // 319 - 75 = 244
    expect(q.coupon.discount).toBe(75);
    expect(q.gst).toBe(12); // 5% of 244 = 12.2 -> 12
    expect(q.total).toBe(244 + 12 + 40);
  });

  test('no coupon means no discount', () => {
    expect(applyCoupon(null, 500)).toEqual({ code: null, discount: 0, freeDelivery: false, description: null });
  });
});
