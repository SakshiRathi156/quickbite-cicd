// Pure pricing logic: subtotal, coupon discount, delivery fee and GST.
// Kept free of I/O so it can be unit-tested directly (bottom of the testing pyramid).

const DELIVERY_FEE = 40;
const FREE_DELIVERY_ABOVE = 499;
const GST_RATE = 0.05;

const COUPONS = {
  WELCOME50: {
    description: '50% off, up to ₹100, on orders of ₹199 or more',
    minSubtotal: 199,
    apply: (subtotal) => Math.min(Math.round(subtotal * 0.5), 100),
  },
  FLAT75: {
    description: '₹75 off on orders of ₹299 or more',
    minSubtotal: 299,
    apply: () => 75,
  },
  FREEDEL: {
    description: 'Free delivery on any order',
    minSubtotal: 0,
    apply: () => 0,
    freeDelivery: true,
  },
};

class PricingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PricingError';
    this.status = 400;
  }
}

/**
 * Validate a coupon against a subtotal.
 * Returns { code, discount, freeDelivery, description } or throws PricingError.
 */
function applyCoupon(code, subtotal) {
  if (!code) return { code: null, discount: 0, freeDelivery: false, description: null };
  const normalised = String(code).trim().toUpperCase();
  const coupon = COUPONS[normalised];
  if (!coupon) throw new PricingError(`Coupon "${normalised}" is not valid`);
  if (subtotal < coupon.minSubtotal) {
    throw new PricingError(
      `Coupon ${normalised} needs a minimum order of ₹${coupon.minSubtotal}`
    );
  }
  const discount = Math.min(coupon.apply(subtotal), subtotal);
  return {
    code: normalised,
    discount,
    freeDelivery: Boolean(coupon.freeDelivery),
    description: coupon.description,
  };
}

/**
 * Build a full price quote.
 * @param {Array<{id:number, quantity:number}>} cartItems
 * @param {Map<number, {id:number, name:string, price:number, available:boolean}>} menuById
 * @param {string|null} couponCode
 */
function quote(cartItems, menuById, couponCode) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new PricingError('Cart is empty');
  }

  const lines = cartItems.map(({ id, quantity }) => {
    const item = menuById.get(Number(id));
    if (!item) throw new PricingError(`Menu item ${id} does not exist`);
    if (!item.available) throw new PricingError(`${item.name} is currently unavailable`);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new PricingError(`Quantity for ${item.name} must be between 1 and 20`);
    }
    return { id: item.id, name: item.name, price: item.price, quantity: qty, lineTotal: item.price * qty };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const coupon = applyCoupon(couponCode, subtotal);
  const afterDiscount = subtotal - coupon.discount;
  const deliveryFee = coupon.freeDelivery || subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const gst = Math.round(afterDiscount * GST_RATE);
  const total = afterDiscount + gst + deliveryFee;

  return { lines, subtotal, coupon, deliveryFee, gst, total };
}

module.exports = {
  quote,
  applyCoupon,
  PricingError,
  COUPONS,
  DELIVERY_FEE,
  FREE_DELIVERY_ABOVE,
  GST_RATE,
};
