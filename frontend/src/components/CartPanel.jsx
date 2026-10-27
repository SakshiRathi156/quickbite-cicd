import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatRupees, itemCount, toApiItems } from '../cart.js';

export default function CartPanel({ menu, cart, onAdd, onRemove, onOrderPlaced }) {
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [couponError, setCouponError] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');

  const count = itemCount(cart);
  const byId = new Map(menu.map((m) => [m.id, m]));

  // Re-price whenever the cart or coupon changes; the server is the source of truth for totals.
  useEffect(() => {
    if (count === 0) {
      setQuote(null);
      setQuoteError('');
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .quote(toApiItems(cart), coupon)
        .then((q) => !cancelled && (setQuote(q), setQuoteError('')))
        .catch((e) => {
          if (cancelled) return;
          // A coupon that is invalid or stops qualifying (cart got smaller) is dropped, and the
          // cart is re-priced without it, rather than leaving the bill half-applied.
          if (coupon) {
            setCouponError(e.message);
            setCoupon(null);
          } else {
            setQuoteError(e.message);
          }
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cart, coupon, count]);

  const applyCoupon = (e) => {
    e.preventDefault();
    setCouponError('');
    if (couponInput.trim()) setCoupon(couponInput.trim().toUpperCase());
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setPlacing(true);
    setOrderError('');
    try {
      const order = await api.placeOrder({ items: toApiItems(cart), coupon, customer });
      setCheckingOut(false);
      setCoupon(null);
      setCouponInput('');
      onOrderPlaced(order);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <aside className="cart" aria-label="Your cart">
      <h2>Your order {count > 0 && <span className="count">{count}</span>}</h2>

      {count === 0 ? (
        <p className="muted">Your cart is empty. Add something tasty from the menu.</p>
      ) : (
        <>
          <ul className="cart-lines">
            {Object.entries(cart).map(([id, qty]) => {
              const item = byId.get(Number(id));
              if (!item) return null;
              return (
                <li key={id}>
                  <span className="line-name">{item.name}</span>
                  <div className="stepper small">
                    <button onClick={() => onRemove(item.id)} aria-label={`Remove one ${item.name}`}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => onAdd(item.id)} aria-label={`Add one ${item.name}`}>+</button>
                  </div>
                  <span className="line-total">{formatRupees(item.price * qty)}</span>
                </li>
              );
            })}
          </ul>

          <form className="coupon" onSubmit={applyCoupon}>
            <input
              aria-label="Coupon code"
              placeholder="Coupon (try WELCOME50)"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
            />
            <button className="btn ghost" type="submit">Apply</button>
          </form>
          {couponError && <p className="notice error small">{couponError}</p>}
          {quoteError && <p className="notice error small">{quoteError}</p>}

          {quote && (
            <dl className="bill">
              <div><dt>Item total</dt><dd>{formatRupees(quote.subtotal)}</dd></div>
              {quote.coupon.code && (
                <div className="discount">
                  <dt>
                    {quote.coupon.code}{' '}
                    <button className="link" onClick={() => { setCoupon(null); setCouponInput(''); }}>remove</button>
                  </dt>
                  <dd>−{formatRupees(quote.coupon.discount)}</dd>
                </div>
              )}
              <div><dt>Delivery</dt><dd>{quote.deliveryFee === 0 ? 'Free' : formatRupees(quote.deliveryFee)}</dd></div>
              <div><dt>GST (5%)</dt><dd>{formatRupees(quote.gst)}</dd></div>
              <div className="grand"><dt>To pay</dt><dd>{formatRupees(quote.total)}</dd></div>
            </dl>
          )}

          {!checkingOut ? (
            <button className="btn primary block" disabled={!quote} onClick={() => setCheckingOut(true)}>
              Checkout
            </button>
          ) : (
            <form className="checkout" onSubmit={placeOrder}>
              <label>
                Name
                <input required value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
              </label>
              <label>
                Mobile number
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value.replace(/\D/g, '') })}
                />
              </label>
              <label>
                Delivery address
                <textarea required rows={3} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
              </label>
              {orderError && <p className="notice error small">{orderError}</p>}
              <button className="btn primary block" disabled={placing || !quote} type="submit">
                {placing ? 'Placing order…' : `Place order · ${quote ? formatRupees(quote.total) : ''}`}
              </button>
              <p className="muted small">Cash on delivery.</p>
            </form>
          )}
        </>
      )}
    </aside>
  );
}
