'use strict';

const express = require('express');
const { ITEMS, PACKAGES, priceItems } = require('../lib/catalog');
const { stmts } = require('../db');
const { notifyNewLead } = require('../lib/mailer');
const rateLimit = require('../lib/rateLimit');

const router = express.Router();

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

router.get('/catalog', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ items: ITEMS, packages: PACKAGES });
});

router.post('/quote', rateLimit({ windowMs: 15 * 60 * 1000, max: 8 }), async (req, res) => {
  const b = req.body || {};

  // Honeypot: real people never fill the hidden "company" field.
  if (b.company) return res.json({ ok: true });

  const name = clip(b.name, 100);
  const phone = clip(b.phone, 40);
  const email = clip(b.email, 160);
  const eventDate = clip(b.event_date, 10);

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a valid phone number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'That email doesn’t look right.';
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) errors.event_date = 'Please pick a valid date.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const { lines, total } = priceItems(b.items);
  const guests = Math.max(0, Math.min(2000, parseInt(b.guests, 10) || 0)) || null;
  const pkg = PACKAGES.find((p) => p.id === b.package_id);

  const lead = {
    name,
    phone,
    email: email || null,
    event_date: eventDate || null,
    event_type: clip(b.event_type, 60) || null,
    guests,
    location: clip(b.location, 160) || null,
    package_id: pkg ? pkg.id : null,
    items_json: JSON.stringify(lines),
    estimate: total,
    message: clip(b.message, 2000) || null,
    ip: req.ip
  };

  const info = stmts.insertLead.run(lead);
  lead.id = info.lastInsertRowid;
  notifyNewLead(lead, lines); // fire-and-forget

  res.json({ ok: true, id: lead.id, estimate: total });
});

module.exports = router;
