import { useMemo, useState } from 'react';
import { formatRupees, groupByCategory } from '../cart.js';

export default function Menu({ menu, cart, onAdd, onRemove }) {
  const [vegOnly, setVegOnly] = useState(false);
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => ['All', ...new Set(menu.map((m) => m.category))], [menu]);
  const visible = menu.filter((m) => (!vegOnly || m.veg) && (category === 'All' || m.category === category));
  const groups = groupByCategory(visible);

  if (menu.length === 0) return <p className="notice">Loading menu…</p>;

  return (
    <div className="menu">
      <div className="filters">
        <div className="chips" role="tablist" aria-label="Categories">
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              className={`chip ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} />
          Veg only
        </label>
      </div>

      {Object.entries(groups).map(([cat, items]) => (
        <section key={cat} className="category">
          <h2>{cat}</h2>
          <ul className="items">
            {items.map((item) => (
              <li key={item.id} className="item">
                <div className="item-info">
                  <span className={`diet ${item.veg ? 'veg' : 'nonveg'}`} title={item.veg ? 'Veg' : 'Non-veg'} />
                  <h3>{item.name}</h3>
                  <p className="desc">{item.description}</p>
                  <p className="price">{formatRupees(item.price)}</p>
                </div>
                {cart[item.id] ? (
                  <div className="stepper" aria-label={`${item.name} quantity`}>
                    <button onClick={() => onRemove(item.id)} aria-label="Remove one">−</button>
                    <span>{cart[item.id]}</span>
                    <button onClick={() => onAdd(item.id)} aria-label="Add one">+</button>
                  </div>
                ) : (
                  <button className="btn add" disabled={!item.available} onClick={() => onAdd(item.id)}>
                    {item.available ? 'Add' : 'Sold out'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {visible.length === 0 && <p className="notice">Nothing matches these filters.</p>}
    </div>
  );
}
