// "Live Order Tracking" — the feature from the Review 1 walkthrough (slide 13).
// The kitchen and rider are simulated: an order moves one stage forward every
// `stepSeconds` after it is placed. A real system would get these updates from
// the restaurant and delivery apps instead.

const STAGES = [
  { status: 'PLACED', label: 'Order placed' },
  { status: 'CONFIRMED', label: 'Restaurant confirmed' },
  { status: 'PREPARING', label: 'Food is being prepared' },
  { status: 'OUT_FOR_DELIVERY', label: 'Rider is on the way' },
  { status: 'DELIVERED', label: 'Delivered — enjoy your meal!' },
];

/**
 * Work out where an order is right now.
 * @param {Date|string|number} placedAt
 * @param {number} stepSeconds
 * @param {Date} now
 */
function trackOrder(placedAt, stepSeconds, now = new Date()) {
  const placed = new Date(placedAt).getTime();
  const elapsedSeconds = Math.max(0, (now.getTime() - placed) / 1000);
  const index = Math.min(Math.floor(elapsedSeconds / stepSeconds), STAGES.length - 1);
  const isDelivered = index === STAGES.length - 1;

  const timeline = STAGES.map((stage, i) => ({
    ...stage,
    done: i <= index,
    at: i <= index ? new Date(placed + i * stepSeconds * 1000).toISOString() : null,
  }));

  return {
    status: STAGES[index].status,
    label: STAGES[index].label,
    progress: Math.round((index / (STAGES.length - 1)) * 100),
    etaSeconds: isDelivered
      ? 0
      : Math.max(0, Math.ceil((STAGES.length - 1) * stepSeconds - elapsedSeconds)),
    timeline,
  };
}

module.exports = { trackOrder, STAGES };
