'use strict';

const nodemailer = require('nodemailer');

let transport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function fmtDate(d) {
  if (!d) return 'Not set';
  const dt = new Date(d + 'T12:00:00');
  return isNaN(dt) ? d : dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/** Email the owner about a new quote request. Never throws. */
async function notifyNewLead(lead, lines) {
  const to = process.env.NOTIFY_EMAIL;
  const subject = `New quote request: ${lead.name} — ${fmtDate(lead.event_date)} ($${lead.estimate})`;
  const rows = lines.length
    ? lines.map((l) => `<tr><td>${esc(l.name)}</td><td align="right">${l.id === 'package' ? '' : l.qty}</td><td align="right">${l.subtotal < 0 ? '−$' + Math.abs(l.subtotal) : '$' + l.subtotal}</td></tr>`).join('')
    : '<tr><td colspan="3"><em>No items selected — wants help choosing</em></td></tr>';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="margin:0 0 4px">New quote request</h2>
      <p style="margin:0 0 16px;color:#555">From the Elevated Events website</p>
      <table cellpadding="6" style="border-collapse:collapse;width:100%">
        <tr><td><b>Name</b></td><td>${esc(lead.name)}</td></tr>
        <tr><td><b>Phone</b></td><td><a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a></td></tr>
        <tr><td><b>Email</b></td><td>${esc(lead.email || '—')}</td></tr>
        <tr><td><b>Event date</b></td><td>${esc(fmtDate(lead.event_date))}</td></tr>
        <tr><td><b>Event type</b></td><td>${esc(lead.event_type || '—')}</td></tr>
        <tr><td><b>Guests</b></td><td>${esc(lead.guests || '—')}</td></tr>
        <tr><td><b>Location</b></td><td>${esc(lead.location || '—')}</td></tr>
      </table>
      <h3 style="margin:20px 0 6px">Requested items</h3>
      <table cellpadding="6" style="border-collapse:collapse;width:100%;border-top:1px solid #ddd">
        ${rows}
        <tr style="border-top:1px solid #ddd"><td><b>Estimate</b></td><td></td><td align="right"><b>$${lead.estimate}</b></td></tr>
      </table>
      ${lead.message ? `<h3 style="margin:20px 0 6px">Message</h3><p>${esc(lead.message)}</p>` : ''}
      ${process.env.SITE_URL ? `<p style="margin-top:24px"><a href="${esc(process.env.SITE_URL)}/admin">Open lead dashboard →</a></p>` : ''}
    </div>`;

  if (!transport || !to) {
    console.log(`[mailer] SMTP not configured — lead #${lead.id} saved to dashboard only. Subject: ${subject}`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      replyTo: lead.email || undefined,
      subject,
      html
    });
  } catch (err) {
    console.error('[mailer] Failed to send lead notification:', err.message);
  }
}

module.exports = { notifyNewLead };
