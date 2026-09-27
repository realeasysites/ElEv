'use strict';

const path = require('path');
const express = require('express');
const { stmts, STATUSES } = require('../db');
const { checkPassword, createSession, destroySession, isAuthed, requireAdmin } = require('../lib/auth');
const rateLimit = require('../lib/rateLimit');

const ADMIN_DIR = path.join(__dirname, '..', 'admin');

/* ---------- Pages (/admin) ---------- */
const pages = express.Router();

pages.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(ADMIN_DIR, isAuthed(req) ? 'dashboard.html' : 'login.html'));
});
pages.use('/assets', express.static(path.join(ADMIN_DIR, 'assets')));

/* ---------- API (/api/admin) ---------- */
const api = express.Router();

api.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many attempts. Try again in 15 minutes.' }), (req, res) => {
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set on the server.' });
  if (!checkPassword(req.body && req.body.password)) return res.status(401).json({ error: 'Incorrect password.' });
  createSession(res);
  res.json({ ok: true });
});

api.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

api.use(requireAdmin);

function shape(row) {
  let items = [];
  try { items = JSON.parse(row.items_json || '[]'); } catch { /* ignore */ }
  const conflict = row.event_date ? stmts.bookedOnDate.get(row.event_date, row.id).n : 0;
  const { items_json, ip, ...rest } = row;
  return { ...rest, items, bookedSameDay: conflict };
}

api.get('/leads', (req, res) => {
  const leads = stmts.listLeads.all().map(shape);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of stmts.statusCounts.all()) counts[r.status] = r.n;
  res.json({ leads, counts, statuses: STATUSES });
});

api.patch('/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!stmts.getLead.get(id)) return res.status(404).json({ error: 'Lead not found' });
  const { status, notes } = req.body || {};
  if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  stmts.updateLead.run({
    id,
    status: status ?? null,
    notes: typeof notes === 'string' ? notes.slice(0, 4000) : null
  });
  res.json({ ok: true, lead: shape(stmts.getLead.get(id)) });
});

api.delete('/leads/:id', (req, res) => {
  stmts.deleteLead.run(Number(req.params.id));
  res.json({ ok: true });
});

api.get('/leads.csv', (req, res) => {
  const cols = ['id', 'created_at', 'status', 'name', 'phone', 'email', 'event_date', 'event_type', 'guests', 'location', 'package_id', 'estimate', 'items', 'message', 'notes'];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = stmts.listLeads.all().map(shape).map((l) =>
    cols.map((c) => cell(c === 'items' ? l.items.map((i) => (i.id === 'package' ? `${i.name} (-$${-i.subtotal})` : `${i.qty}x ${i.name}`)).join('; ') : l[c])).join(',')
  );
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="elevated-events-leads.csv"');
  res.send([cols.join(','), ...rows].join('\n'));
});

module.exports = { pages, api };
