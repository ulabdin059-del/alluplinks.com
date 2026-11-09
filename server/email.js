// Transactional email. Uses SMTP when configured (SMTP_HOST etc.); otherwise records the attempt in email_log.
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

export async function sendMail({ to, subject, html, replyTo }) {
  if (!to) return { status: 'skipped' };
  const log = db.prepare('INSERT INTO email_log(recipient,subject,status,error) VALUES(?,?,?,?)');
  if (!transport) {
    log.run(to, subject, 'not_sent', 'SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM');
    return { status: 'not_sent' };
  }
  try {
    await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, replyTo });
    log.run(to, subject, 'sent', null);
    return { status: 'sent' };
  } catch (e) {
    log.run(to, subject, 'failed', String(e.message || e));
    return { status: 'failed' };
  }
}

export function notifyAdmin(kind, title, body, link, html) {
  db.prepare('INSERT INTO notifications(kind,title,body,link) VALUES(?,?,?,?)').run(kind, title, body, link);
  const to = process.env.ADMIN_NOTIFY_EMAIL || getSetting('business')?.email;
  if (to) sendMail({ to, subject: `[All Uplinks] ${title}`, html: html || emailLayout(title, [['Details', body]]) }).catch(() => {});
}
