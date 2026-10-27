import { useState } from 'react';

export default function Header({ onTrack }) {
  const [orderId, setOrderId] = useState('');

  return (
    <header className="header">
      <a href="#/" className="brand" aria-label="QuickBite home">
        <span className="logo" aria-hidden="true">Q</span>
        QuickBite
      </a>
      <form
        className="track-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (orderId.trim()) onTrack(orderId);
        }}
      >
        <input
          aria-label="Order ID"
          placeholder="Track order, e.g. QB1A2B3C4D"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <button type="submit" className="btn ghost">Track</button>
      </form>
    </header>
  );
}
