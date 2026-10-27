import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatRupees } from '../cart.js';

const POLL_MS = 5000;

function formatEta(seconds) {
  if (seconds <= 0) return 'Delivered';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

const time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// Live Order Tracking: polls the API until the order is delivered.
export default function OrderTracking({ orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer;
    let stopped = false;
    const load = async () => {
      try {
        const o = await api.order(orderId);
        if (stopped) return;
        setOrder(o);
        setError('');
        if (o.tracking.status !== 'DELIVERED') timer = setTimeout(load, POLL_MS);
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    };
    setOrder(null);
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [orderId]);

  if (error) {
    return (
      <div className="tracking card">
        <p className="notice error">{error === 'Order not found' ? `We couldn't find order ${orderId}.` : error}</p>
        <a href="#/" className="btn ghost">Back to menu</a>
      </div>
    );
  }
  if (!order) return <p className="notice">Loading order {orderId}…</p>;

  const { tracking } = order;

  return (
    <div className="tracking">
      <div className="card">
        <p className="eyebrow">Order {order.id}</p>
        <h1>{tracking.label}</h1>
        <p className="muted">
          {tracking.status === 'DELIVERED' ? 'Thanks for ordering with QuickBite.' : `Arriving in about ${formatEta(tracking.etaSeconds)}`}
          {tracking.status !== 'DELIVERED' && <> · <span className="live">live</span></>}
        </p>

        <div className="progress" role="progressbar" aria-valuenow={tracking.progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${tracking.progress}%` }} />
        </div>

        <ol className="timeline">
          {tracking.timeline.map((stage) => (
            <li key={stage.status} className={stage.done ? 'done' : ''}>
              <span className="dot" aria-hidden="true" />
              <span className="stage">{stage.label}</span>
              <span className="when">{stage.at ? time(stage.at) : ''}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <h2>Bill</h2>
        <ul className="cart-lines static">
          {order.lines.map((l) => (
            <li key={l.id}>
              <span className="line-name">{l.quantity} × {l.name}</span>
              <span className="line-total">{formatRupees(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="bill">
          <div><dt>Item total</dt><dd>{formatRupees(order.subtotal)}</dd></div>
          {order.coupon.code && (
            <div className="discount"><dt>{order.coupon.code}</dt><dd>−{formatRupees(order.coupon.discount)}</dd></div>
          )}
          <div><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? 'Free' : formatRupees(order.deliveryFee)}</dd></div>
          <div><dt>GST</dt><dd>{formatRupees(order.gst)}</dd></div>
          <div className="grand"><dt>Paid on delivery</dt><dd>{formatRupees(order.total)}</dd></div>
        </dl>
        <p className="muted small">Delivering to {order.customer.name}, {order.customer.address}</p>
        <a href="#/" className="btn ghost">Order something else</a>
      </div>
    </div>
  );
}
