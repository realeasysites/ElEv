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
    price: 399,
    guests: 48,
    items: { tent20x20: 1, banquet: 6, chair: 48 },
    blurb: 'Grad parties, birthdays, showers & cookouts.'
  },
  {
    id: 'celebration',
    name: 'Big Celebration',
    price: 475,
    guests: 64,
    items: { tent20x30: 1, banquet: 8, chair: 64 },
    blurb: 'Bigger guest lists, rehearsal dinners & family reunions.'
  }
];

const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const isAddon = (id) => byId[id].group === 'games' || id === 'sidewall';

/** Clean an untrusted { id: qty } map. */
function cleanQty(raw) {
  const qty = {};
  if (raw && typeof raw === 'object') {
    for (const [id, q] of Object.entries(raw)) {
      const item = byId[id];
      if (!item) continue;
      const n = Math.max(0, Math.min(item.max, Math.floor(Number(q) || 0)));
      if (n) qty[id] = n;
    }
  }
  return qty;
}

/**
 * Best price for a selection. Customers automatically get package pricing
 * when their tent/table/chair selection includes a package's tent:
 *   package price + à la carte for anything beyond the package + add-ons.
 * Whichever is cheaper (package-based or straight à la carte) wins.
 */
function bestPrice(qty) {
  const alaCarte = Object.entries(qty).reduce((s, [id, n]) => s + n * byId[id].price, 0);
  let best = { total: alaCarte, pkg: null };
  for (const p of PACKAGES) {
    const tentId = Object.keys(p.items).find((k) => byId[k].group === 'tents');
    if (!qty[tentId]) continue;
    let total = p.price;
    for (const [id, n] of Object.entries(qty)) {
      const extra = isAddon(id) ? n : Math.max(0, n - (p.items[id] || 0));
      total += extra * byId[id].price;
    }
    if (total < best.total) best = { total, pkg: p };
  }
  return { alaCarte, total: best.total, pkg: best.pkg, savings: alaCarte - best.total };
}

/** Price an untrusted selection into invoice lines. */
function priceItems(raw) {
  const qty = cleanQty(raw);
  const lines = Object.entries(qty).map(([id, n]) => {
    const item = byId[id];
    return { id, name: item.name, qty: n, price: item.price, subtotal: n * item.price };
  });
  const best = bestPrice(qty);
  if (best.pkg && best.savings > 0) {
    lines.push({ id: 'package', name: `${best.pkg.name} package pricing`, qty: 1, price: -best.savings, subtotal: -best.savings });
  }
  return { lines, total: best.total, packageId: best.pkg ? best.pkg.id : null };
}

module.exports = { ITEMS, PACKAGES, priceItems };
