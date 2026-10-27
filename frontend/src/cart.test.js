import { describe, expect, test } from 'vitest';
import { addItem, removeItem, itemCount, toApiItems, formatRupees, groupByCategory, MAX_QTY } from './cart.js';

describe('cart helpers', () => {
  test('addItem increments quantity', () => {
    expect(addItem(addItem({}, 3), 3)).toEqual({ 3: 2 });
  });

  test('addItem stops at the maximum quantity', () => {
    expect(addItem({ 3: MAX_QTY }, 3)).toEqual({ 3: MAX_QTY });
  });

  test('removeItem decrements and removes at zero', () => {
    expect(removeItem({ 3: 2 }, 3)).toEqual({ 3: 1 });
    expect(removeItem({ 3: 1 }, 3)).toEqual({});
    expect(removeItem({}, 3)).toEqual({});
  });

  test('itemCount sums quantities', () => {
    expect(itemCount({ 1: 2, 5: 3 })).toBe(5);
  });

  test('toApiItems converts to the API shape', () => {
    expect(toApiItems({ 1: 2 })).toEqual([{ id: 1, quantity: 2 }]);
  });

  test('formatRupees uses Indian grouping', () => {
    expect(formatRupees(125000)).toBe('₹1,25,000');
  });

  test('groupByCategory groups menu items', () => {
    const g = groupByCategory([
      { id: 1, category: 'A' },
      { id: 2, category: 'B' },
      { id: 3, category: 'A' },
    ]);
    expect(Object.keys(g)).toEqual(['A', 'B']);
    expect(g.A).toHaveLength(2);
  });
});
