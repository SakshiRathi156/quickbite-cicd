import { useEffect, useState } from 'react';
import { api } from './api.js';
import { addItem, removeItem, itemCount } from './cart.js';
import Header from './components/Header.jsx';
import Menu from './components/Menu.jsx';
import CartPanel from './components/CartPanel.jsx';
import OrderTracking from './components/OrderTracking.jsx';

// Tiny hash router: #/ shows the menu, #/order/QB1234ABCD shows live tracking.
function useHashRoute() {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const [menu, setMenu] = useState([]);
  const [menuError, setMenuError] = useState('');
  const [cart, setCart] = useState({});
  const [version, setVersion] = useState(null);

  useEffect(() => {
    api.menu().then(setMenu).catch((e) => setMenuError(e.message));
    api.version().then(setVersion).catch(() => {});
  }, []);

  const orderMatch = route.match(/^\/order\/([A-Za-z0-9]+)$/);

  return (
    <div className="app">
      <Header onTrack={(id) => (window.location.hash = `/order/${id.trim().toUpperCase()}`)} />

      {orderMatch ? (
        <main className="page">
          <OrderTracking orderId={orderMatch[1].toUpperCase()} />
        </main>
      ) : (
        <main className="page layout">
          <section>
            <div className="hero">
              <h1>Hot food from Hyderabad's favourite kitchens.</h1>
              <p>Pick your dishes, apply a coupon, and watch your order travel to your door.</p>
            </div>
            {menuError ? (
              <p className="notice error">Couldn't load the menu: {menuError}. Is the API running?</p>
            ) : (
              <Menu
                menu={menu}
                cart={cart}
                onAdd={(id) => setCart((c) => addItem(c, id))}
                onRemove={(id) => setCart((c) => removeItem(c, id))}
              />
            )}
          </section>
          <CartPanel
            menu={menu}
            cart={cart}
            onAdd={(id) => setCart((c) => addItem(c, id))}
            onRemove={(id) => setCart((c) => removeItem(c, id))}
            onOrderPlaced={(order) => {
              setCart({});
              window.location.hash = `/order/${order.id}`;
            }}
          />
          {itemCount(cart) > 0 && (
            <button
              className="cart-bar"
              onClick={() => document.querySelector('.cart')?.scrollIntoView({ behavior: 'smooth' })}
            >
              {itemCount(cart)} item{itemCount(cart) > 1 ? 's' : ''} in cart · View cart ↓
            </button>
          )}
        </main>
      )}

      <footer className="footer">
        QuickBite · deployed by AWS CodePipeline
        {version && <span className="build"> · build {String(version.commit).slice(0, 7)}</span>}
      </footer>
    </div>
  );
}
