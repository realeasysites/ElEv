'use strict';

const crypto = require('crypto');
const { stmts } = require('../db');

const COOKIE = 'ee_admin';
const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
  );
}

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof input !== 'string') return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function createSession(res) {
  stmts.purgeSessions.run(Date.now());
  const token = crypto.randomBytes(32).toString('hex');
  stmts.insertSession.run(token, Date.now() + TTL_MS);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: TTL_MS,
    path: '/'
  });
}

function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) stmts.deleteSession.run(token);
  res.clearCookie(COOKIE, { path: '/' });
}

function isAuthed(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  return Boolean(token && stmts.getSession.get(token, Date.now()));
}

/** Protects admin API routes. */
function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ error: 'Not signed in' });
}

module.exports = { checkPassword, createSession, destroySession, isAuthed, requireAdmin };
