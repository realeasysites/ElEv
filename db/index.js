'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'elevated-events.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    event_date  TEXT,
    event_type  TEXT,
    guests      INTEGER,
    location    TEXT,
    package_id  TEXT,
    items_json  TEXT NOT NULL DEFAULT '[]',
    estimate    INTEGER NOT NULL DEFAULT 0,
    message     TEXT,
    status      TEXT NOT NULL DEFAULT 'new',
    notes       TEXT,
    ip          TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_event_date ON leads(event_date);

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    expires_at  INTEGER NOT NULL
  );
`);

const STATUSES = ['new', 'contacted', 'quoted', 'booked', 'completed', 'lost'];

const stmts = {
  insertLead: db.prepare(`
    INSERT INTO leads (name, phone, email, event_date, event_type, guests, location, package_id, items_json, estimate, message, ip)
    VALUES (@name, @phone, @email, @event_date, @event_type, @guests, @location, @package_id, @items_json, @estimate, @message, @ip)
  `),
  listLeads: db.prepare(`SELECT * FROM leads ORDER BY datetime(created_at) DESC`),
  getLead: db.prepare(`SELECT * FROM leads WHERE id = ?`),
  updateLead: db.prepare(`
    UPDATE leads SET status = COALESCE(@status, status), notes = COALESCE(@notes, notes), updated_at = datetime('now')
    WHERE id = @id
  `),
  deleteLead: db.prepare(`DELETE FROM leads WHERE id = ?`),
  bookedOnDate: db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE event_date = ? AND status = 'booked' AND id != ?`),
  statusCounts: db.prepare(`SELECT status, COUNT(*) AS n FROM leads GROUP BY status`),

  insertSession: db.prepare(`INSERT INTO sessions (token, expires_at) VALUES (?, ?)`),
  getSession: db.prepare(`SELECT * FROM sessions WHERE token = ? AND expires_at > ?`),
  deleteSession: db.prepare(`DELETE FROM sessions WHERE token = ?`),
  purgeSessions: db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`)
};

module.exports = { db, stmts, STATUSES };
