// Transactional email. Providers, in order of preference:
//   BREVO_API_KEY  → Brevo HTTP API (free: 300 emails/day; works on hosts that block SMTP ports, e.g. Render free)
//   RESEND_API_KEY → Resend HTTP API (free: 3,000 emails/month; needs a verified domain)
//   SMTP_HOST      → any SMTP server via Nodemailer (only where the host allows outbound SMTP)
// With none configured, attempts are recorded in email_log as "not_sent" and everything else keeps working.
import nodemailer from 'nodemailer';
import { db, getSetting } from './db.js';

let transport = null;
if (process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}
export const EMAIL_KIND = process.env.BREVO_API_KEY ? 'brevo' : process.env.RESEND_API_KEY ? 'resend' : transport ? 'smtp' : 'none';

// MAIL_FROM: "All Uplinks <bookings@alluplinks.com>" or just an email address.
function sender() {
  const raw = process.env.MAIL_FROM || process.env.SMTP_USER || '';
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'All Uplinks', email: m[2] } : { name: 'All Uplinks', email: raw.trim() };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function emailLayout(title, rows, intro) {
  const b = getSetting('business');
  const body = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:14px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#0f1d3a;font-size:14px;font-weight:600">${esc(v)}</td></tr>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Segoe UI,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e3eaf3">
  <div style="font-size:20px;font-weight:800;color:#0f1d3a;margin-bottom:4px">${esc(b.name)}</div>
  <div style="font-size:13px;color:#64748b;margin-bottom:24px">${esc(b.street)}, ${esc(b.city)}, ${esc(b.region_name)} · ${esc(b.phone_display)}</div>
  <h1 style="font-size:22px;color:#0f1d3a;margin:0 0 12px">${esc(title)}</h1>
  ${intro ? `<p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 20px">${esc(intro)}</p>` : ''}
  <table style="border-collapse:collapse;width:100%">${body}</table>
  </div></div></body></html>`;
}

async function deliver({ to, subject, html, replyTo }) {
  const from = sender();
  if (EMAIL_KIND === 'brevo') {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html, ...(replyTo ? { replyTo: { email: replyTo } } : {}) })
    });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
  } else if (EMAIL_KIND === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `${from.name} <${from.email}>`, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
  } else {
    await transport.sendMail({ from: `${from.name} <${from.email}>`, to, subject, html, replyTo });
  }
}

export async function sendMail({ to, subject, html, replyTo }) {
  if (!to) return { status: 'skipped' };
  const log = (status, error) => db.run('INSERT INTO email_log(recipient,subject,status,error) VALUES(?,?,?,?)', to, subject, status, error).catch(() => {});
  if (EMAIL_KIND === 'none') {
    await log('not_sent', 'Email not configured — set BREVO_API_KEY (or RESEND_API_KEY / SMTP_HOST) and MAIL_FROM');
    return { status: 'not_sent' };
  }
  if (!sender().email) { await log('failed', 'MAIL_FROM is not set'); return { status: 'failed' }; }
  try { await deliver({ to, subject, html, replyTo }); await log('sent', null); return { status: 'sent' }; }
  catch (e) { await log('failed', String(e.message || e)); return { status: 'failed' }; }
}

export async function notifyAdmin(kind, title, body, link, html) {
  await db.run('INSERT INTO notifications(kind,title,body,link) VALUES(?,?,?,?)', kind, title, body, link);
  const to = process.env.ADMIN_NOTIFY_EMAIL || getSetting('business')?.email;
  if (to) sendMail({ to, subject: `[All Uplinks] ${title}`, html: html || emailLayout(title, [['Details', body]]) }).catch(() => {});
}
