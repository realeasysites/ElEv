'use strict';

/**
 * Single source of truth for rental pricing.
 * All prices include delivery, setup, and next-day pickup.
 * The front end fetches this via GET /api/catalog; the server
 * re-computes every estimate from it so totals can't be tampered with.
 */
const ITEMS = [
  { id: 'tent20x20', group: 'tents', name: '20′ × 20′ Pole Tent', price: 250, unit: 'each', seats: 48, note: 'Seats up to 48 guests', max: 4 },
  { id: 'tent20x30', group: 'tents', name: '20′ × 30′ Pole Tent', price: 275, unit: 'each', seats: 64, note: 'Seats up to 64 guests', max: 4 },
  { id: 'sidewall', group: 'tents', name: 'Sidewall (20′ section)', price: 15, unit: 'per section', note: 'Wind, rain & chill protection', max: 20 },
  { id: 'banquet', group: 'seating', name: '8′ Banquet Table', price: 10, unit: 'each', note: 'Seats 8', max: 60 },
  { id: 'round', group: 'seating', name: '60″ Round Table', price: 10, unit: 'each', note: 'Seats 8', max: 60 },
  { id: 'chair', group: 'seating', name: 'Folding Chair', price: 2, unit: 'each', note: 'White folding chair', max: 400 },
  { id: 'connect4', group: 'games', name: 'Giant Connect 4', price: 25, unit: 'each', note: 'Yard-size four-in-a-row', max: 1 },
  { id: 'jenga', group: 'games', name: 'Giant Jenga', price: 25, unit: 'each', note: 'Giant stacking-block game', max: 1 },
  { id: 'buckets', group: 'games', name: 'Battle Buckets', price: 25, unit: 'each', note: 'Giant bucket-pong basketball', max: 1 }
];

const PACKAGES = [
  {
    id: 'backyard',
    name: 'Backyard Party',
    guests: 48,
    items: { tent20x20: 1, banquet: 6, chair: 48 },
    blurb: 'Grad parties, birthdays, showers & cookouts.'
  },
  {
    id: 'celebration',
    name: 'Big Celebration',
    guests: 64,
    items: { tent20x30: 1, banquet: 8, chair: 64 },
    blurb: 'Bigger guest lists, rehearsal dinners & family reunions.'
  }
];

const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Clean an untrusted { id: qty } map and price it. */
function priceItems(raw) {
  const lines = [];
  let total = 0;
  if (raw && typeof raw === 'object') {
    for (const [id, q] of Object.entries(raw)) {
      const item = byId[id];
      if (!item) continue;
      const qty = Math.max(0, Math.min(item.max, Math.floor(Number(q) || 0)));
      if (!qty) continue;
      const subtotal = qty * item.price;
      total += subtotal;
      lines.push({ id, name: item.name, qty, price: item.price, subtotal });
    }
  }
  return { lines, total };
}

function packageTotal(pkg) {
  return priceItems(pkg.items).total;
}

module.exports = {
  ITEMS,
  PACKAGES: PACKAGES.map((p) => ({ ...p, total: packageTotal(p) })),
  priceItems
};
