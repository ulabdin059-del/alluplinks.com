import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, j, getSetting, setSetting, exclusive, DATA_DIR, DB_KIND, ready, exportAll } from './db.js';
import { sendMail, notifyAdmin, emailLayout, EMAIL_KIND } from './email.js';
import { saveFiles, removeFiles, sendPrivateFile, STORAGE_KIND, UPLOADS } from './storage.js';
import { estimateTradeIn } from '../shared/tradein.js';
import { renderPage, sitemapXml } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const isProd = process.env.NODE_ENV === 'production';
const secretFile = path.join(DATA_DIR, 'jwt.secret');
const JWT_SECRET = process.env.JWT_SECRET || (fs.existsSync(secretFile) ? fs.readFileSync(secretFile, 'utf8')
  : (() => { const s = crypto.randomBytes(48).toString('hex'); fs.writeFileSync(secretFile, s, { mode: 0o600 }); return s; })());
if (isProd && !process.env.JWT_SECRET) console.warn('[server] JWT_SECRET is not set; admin sessions will end whenever the server restarts.');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
      'frame-src': ["'self'", 'https://www.google.com', 'https://maps.google.com'],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'upgrade-insecure-requests': isProd ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Readiness gate: requests wait until the database is connected, seeded and migrated.
app.use((_req, _res, next) => { ready.then(() => next(), next); });

// ---------- helpers ----------
const clean = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const digits = (p) => String(p || '').replace(/\D/g, '');
const isPhone = (p) => { const d = digits(p); return d.length === 10 || (d.length === 11 && d[0] === '1'); };
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T12:00:00Z'));
const ALPH = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeRef(prefix) {
  const t = torontoNow();
  const rand = Array.from(crypto.randomBytes(4)).map((b) => ALPH[b % ALPH.length]).join('');
  return `${prefix}-${t.date.slice(2).replace(/-/g, '')}-${rand}`;
}
function torontoNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
const toHM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtTime = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const money = (n) => '$' + Number(n).toLocaleString('en-CA');

// Loads blocked dates and booked-slot counts for a date range in two queries, then builds slots in memory.
async function slotsForRange(from, to) {
  const blocked = new Set((await db.all('SELECT date FROM blocked_dates WHERE date BETWEEN ? AND ?', from, to)).map((r) => r.date));
  const taken = {};
  for (const r of await db.all("SELECT date, time, COUNT(*) n FROM bookings WHERE date BETWEEN ? AND ? AND status != 'cancelled' GROUP BY date, time", from, to)) taken[r.date + ' ' + r.time] = r.n;
  return (date) => buildSlots(date, blocked.has(date), (t) => taken[date + ' ' + t] || 0);
}
function buildSlots(date, isBlocked, countAt) {
  const cfg = getSetting('booking');
  const now = torontoNow();
  if (!isDate(date)) return { slots: [], reason: 'Invalid date' };
  if (date < now.date) return { slots: [], reason: 'Date is in the past' };
  if (date > addDays(now.date, cfg.days_ahead)) return { slots: [], reason: 'Too far in advance' };
  if (isBlocked) return { slots: [], reason: 'Unavailable on this date' };
  const win = cfg.weekly?.[new Date(date + 'T12:00:00Z').getUTCDay()];
  if (!win) return { slots: [], reason: 'No appointments on this day' };
  const out = [];
  for (let m = toMin(win.open); m + cfg.slot_minutes <= toMin(win.close); m += cfg.slot_minutes) {
    const t = toHM(m);
    const tooSoon = date === now.date && m < now.minutes + (cfg.min_lead_minutes || 0);
    out.push({ time: t, label: fmtTime(t), available: !tooSoon && countAt(t) < cfg.capacity });
  }
  return { slots: out };
}
const slotsFor = async (date) => (isDate(date) ? (await slotsForRange(date, date))(date) : { slots: [], reason: 'Invalid date' });

const imageFilter = (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.mimetype));
// Files are held in memory, validated with the form, then saved to Cloudinary (or local disk in development).
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 5 }, fileFilter: imageFilter });
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- read cache for public catalogue data (cleared on every admin change) ----------
const cache = new Map();
const cached = (key, fn) => { if (!cache.has(key)) cache.set(key, fn().catch((e) => { cache.delete(key); throw e; })); return cache.get(key); };
export const clearCache = () => cache.clear();

const catalog = () => cached('catalog', async () => {
  const [cats, brands, models, prices, rts] = await Promise.all([
    db.all('SELECT * FROM categories WHERE active = 1 ORDER BY sort, id'),
    db.all('SELECT * FROM brands WHERE active = 1 ORDER BY sort, id'),
    db.all('SELECT * FROM models WHERE active = 1 ORDER BY sort, id'),
    db.all('SELECT p.model_id, r.key, p.price, p.price_high FROM prices p JOIN repair_types r ON r.id = p.repair_type_id WHERE r.active = 1'),
    db.all('SELECT * FROM repair_types WHERE active = 1 ORDER BY sort, id')
  ]);
  // prices: { repairKey: from-price }; high: { repairKey: to-price } only where the owner set an explicit range.
  const pm = {}, hm = {};
  for (const p of prices) { (pm[p.model_id] ||= {})[p.key] = p.price; if (p.price_high != null) (hm[p.model_id] ||= {})[p.key] = p.price_high; }
  const repairTypes = {};
  for (const r of rts) (repairTypes[r.device_type] ||= []).push({ key: r.key, name: r.name, time: r.time_estimate, diag: !!r.diagnose_only });
  return {
    categories: cats.map((c) => ({
      id: c.id, slug: c.slug, name: c.name, device_type: c.device_type, image: c.image, blurb: c.blurb,
      brands: brands.filter((b) => b.category_id === c.id).map((b) => ({
        id: b.id, name: b.name,
        models: models.filter((m) => m.brand_id === b.id).map((m) => ({ id: m.id, name: m.name, prices: pm[m.id] || {}, high: hm[m.id] || {} }))
      }))
    })),
    repairTypes
  };
});

async function servicePriceTable(svc) {
  // Cached services arrive with price_source already parsed; raw rows have it as JSON text.
  const src = typeof svc.price_source === 'string' ? j(svc.price_source, {}) : svc.price_source || {};
  if (!src.categories?.length) return null;
  const cat = await catalog();
  const rows = [];
  for (const slug of src.categories) {
    const c = cat.categories.find((x) => x.slug === slug);
    if (!c) continue;
    for (const b of c.brands) for (const m of b.models) {
      const cells = {}, high = {};
      let any = false;
      for (const r of src.repairs) if (m.prices[r] != null) { cells[r] = m.prices[r]; if (m.high[r] != null) high[r] = m.high[r]; any = true; }
      if (any) rows.push({ category: c.name, category_slug: c.slug, brand: b.name, model: m.name, prices: cells, high });
    }
  }
  const types = {};
  for (const c of src.categories) {
    const dt = cat.categories.find((x) => x.slug === c)?.device_type;
    for (const r of cat.repairTypes[dt] || []) if (src.repairs.includes(r.key)) types[r.key] = { name: r.name, time: r.time };
  }
  return { repairs: src.repairs.filter((r) => types[r]).map((r) => ({ key: r, ...types[r] })), rows };
}

const svcOut = (s) => ({ ...s, benefits: j(s.benefits, []), price_source: j(s.price_source, {}), faqs: j(s.faqs, []) });
const prodOut = (p) => ({ ...p, images: j(p.images, []), specs: j(p.specs, []) });
const servicesAll = () => cached('services', async () => (await db.all('SELECT * FROM services WHERE active = 1 ORDER BY sort, id')).map(svcOut));
const productsAll = () => cached('products', async () => (await db.all('SELECT * FROM products WHERE active = 1 ORDER BY sort, id')).map(prodOut));

async function publicSite() {
  const [faqs, reviews, services] = await Promise.all([
    cached('faqs', () => db.all("SELECT id, question, answer FROM faqs WHERE active = 1 AND page = 'general' ORDER BY sort, id")),
    // Google reviews first (in the admin's chosen order), then approved website reviews, newest first.
    cached('reviews', () => db.all("SELECT id, name, rating, text, device, source, link, review_date, created_at FROM reviews WHERE approved = 1 ORDER BY CASE WHEN lower(source) = 'google' THEN 0 ELSE 1 END, sort, created_at DESC LIMIT 24")),
    servicesAll()
  ]);
  return {
    business: getSetting('business'), hours: getSetting('hours') || [], content: getSetting('content'), pricing: getSetting('pricing'),
    warranty: getSetting('warranty'),
    booking: (({ days_ahead }) => ({ days_ahead }))(getSetting('booking')),
    faqs, reviews,
    services: services.map(({ slug, name, short, image, image_alt, featured }) => ({ slug, name, short, image, image_alt, featured }))
  };
}

// ---------- public API ----------
const api = express.Router();
api.get('/health', wrap(async (_req, res) => {
  const t0 = Date.now();
  await db.get('SELECT 1 ok');
  res.json({ ok: true, database: DB_KIND, db_ms: Date.now() - t0, storage: STORAGE_KIND, email: EMAIL_KIND, time: new Date().toISOString() });
}));
api.get('/site', wrap(async (_req, res) => res.json(await publicSite())));
api.get('/catalog', wrap(async (_req, res) => res.json({ ...(await catalog()), pricing: getSetting('pricing') })));
api.get('/services', wrap(async (_req, res) => res.json(await servicesAll())));
api.get('/services/:slug', wrap(async (req, res) => {
  const s = (await servicesAll()).find((x) => x.slug === req.params.slug);
  if (!s) return res.status(404).json({ error: 'Service not found' });
  res.json({ ...s, price_table: await servicePriceTable(s) });
}));
api.get('/slots', wrap(async (req, res) => res.json(await slotsFor(String(req.query.date || '')))));
api.get('/availability', wrap(async (_req, res) => {
  const cfg = getSetting('booking'); const now = torontoNow();
  const lookup = await slotsForRange(now.date, addDays(now.date, cfg.days_ahead));
  const days = [];
  for (let i = 0; i <= cfg.days_ahead; i++) { const d = addDays(now.date, i); days.push({ date: d, open: lookup(d).slots.some((x) => x.available) }); }
  res.json({ days });
}));

api.post('/bookings', formLimiter, uploader.array('photos', 5), wrap(async (req, res) => {
  const body = req.body;
  const f = {
    category: clean(body.category, 60), brand: clean(body.brand, 80), model: clean(body.model, 120),
    repairs: j(body.repairs, []).filter((x) => typeof x === 'string').slice(0, 8),
    date: clean(body.date, 10), time: clean(body.time, 5), name: clean(body.name, 120),
    email: clean(body.email, 160).toLowerCase(), phone: clean(body.phone, 30), details: clean(body.details, 2000)
  };
  const errors = {};
  const cat = await db.get('SELECT * FROM categories WHERE slug = ?', f.category);
  if (!cat) errors.category = 'Choose a device type';
  if (!f.brand) errors.brand = 'Choose a brand';
  if (!f.model) errors.model = 'Choose or enter your model';
  if (!f.repairs.length) errors.repairs = 'Choose at least one repair';
  if (!isDate(f.date)) errors.date = 'Choose a date';
  if (!/^\d{2}:\d{2}$/.test(f.time)) errors.time = 'Choose a time';
  if (f.name.length < 2) errors.name = 'Enter your full name';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address';
  if (!isPhone(f.phone)) errors.phone = 'Enter a valid 10-digit phone number';
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please check the highlighted fields.', errors });

  // Recompute the estimate on the server from the database.
  const [priceRows, rtRows] = await Promise.all([
    db.all(`SELECT r.key, p.price, p.price_high FROM models m JOIN brands b ON b.id = m.brand_id
      JOIN repair_types r ON r.device_type = ? LEFT JOIN prices p ON p.model_id = m.id AND p.repair_type_id = r.id
      WHERE b.category_id = ? AND b.name = ? AND m.name = ?`, cat.device_type, cat.id, f.brand, f.model),
    db.all('SELECT key, name FROM repair_types WHERE device_type = ?', cat.device_type)
  ]);
  const rtNames = Object.fromEntries(rtRows.map((r) => [r.key, r.name]));
  const priceMap = Object.fromEntries(priceRows.map((r) => [r.key, r]));
  const variance = getSetting('pricing').variance || 0;
  let low = 0, high = 0, n = 0, diag = false;
  for (const r of f.repairs) {
    const p = priceMap[r];
    if (p && p.price != null) { low += p.price; high += p.price_high ?? p.price + variance; n++; } else diag = true;
  }
  const est = n ? { low, high } : { low: null, high: null };

  // Quick pre-check so an obviously taken slot doesn't upload photos first.
  const pre = (await slotsFor(f.date)).slots.find((s) => s.time === f.time);
  if (!pre || !pre.available) return res.status(409).json({ error: 'Sorry — that time was just booked. Please choose another time.', errors: { time: 'No longer available' } });

  const photos = await saveFiles(req.files, 'bookings');
  // Check-and-insert runs exclusively so two customers can never take the same slot.
  const ref = await exclusive(async () => {
    const slot = (await slotsFor(f.date)).slots.find((s) => s.time === f.time);
    if (!slot || !slot.available) return null;
    const r = makeRef('AU');
    await db.run(`INSERT INTO bookings(ref,category,brand,model,repairs,est_low,est_high,needs_diagnosis,date,time,name,email,phone,details,photos)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, r, cat.name, f.brand, f.model, JSON.stringify(f.repairs), est.low, est.high, diag ? 1 : 0,
    f.date, f.time, f.name, f.email, f.phone, f.details, JSON.stringify(photos));
    return r;
  });
  if (!ref) {
    removeFiles(photos);
    return res.status(409).json({ error: 'Sorry — that time was just booked. Please choose another time.', errors: { time: 'No longer available' } });
  }

  const repairText = f.repairs.map((k) => rtNames[k] || k).join(', ');
  const estText = est.low != null ? `${money(est.low)} – ${money(est.high)}${diag ? ' + in-store diagnosis' : ''}` : 'Quoted after in-store diagnosis';
  const rows = [['Reference', ref], ['Device', `${f.brand} ${f.model}`.trim()], ['Repair', repairText], ['Estimate', estText],
    ['Appointment', `${fmtDate(f.date)} at ${fmtTime(f.time)}`], ['Name', f.name], ['Phone', f.phone], ['Email', f.email]];
  const b = getSetting('business');
  const [mail] = await Promise.all([
    sendMail({
      to: f.email, subject: `Booking received — ${ref} | All Uplinks`,
      html: emailLayout('Your repair booking is received', rows.slice(0, 5),
        `Thanks, ${f.name.split(' ')[0]}. We’ve reserved your time at ${b.street}, ${b.city}. If anything changes, call us at ${b.phone_display} and quote your reference.`)
    }),
    notifyAdmin('booking', `New booking ${ref}`, `${f.name} · ${f.brand} ${f.model} · ${repairText} · ${fmtDate(f.date)} ${fmtTime(f.time)}`, '/admin/bookings',
      emailLayout(`New booking ${ref}`, [...rows, ['Details', f.details || '—'], ['Photos', String(photos.length)]]))
  ]);
  res.status(201).json({ ref, date: f.date, time: f.time, date_label: fmtDate(f.date), time_label: fmtTime(f.time), estimate: est, needs_diagnosis: diag, repairs: repairText, email_status: mail.status });
}));

api.get('/tradein/catalog', wrap(async (_req, res) => {
  const rows = await cached('tradein', () => db.all('SELECT id, device_type, brand, model, base_value, storages FROM tradein_devices WHERE active = 1 ORDER BY device_type, brand, sort, id'));
  res.json({ devices: rows.map((r) => ({ ...r, storages: j(r.storages, []) })), config: getSetting('tradein_config') });
}));
api.post('/tradeins', formLimiter, uploader.array('photos', 5), wrap(async (req, res) => {
  const body = req.body;
  const dev = await db.get('SELECT * FROM tradein_devices WHERE id = ? AND active = 1', Number(body.device_id) || 0);
  const answers = j(body.answers, {});
  const pick = (v, list) => (list.includes(v) ? v : undefined);
  const a = {
    storage: clean(answers.storage, 10), screen: pick(answers.screen, ['likeNew', 'good', 'fair', 'broken']),
    body: pick(answers.body, ['likeNew', 'good', 'fair', 'broken']), battery: pick(answers.battery, ['85plus', '80to84', 'below80', 'unknown']),
    powers: answers.powers === true ? true : answers.powers === false ? false : undefined,
    bio: answers.bio === true ? true : answers.bio === false ? false : undefined,
    unlocked: answers.unlocked === true ? true : answers.unlocked === false ? false : undefined,
    account_removed: answers.account_removed === true
  };
  const f = { name: clean(body.name, 120), email: clean(body.email, 160).toLowerCase(), phone: clean(body.phone, 30), notes: clean(body.notes, 2000) };
  const errors = {};
  if (!dev) errors.device = 'Choose your device';
  if (dev && !j(dev.storages, []).includes(a.storage)) errors.storage = 'Choose storage';
  if (!a.screen) errors.screen = 'Choose screen condition';
  if (!a.body) errors.body = 'Choose body condition';
  if (a.powers === undefined) errors.powers = 'Answer this question';
  if (f.name.length < 2) errors.name = 'Enter your full name';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address';
  if (!isPhone(f.phone)) errors.phone = 'Enter a valid 10-digit phone number';
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please check the highlighted fields.', errors });
  const est = estimateTradeIn(dev, a, getSetting('tradein_config'));
  const ref = makeRef('TI');
  const photos = await saveFiles(req.files, 'tradeins');
  await db.run(`INSERT INTO tradeins(ref,device_type,brand,model,storage,answers,est_low,est_high,est_credit,name,email,phone,notes,photos)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ref, dev.device_type, dev.brand, dev.model, a.storage, JSON.stringify(a), est.low, est.high, est.credit,
  f.name, f.email, f.phone, f.notes, JSON.stringify(photos));
  const rows = [['Reference', ref], ['Device', `${dev.brand} ${dev.model} · ${a.storage}`], ['Estimated cash value', `${money(est.low)} – ${money(est.high)}`], ['Estimated store credit', `up to ${money(est.credit)}`]];
  const [mail] = await Promise.all([
    sendMail({ to: f.email, subject: `Trade-in request received — ${ref} | All Uplinks`,
      html: emailLayout('Your trade-in request is received', rows, 'This is an estimate. Your final offer is confirmed after we physically inspect the device in store. Please bring the device, its charger if you have it, and photo ID.') }),
    notifyAdmin('tradein', `New trade-in ${ref}`, `${f.name} · ${dev.brand} ${dev.model} ${a.storage} · ${money(est.low)}–${money(est.high)}`, '/admin/tradeins',
      emailLayout(`New trade-in ${ref}`, [...rows, ['Name', f.name], ['Phone', f.phone], ['Email', f.email], ['Notes', f.notes || '—']]))
  ]);
  res.status(201).json({ ref, estimate: est, email_status: mail.status });
}));

api.get('/products', wrap(async (req, res) => {
  const cat = clean(String(req.query.category || ''), 40);
  const all = await productsAll();
  res.json(cat ? all.filter((p) => p.category === cat) : all);
}));
api.get('/products/:slug', wrap(async (req, res) => {
  const all = await productsAll();
  const p = all.find((x) => x.slug === req.params.slug);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json({ ...p, related: all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4) });
}));

api.post('/inquiries', formLimiter, uploader.array('photos', 3), wrap(async (req, res) => {
  const f = { topic: clean(req.body.topic, 60) || 'General', name: clean(req.body.name, 120), email: clean(req.body.email, 160).toLowerCase(),
    phone: clean(req.body.phone, 30), message: clean(req.body.message, 3000), product: clean(req.body.product, 160) };
  const errors = {};
  if (f.name.length < 2) errors.name = 'Enter your name';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address';
  if (f.phone && !isPhone(f.phone)) errors.phone = 'Enter a valid 10-digit phone number';
  if (f.message.length < 5) errors.message = 'Tell us a little more';
  if (req.body.website) return res.status(201).json({ ref: 'OK' }); // honeypot
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please check the highlighted fields.', errors });
  const ref = makeRef('CI');
  const photos = await saveFiles(req.files, 'inquiries');
  await db.run('INSERT INTO inquiries(ref,topic,name,email,phone,message,product,photos) VALUES(?,?,?,?,?,?,?,?)',
    ref, f.topic, f.name, f.email, f.phone, f.message, f.product, JSON.stringify(photos));
  await notifyAdmin('inquiry', `New inquiry ${ref}: ${f.topic}`, `${f.name} · ${f.email} · ${f.message.slice(0, 140)}`, '/admin/inquiries',
    emailLayout(`New inquiry ${ref}`, [['Topic', f.topic], ['Product', f.product || '—'], ['Name', f.name], ['Email', f.email], ['Phone', f.phone || '—'], ['Message', f.message]]));
  res.status(201).json({ ref });
}));

api.post('/reviews', formLimiter, wrap(async (req, res) => {
  const name = clean(req.body.name, 80), text = clean(req.body.text, 1500), device = clean(req.body.device, 80);
  const rating = Number(req.body.rating);
  const errors = {};
  if (name.length < 2) errors.name = 'Enter your name';
  if (!(rating >= 1 && rating <= 5)) errors.rating = 'Choose a rating';
  if (text.length < 10) errors.text = 'Please write at least a sentence';
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please check the highlighted fields.', errors });
  await db.run('INSERT INTO reviews(name,rating,text,device,source,approved) VALUES(?,?,?,?,?,0)', name, Math.round(rating), text, device, 'website');
  await notifyAdmin('review', 'New review awaiting approval', `${name} · ${rating}★ · ${text.slice(0, 120)}`, '/admin/reviews');
  res.status(201).json({ ok: true });
}));

// ---------- admin auth ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });
const cookieOpts = { httpOnly: true, sameSite: 'strict', secure: isProd, path: '/', maxAge: 12 * 3600 * 1000 };

api.post('/admin/login', loginLimiter, wrap(async (req, res) => {
  const email = clean(req.body?.email, 160).toLowerCase();
  const u = await db.get('SELECT * FROM admin_users WHERE email = ?', email);
  if (!u || !bcrypt.compareSync(String(req.body?.password || ''), u.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.cookie('au_admin', jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '12h' }), cookieOpts);
  res.json({ email: u.email });
}));
api.post('/admin/logout', (_req, res) => { res.clearCookie('au_admin', { ...cookieOpts, maxAge: undefined }); res.json({ ok: true }); });

async function sessionUser(req) {
  try {
    const p = jwt.verify(req.cookies?.au_admin || '', JWT_SECRET);
    return (await db.get('SELECT id, email FROM admin_users WHERE id = ?', p.sub)) || null;
  } catch { return null; }
}
const requireAdmin = wrap(async (req, res, next) => {
  const u = await sessionUser(req);
  if (!u) return res.status(401).json({ error: 'Please sign in.' });
  // CSRF defence in addition to SameSite=strict: state-changing requests must come from our own pages.
  if (!['GET', 'HEAD'].includes(req.method) && req.get('x-requested-with') !== 'alluplinks-admin') return res.status(403).json({ error: 'Forbidden' });
  req.admin = u;
  // Any successful admin change may affect public pages, so drop cached catalogue data afterwards.
  if (!['GET', 'HEAD'].includes(req.method)) res.on('finish', clearCache);
  next();
});
// Session probe for the admin UI: always 200 so signed-out visits don't log errors.
api.get('/admin/session', wrap(async (req, res) => res.json({ user: await sessionUser(req) })));
const admin = express.Router();
admin.use(requireAdmin);
admin.get('/me', (req, res) => res.json(req.admin));
admin.post('/password', wrap(async (req, res) => {
  const u = await db.get('SELECT * FROM admin_users WHERE id = ?', req.admin.id);
  if (!bcrypt.compareSync(String(req.body.current || ''), u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
  const next = String(req.body.next || '');
  if (next.length < 10) return res.status(400).json({ error: 'New password must be at least 10 characters.' });
  await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(next, 12), u.id);
  const f = path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt'); if (fs.existsSync(f)) fs.rmSync(f);
  res.json({ ok: true });
}));

admin.post('/email', wrap(async (req, res) => {
  const u = await db.get('SELECT * FROM admin_users WHERE id = ?', req.admin.id);
  if (!bcrypt.compareSync(String(req.body.current || ''), u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
  const email = clean(req.body.email, 160).toLowerCase();
  if (!isEmail(email)) return res.status(422).json({ error: 'Enter a valid email address.' });
  if (await db.get('SELECT 1 x FROM admin_users WHERE email = ? AND id != ?', email, u.id)) return res.status(409).json({ error: 'That email is already used by another admin.' });
  await db.run('UPDATE admin_users SET email = ? WHERE id = ?', email, u.id);
  res.cookie('au_admin', jwt.sign({ sub: u.id, email }, JWT_SECRET, { expiresIn: '12h' }), cookieOpts);
  res.json({ email });
}));

admin.get('/stats', wrap(async (_req, res) => {
  const now = torontoNow();
  const n = async (sql, ...a) => (await db.get(sql, ...a)).n;
  const [bookings_today, bookings_upcoming, bookings_pending, tradeins_new, inquiries_new, reviews_pending, models, price_points, products, upcoming, notifications, unread] = await Promise.all([
    n("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status != 'cancelled'", now.date),
    n("SELECT COUNT(*) n FROM bookings WHERE date >= ? AND status IN ('pending','confirmed')", now.date),
    n("SELECT COUNT(*) n FROM bookings WHERE status = 'pending'"),
    n("SELECT COUNT(*) n FROM tradeins WHERE status = 'new'"),
    n("SELECT COUNT(*) n FROM inquiries WHERE status = 'new'"),
    n('SELECT COUNT(*) n FROM reviews WHERE approved = 0'),
    n('SELECT COUNT(*) n FROM models'), n('SELECT COUNT(*) n FROM prices'),
    n('SELECT COUNT(*) n FROM products WHERE active = 1'),
    db.all("SELECT * FROM bookings WHERE date >= ? AND status IN ('pending','confirmed') ORDER BY date, time LIMIT 8", now.date),
    db.all('SELECT * FROM notifications ORDER BY id DESC LIMIT 12'),
    n('SELECT COUNT(*) n FROM notifications WHERE read = 0')
  ]);
  res.json({ bookings_today, bookings_upcoming, bookings_pending, tradeins_new, inquiries_new, reviews_pending, models, price_points, products,
    today: now.date, upcoming, notifications, unread, smtp: EMAIL_KIND !== 'none', email: EMAIL_KIND, database: DB_KIND, storage: STORAGE_KIND });
}));
admin.post('/notifications/read', wrap(async (_req, res) => { await db.run('UPDATE notifications SET read = 1'); res.json({ ok: true }); }));
admin.get('/email-log', wrap(async (_req, res) => res.json(await db.all('SELECT * FROM email_log ORDER BY id DESC LIMIT 100'))));
admin.get('/backup', wrap(async (_req, res) => {
  const data = await exportAll();
  res.set('Content-Disposition', `attachment; filename="alluplinks-backup-${torontoNow().date}.json"`);
  res.json(data);
}));

// Generic CRUD for content tables. Only whitelisted columns are writable.
const TABLES = {
  categories: { cols: ['slug', 'name', 'device_type', 'image', 'blurb', 'sort', 'active'], order: 'sort, id' },
  brands: { cols: ['category_id', 'name', 'sort', 'active'], order: 'sort, id', filters: ['category_id'] },
  models: { cols: ['brand_id', 'name', 'sort', 'active'], order: 'sort, id', filters: ['brand_id'] },
  repair_types: { cols: ['device_type', 'key', 'name', 'time_estimate', 'diagnose_only', 'sort', 'active'], order: 'device_type, sort, id', filters: ['device_type'] },
  services: { cols: ['slug', 'name', 'short', 'description', 'benefits', 'image', 'image_alt', 'price_source', 'price_note', 'time_estimate', 'warranty', 'faqs', 'meta_title', 'meta_description', 'featured', 'sort', 'active'], json: ['benefits', 'price_source', 'faqs'], order: 'sort, id' },
  products: { cols: ['slug', 'name', 'category', 'brand', 'condition', 'price', 'compare_at', 'images', 'short', 'description', 'specs', 'featured', 'sort', 'active'], json: ['images', 'specs'], order: 'sort, id', filters: ['category'] },
  faqs: { cols: ['question', 'answer', 'page', 'sort', 'active'], order: 'page, sort, id' },
  reviews: { cols: ['name', 'rating', 'text', 'device', 'source', 'approved', 'link', 'review_date', 'sort'], order: 'sort, id DESC' },
  tradein_devices: { cols: ['device_type', 'brand', 'model', 'base_value', 'storages', 'sort', 'active'], json: ['storages'], order: 'device_type, brand, sort, id', filters: ['device_type', 'brand'] },
  blocked_dates: { cols: ['date', 'reason'], order: 'date' }
};
const REQUIRED = { categories: ['slug', 'name', 'device_type'], brands: ['category_id', 'name'], models: ['brand_id', 'name'], repair_types: ['device_type', 'key', 'name'],
  services: ['slug', 'name'], products: ['slug', 'name', 'category'], faqs: ['question', 'answer'], reviews: ['name', 'rating', 'text'],
  tradein_devices: ['device_type', 'brand', 'model', 'base_value'], blocked_dates: ['date'] };
// Child rows removed explicitly (rather than relying on foreign-key cascades, which remote connections may not enforce).
const CASCADE = {
  categories: ['DELETE FROM prices WHERE model_id IN (SELECT m.id FROM models m JOIN brands b ON b.id = m.brand_id WHERE b.category_id = ?)',
    'DELETE FROM models WHERE brand_id IN (SELECT id FROM brands WHERE category_id = ?)', 'DELETE FROM brands WHERE category_id = ?'],
  brands: ['DELETE FROM prices WHERE model_id IN (SELECT id FROM models WHERE brand_id = ?)', 'DELETE FROM models WHERE brand_id = ?'],
  models: ['DELETE FROM prices WHERE model_id = ?'],
  repair_types: ['DELETE FROM prices WHERE repair_type_id = ?']
};
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function rowIn(table, body) {
  const t = TABLES[table]; const out = {};
  for (const c of t.cols) if (c in body) {
    let v = body[c];
    if (t.json?.includes(c)) v = JSON.stringify(typeof v === 'string' ? j(v, []) : v ?? []);
    else if (typeof v === 'boolean') v = v ? 1 : 0;
    else if (v === '') v = null;
    if (c === 'slug' && v) v = slugify(v);
    out[c] = v;
  }
  return out;
}
const rowOut = (table, r) => { const t = TABLES[table]; const o = { ...r }; for (const c of t.json || []) o[c] = j(r[c], []); return o; };
const conflict = (res, e) => res.status(409).json({ error: /UNIQUE/.test(e.message) ? 'An item with that name or slug already exists.' : e.message });

admin.get('/t/:table', wrap(async (req, res) => {
  const t = TABLES[req.params.table]; if (!t) return res.status(404).json({ error: 'Unknown table' });
  const where = [], args = [];
  for (const f of t.filters || []) if (req.query[f] != null && req.query[f] !== '') { where.push(`${f} = ?`); args.push(req.query[f]); }
  const rows = await db.all(`SELECT * FROM ${req.params.table}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${t.order}`, ...args);
  res.json(rows.map((r) => rowOut(req.params.table, r)));
}));
admin.post('/t/:table', wrap(async (req, res) => {
  const table = req.params.table; if (!TABLES[table]) return res.status(404).json({ error: 'Unknown table' });
  const row = rowIn(table, req.body || {});
  const missing = REQUIRED[table].filter((c) => row[c] == null || row[c] === '');
  if (missing.length) return res.status(422).json({ error: `Required: ${missing.join(', ')}` });
  try {
    const cols = Object.keys(row);
    const r = await db.run(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, ...cols.map((c) => row[c]));
    res.status(201).json(rowOut(table, await db.get(`SELECT * FROM ${table} WHERE id = ?`, r.lastInsertRowid)));
  } catch (e) { conflict(res, e); }
}));
admin.put('/t/:table/:id', wrap(async (req, res) => {
  const table = req.params.table; if (!TABLES[table]) return res.status(404).json({ error: 'Unknown table' });
  const row = rowIn(table, req.body || {}); const cols = Object.keys(row);
  if (!cols.length) return res.status(400).json({ error: 'Nothing to update' });
  try {
    await db.run(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => row[c]), Number(req.params.id));
    res.json(rowOut(table, await db.get(`SELECT * FROM ${table} WHERE id = ?`, Number(req.params.id))));
  } catch (e) { conflict(res, e); }
}));
admin.delete('/t/:table/:id', wrap(async (req, res) => {
  const table = req.params.table; if (!TABLES[table]) return res.status(404).json({ error: 'Unknown table' });
  const id = Number(req.params.id);
  await db.batch([...(CASCADE[table] || []).map((sql) => [sql, id]), [`DELETE FROM ${table} WHERE id = ?`, id]]);
  res.json({ ok: true });
}));

// Price grid for one device category.
admin.get('/prices', wrap(async (req, res) => {
  const cat = await db.get('SELECT * FROM categories WHERE id = ?', Number(req.query.category_id) || 0);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const [repairTypes, brands, models, prices] = await Promise.all([
    db.all('SELECT * FROM repair_types WHERE device_type = ? ORDER BY sort, id', cat.device_type),
    db.all('SELECT * FROM brands WHERE category_id = ? ORDER BY sort, id', cat.id),
    db.all('SELECT m.* FROM models m JOIN brands b ON b.id = m.brand_id WHERE b.category_id = ? ORDER BY b.sort, m.sort, m.id', cat.id),
    db.all('SELECT p.* FROM prices p JOIN models m ON m.id = p.model_id JOIN brands b ON b.id = m.brand_id WHERE b.category_id = ?', cat.id)
  ]);
  res.json({ category: cat, repairTypes, brands, models, prices });
}));
admin.put('/prices', wrap(async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const stmts = [];
  for (const it of items) {
    const mid = Number(it.model_id), rid = Number(it.repair_type_id);
    if (it.price === null || it.price === '' || it.price === undefined) stmts.push(['DELETE FROM prices WHERE model_id = ? AND repair_type_id = ?', mid, rid]);
    else {
      const p = Math.round(Number(it.price));
      if (!(p >= 0 && p < 100000)) return res.status(422).json({ error: 'Invalid price' });
      // price_high: omitted = keep the current "to" price; null/'' = clear it (range uses + variance); number = set it.
      if ('price_high' in it) {
        const h = it.price_high === null || it.price_high === '' ? null : Math.round(Number(it.price_high));
        if (h != null && !(h >= p && h < 100000)) return res.status(422).json({ error: '"To" price must be equal to or higher than the "from" price' });
        stmts.push(['INSERT INTO prices(model_id,repair_type_id,price,price_high) VALUES(?,?,?,?) ON CONFLICT(model_id,repair_type_id) DO UPDATE SET price = excluded.price, price_high = excluded.price_high', mid, rid, p, h]);
      } else {
        stmts.push(['INSERT INTO prices(model_id,repair_type_id,price) VALUES(?,?,?) ON CONFLICT(model_id,repair_type_id) DO UPDATE SET price = excluded.price', mid, rid, p]);
        stmts.push(['UPDATE prices SET price_high = NULL WHERE model_id = ? AND repair_type_id = ? AND price_high < price', mid, rid]);
      }
    }
  }
  await db.batch(stmts);
  res.json({ ok: true, updated: items.length });
}));

// Bookings, trade-ins and inquiries.
const LISTS = {
  bookings: { search: ['ref', 'name', 'email', 'phone', 'model'], statuses: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'], order: 'date DESC, time DESC', editable: ['status', 'admin_notes', 'date', 'time'], json: ['repairs', 'photos'] },
  tradeins: { search: ['ref', 'name', 'email', 'phone', 'model'], statuses: ['new', 'contacted', 'offer_made', 'accepted', 'declined', 'completed'], order: 'id DESC', editable: ['status', 'admin_notes', 'offer_amount'], json: ['answers', 'photos'] },
  inquiries: { search: ['ref', 'name', 'email', 'phone', 'message'], statuses: ['new', 'replied', 'closed'], order: 'id DESC', editable: ['status', 'admin_notes'], json: ['photos'] }
};
for (const [name, cfg] of Object.entries(LISTS)) {
  admin.get(`/${name}`, wrap(async (req, res) => {
    const where = [], args = [];
    if (req.query.status) { where.push('status = ?'); args.push(req.query.status); }
    if (name === 'bookings' && req.query.from) { where.push('date >= ?'); args.push(req.query.from); }
    if (name === 'bookings' && req.query.to) { where.push('date <= ?'); args.push(req.query.to); }
    if (req.query.q) { where.push('(' + cfg.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')'); for (const _ of cfg.search) args.push(`%${req.query.q}%`); }
    const rows = await db.all(`SELECT * FROM ${name}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${cfg.order} LIMIT 500`, ...args);
    res.json({ statuses: cfg.statuses, rows: rows.map((r) => { const o = { ...r }; for (const c of cfg.json) o[c] = j(r[c], c === 'answers' ? {} : []); return o; }) });
  }));
  admin.patch(`/${name}/:id`, wrap(async (req, res) => {
    const id = Number(req.params.id);
    const cur = await db.get(`SELECT * FROM ${name} WHERE id = ?`, id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const patch = {};
    for (const c of cfg.editable) if (c in req.body) patch[c] = req.body[c] === '' ? null : req.body[c];
    if (patch.status && !cfg.statuses.includes(patch.status)) return res.status(422).json({ error: 'Invalid status' });
    const cols = Object.keys(patch);
    const apply = () => (cols.length ? db.run(`UPDATE ${name} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, ...cols.map((c) => patch[c]), id) : null);
    if (name === 'bookings' && (patch.date || patch.time)) {
      const date = patch.date || cur.date, time = patch.time || cur.time;
      const ok = await exclusive(async () => {
        const clash = (await db.get("SELECT COUNT(*) n FROM bookings WHERE date = ? AND time = ? AND id != ? AND status != 'cancelled'", date, time, id)).n;
        if (clash >= getSetting('booking').capacity) return false;
        await apply(); return true;
      });
      if (!ok) return res.status(409).json({ error: 'That slot is already booked.' });
    } else await apply();
    res.json({ ok: true });
  }));
  admin.delete(`/${name}/:id`, wrap(async (req, res) => {
    const row = await db.get(`SELECT photos FROM ${name} WHERE id = ?`, Number(req.params.id));
    await db.run(`DELETE FROM ${name} WHERE id = ?`, Number(req.params.id));
    if (row) removeFiles(j(row.photos, []));
    res.json({ ok: true });
  }));
}

const SETTING_KEYS = ['business', 'hours', 'content', 'pricing', 'warranty', 'booking', 'seo', 'tradein_config'];
admin.get('/settings', (_req, res) => res.json(Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k)]))));
admin.put('/settings/:key', wrap(async (req, res) => {
  if (!SETTING_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown setting' });
  await setSetting(req.params.key, req.body);
  res.json({ ok: true });
}));

admin.post('/upload', uploader.single('file'), wrap(async (req, res) => {
  if (!req.file) return res.status(422).json({ error: 'Upload a JPG, PNG or WebP image under 8 MB.' });
  const [url] = await saveFiles([req.file], 'public');
  res.status(201).json({ url });
}));
admin.get('/files/{*rest}', wrap(async (req, res) => {
  const segs = [].concat(req.params.rest || []).flatMap((s) => String(s).split('/')).filter(Boolean);
  if (!(await sendPrivateFile(res, segs))) res.status(404).end();
}));

api.use('/admin', admin);
api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

// ---------- static, SEO and SPA ----------
if (STORAGE_KIND === 'local') app.use('/uploads', express.static(path.join(UPLOADS, 'public'), { maxAge: '30d' }));
app.get('/robots.txt', (_req, res) => {
  const site = getSetting('business').site_url;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
});
app.get('/sitemap', (_req, res) => res.redirect(301, '/sitemap.xml'));
app.get('/sitemap.xml', wrap(async (_req, res) => res.type('application/xml').send(await sitemapXml())));

if (fs.existsSync(DIST)) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(DIST, { index: false, maxAge: '7d' }));
  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  app.get('/{*splat}', wrap(async (req, res) => {
    const [services, products, site] = await Promise.all([servicesAll(), productsAll(), publicSite()]);
    const page = await renderPage(req.path, template, { services, products, site });
    res.status(page.status).type('html').send(page.html);
  }));
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(413).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 8 MB.' : 'Too many photos (maximum 5).' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please call us at 905-535-9503.' });
});

const PORT = Number(process.env.PORT || 3001);
ready.then(() => app.listen(PORT, () => console.log(`All Uplinks server on http://localhost:${PORT} (database: ${DB_KIND}, storage: ${STORAGE_KIND}, email: ${EMAIL_KIND})`)))
  .catch((e) => { console.error('[server] Database failed to start:', e); process.exit(1); });
