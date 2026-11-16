// WhatsApp alerts to the store's own phone for new bookings, trade-ins, inquiries and reviews.
// Uses CallMeBot (free, for messages to your own number): the phone owner sends CallMeBot an activation message
// once and receives an API key. Set CALLMEBOT_API_KEY on the server; the number defaults to the store phone in
// Site settings (WHATSAPP_NOTIFY_PHONE overrides it, in +1… format). Every attempt is listed in Admin → Email log.
import { db, getSetting } from './db.js';

const API_URL = process.env.CALLMEBOT_URL || 'https://api.callmebot.com/whatsapp.php';
export const WHATSAPP_KIND = process.env.CALLMEBOT_API_KEY ? 'callmebot' : 'none';

const notifyPhone = () => (process.env.WHATSAPP_NOTIFY_PHONE || getSetting('business')?.phone_tel || '').replace(/[^\d+]/g, '');
const masked = (p) => `WhatsApp …${p.slice(-4)}`;

export async function sendWhatsApp(text) {
  if (WHATSAPP_KIND === 'none') return { status: 'skipped' };
  const phone = notifyPhone();
  const log = (status, error) => db.run('INSERT INTO email_log(recipient,subject,status,error) VALUES(?,?,?,?)', masked(phone), text.split('\n')[0].slice(0, 200), status, error).catch(() => {});
  if (!/^\+?\d{8,15}$/.test(phone)) { await log('failed', 'No valid WhatsApp number (set the store phone or WHATSAPP_NOTIFY_PHONE)'); return { status: 'failed' }; }
  try {
    const url = `${API_URL}?${new URLSearchParams({ phone, text: text.slice(0, 1500), apikey: process.env.CALLMEBOT_API_KEY })}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const body = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // CallMeBot answers 200 with an HTML page; failures say "ERROR" or "APIKey is invalid".
    if (!r.ok || /error|invalid|not (?:active|allowed)/i.test(body)) throw new Error(`CallMeBot ${r.status}: ${body.slice(0, 200)}`);
    await log('sent', null);
    return { status: 'sent' };
  } catch (e) {
    await log('failed', String(e.message || e).replace(process.env.CALLMEBOT_API_KEY, '***'));
    return { status: 'failed' };
  }
}
