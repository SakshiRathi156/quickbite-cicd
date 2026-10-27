const { trackOrder, STAGES } = require('../src/services/tracking');

const placedAt = new Date('2026-10-20T10:00:00Z');
const at = (seconds) => new Date(placedAt.getTime() + seconds * 1000);

describe('live order tracking', () => {
  test('a new order is PLACED', () => {
    const t = trackOrder(placedAt, 30, at(0));
    expect(t.status).toBe('PLACED');
    expect(t.progress).toBe(0);
    expect(t.etaSeconds).toBe(120);
  });

  test('moves one stage forward per step', () => {
    expect(trackOrder(placedAt, 30, at(31)).status).toBe('CONFIRMED');
    expect(trackOrder(placedAt, 30, at(65)).status).toBe('PREPARING');
    expect(trackOrder(placedAt, 30, at(95)).status).toBe('OUT_FOR_DELIVERY');
  });

  test('stops at DELIVERED', () => {
    const t = trackOrder(placedAt, 30, at(10_000));
    expect(t.status).toBe('DELIVERED');
    expect(t.progress).toBe(100);
    expect(t.etaSeconds).toBe(0);
  });

  test('timeline marks completed stages with timestamps', () => {
    const t = trackOrder(placedAt, 30, at(65));
    expect(t.timeline).toHaveLength(STAGES.length);
    expect(t.timeline.filter((s) => s.done)).toHaveLength(3);
    expect(t.timeline[1].at).toBe('2026-10-20T10:00:30.000Z');
    expect(t.timeline[4].at).toBeNull();
  });

  test('clock skew (placed in the future) is treated as just placed', () => {
    expect(trackOrder(at(60), 30, placedAt).status).toBe('PLACED');
  });
});
