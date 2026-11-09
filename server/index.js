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
import { db, j, getSetting, setSetting, tx, DATA_DIR } from './db.js';
import { sendMail, notifyAdmin, emailLayout } from './email.js';
import { estimateTradeIn } from '../shared/tradein.js';
import { renderPage, sitemapXml } from './seo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const UPLOADS = path.join(DATA_DIR, 'uploads');
for (const d of ['bookings', 'tradeins', 'inquiries', 'public']) fs.mkdirSync(path.join(UPLOADS, d), { recursive: true });

const isProd = process.env.NODE_ENV === 'production';
const secretFile = path.join(DATA_DIR, 'jwt.secret');
const JWT_SECRET = process.env.JWT_SECRET || (fs.existsSync(secretFile) ? fs.readFileSync(secretFile, 'utf8')
  : (() => { const s = crypto.randomBytes(48).toString('hex'); fs.writeFileSync(secretFile, s, { mode: 0o600 }); return s; })());

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'blob:'],
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

function slotsFor(date) {
  const cfg = getSetting('booking');
  const now = torontoNow();
  if (!isDate(date)) return { slots: [], reason: 'Invalid date' };
  if (date < now.date) return { slots: [], reason: 'Date is in the past' };
  if (date > addDays(now.date, cfg.days_ahead)) return { slots: [], reason: 'Too far in advance' };
  if (db.prepare('SELECT 1 FROM blocked_dates WHERE date = ?').get(date)) return { slots: [], reason: 'Unavailable on this date' };
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  const win = cfg.weekly?.[day];
  if (!win) return { slots: [], reason: 'No appointments on this day' };
  const taken = Object.fromEntries(db.prepare("SELECT time, COUNT(*) n FROM bookings WHERE date = ? AND status NOT IN ('cancelled') GROUP BY time").all(date).map((r) => [r.time, r.n]));
  const out = [];
  for (let m = toMin(win.open); m + cfg.slot_minutes <= toMin(win.close); m += cfg.slot_minutes) {
    const t = toHM(m);
    const tooSoon = date === now.date && m < now.minutes + (cfg.min_lead_minutes || 0);
    out.push({ time: t, label: fmtTime(t), available: !tooSoon && (taken[t] || 0) < cfg.capacity });
  }
  return { slots: out };
}

const imageFilter = (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.mimetype));
const uploader = (folder) => multer({
  storage: multer.diskStorage({
    destination: path.join(UPLOADS, folder),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${(path.extname(file.originalname) || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '')}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: imageFilter
});
const formLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- catalogue ----------
function catalog() {
  const cats = db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort, id').all();
  const brands = db.prepare('SELECT * FROM brands WHERE active = 1 ORDER BY sort, id').all();
  const models = db.prepare('SELECT * FROM models WHERE active = 1 ORDER BY sort, id').all();
  const prices = db.prepare('SELECT p.model_id, r.key, p.price FROM prices p JOIN repair_types r ON r.id = p.repair_type_id WHERE r.active = 1').all();
  const pm = {};
  for (const p of prices) (pm[p.model_id] ||= {})[p.key] = p.price;
  const rts = db.prepare('SELECT * FROM repair_types WHERE active = 1 ORDER BY sort, id').all();
  const repairTypes = {};
  for (const r of rts) (repairTypes[r.device_type] ||= []).push({ key: r.key, name: r.name, time: r.time_estimate, diag: !!r.diagnose_only });
  return {
    categories: cats.map((c) => ({
      id: c.id, slug: c.slug, name: c.name, device_type: c.device_type, image: c.image, blurb: c.blurb,
      brands: brands.filter((b) => b.category_id === c.id).map((b) => ({
        id: b.id, name: b.name,
        models: models.filter((m) => m.brand_id === b.id).map((m) => ({ id: m.id, name: m.name, prices: pm[m.id] || {} }))
      }))
    })),
    repairTypes,
    pricing: getSetting('pricing')
  };
}

function servicePriceTable(svc) {
  const src = j(svc.price_source, {});
  if (!src.categories?.length) return null;
  const cat = catalog();
  const rows = [];
  for (const slug of src.categories) {
    const c = cat.categories.find((x) => x.slug === slug);
    if (!c) continue;
    for (const b of c.brands) for (const m of b.models) {
      const cells = {};
      let any = false;
      for (const r of src.repairs) if (m.prices[r] != null) { cells[r] = m.prices[r]; any = true; }
      if (any) rows.push({ category: c.name, category_slug: c.slug, brand: b.name, model: m.name, prices: cells });
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

function publicSite() {
  const b = getSetting('business');
  return {
    business: b, hours: getSetting('hours') || [], content: getSetting('content'), pricing: getSetting('pricing'),
    warranty: getSetting('warranty'),
    booking: (({ days_ahead }) => ({ days_ahead }))(getSetting('booking')),
    faqs: db.prepare("SELECT id, question, answer FROM faqs WHERE active = 1 AND page = 'general' ORDER BY sort, id").all(),
    reviews: db.prepare('SELECT id, name, rating, text, device, source, created_at FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT 24').all(),
    services: db.prepare('SELECT slug, name, short, image, image_alt, featured FROM services WHERE active = 1 ORDER BY sort, id').all()
  };
}

// ---------- public API ----------
const api = express.Router();
api.get('/site', (_req, res) => res.json(publicSite()));
api.get('/catalog', (_req, res) => res.json(catalog()));
api.get('/services', (_req, res) => res.json(db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort, id').all().map(svcOut)));
api.get('/services/:slug', (req, res) => {
  const s = db.prepare('SELECT * FROM services WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!s) return res.status(404).json({ error: 'Service not found' });
  res.json({ ...svcOut(s), price_table: servicePriceTable(s) });
});
api.get('/slots', (req, res) => res.json(slotsFor(String(req.query.date || ''))));
api.get('/availability', (_req, res) => {
  const cfg = getSetting('booking'); const now = torontoNow(); const days = [];
  for (let i = 0; i <= cfg.days_ahead; i++) {
    const d = addDays(now.date, i); const s = slotsFor(d);
    days.push({ date: d, open: s.slots.some((x) => x.available) });
  }
  res.json({ days });
});

api.post('/bookings', formLimiter, uploader('bookings').array('photos', 5), wrap(async (req, res) => {
  const body = req.body;
  const f = {
    category: clean(body.category, 60), brand: clean(body.brand, 80), model: clean(body.model, 120),
    repairs: j(body.repairs, []).filter((x) => typeof x === 'string').slice(0, 8),
    date: clean(body.date, 10), time: clean(body.time, 5), name: clean(body.name, 120),
    email: clean(body.email, 160).toLowerCase(), phone: clean(body.phone, 30), details: clean(body.details, 2000)
  };
  const errors = {};
  const cat = db.prepare('SELECT * FROM categories WHERE slug = ?').get(f.category);
  if (!cat) errors.category = 'Choose a device type';
  if (!f.brand) errors.brand = 'Choose a brand';
  if (!f.model) errors.model = 'Choose or enter your model';
  if (!f.repairs.length) errors.repairs = 'Choose at least one repair';
  if (!isDate(f.date)) errors.date = 'Choose a date';
  if (!/^\d{2}:\d{2}$/.test(f.time)) errors.time = 'Choose a time';
  if (f.name.length < 2) errors.name = 'Enter your full name';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address';
  if (!isPhone(f.phone)) errors.phone = 'Enter a valid 10-digit phone number';
  if (Object.keys(errors).length) { cleanupFiles(req.files); return res.status(422).json({ error: 'Please check the highlighted fields.', errors }); }

  // Recompute the estimate on the server from the database.
  const priceRows = db.prepare(`SELECT r.key, r.name, p.price FROM models m JOIN brands b ON b.id = m.brand_id
    JOIN repair_types r ON r.device_type = ? LEFT JOIN prices p ON p.model_id = m.id AND p.repair_type_id = r.id
    WHERE b.category_id = ? AND b.name = ? AND m.name = ?`).all(cat.device_type, cat.id, f.brand, f.model);
  const rtNames = Object.fromEntries(db.prepare('SELECT key, name FROM repair_types WHERE device_type = ?').all(cat.device_type).map((r) => [r.key, r.name]));
  const priceMap = Object.fromEntries(priceRows.map((r) => [r.key, r.price]));
  const variance = getSetting('pricing').variance || 0;
  let low = 0, n = 0, diag = false;
  for (const r of f.repairs) { if (priceMap[r] != null) { low += priceMap[r]; n++; } else diag = true; }
  const est = n ? { low, high: low + n * variance } : { low: null, high: null };
  const photos = (req.files || []).map((x) => 'bookings/' + x.filename);

  let ref;
  try {
    ref = tx(() => {
      const slot = slotsFor(f.date).slots.find((s) => s.time === f.time);
      if (!slot || !slot.available) { const e = new Error('slot'); e.code = 'SLOT'; throw e; }
      const r = makeRef('AU');
      db.prepare(`INSERT INTO bookings(ref,category,brand,model,repairs,est_low,est_high,needs_diagnosis,date,time,name,email,phone,details,photos)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r, cat.name, f.brand, f.model, JSON.stringify(f.repairs), est.low, est.high, diag ? 1 : 0,
        f.date, f.time, f.name, f.email, f.phone, f.details, JSON.stringify(photos));
      return r;
    });
  } catch (e) {
    cleanupFiles(req.files);
    if (e.code === 'SLOT') return res.status(409).json({ error: 'Sorry — that time was just booked. Please choose another time.', errors: { time: 'No longer available' } });
    throw e;
  }

  const repairText = f.repairs.map((k) => rtNames[k] || k).join(', ');
  const estText = est.low != null ? `${money(est.low)} – ${money(est.high)}${diag ? ' + in-store diagnosis' : ''}` : 'Quoted after in-store diagnosis';
  const rows = [['Reference', ref], ['Device', `${f.brand} ${f.model}`.trim()], ['Repair', repairText], ['Estimate', estText],
    ['Appointment', `${fmtDate(f.date)} at ${fmtTime(f.time)}`], ['Name', f.name], ['Phone', f.phone], ['Email', f.email]];
  const b = getSetting('business');
  const mail = await sendMail({
    to: f.email, subject: `Booking received — ${ref} | All Uplinks`,
    html: emailLayout('Your repair booking is received', rows.slice(0, 5),
      `Thanks, ${f.name.split(' ')[0]}. We’ve reserved your time at ${b.street}, ${b.city}. If anything changes, call us at ${b.phone_display} and quote your reference.`)
  });
  notifyAdmin('booking', `New booking ${ref}`, `${f.name} · ${f.brand} ${f.model} · ${repairText} · ${fmtDate(f.date)} ${fmtTime(f.time)}`, '/admin/bookings',
    emailLayout(`New booking ${ref}`, [...rows, ['Details', f.details || '—'], ['Photos', String(photos.length)]]));
  res.status(201).json({ ref, date: f.date, time: f.time, date_label: fmtDate(f.date), time_label: fmtTime(f.time), estimate: est, needs_diagnosis: diag, repairs: repairText, email_status: mail.status });
}));

api.get('/tradein/catalog', (_req, res) => {
  const rows = db.prepare('SELECT id, device_type, brand, model, base_value, storages FROM tradein_devices WHERE active = 1 ORDER BY device_type, brand, sort, id').all();
  res.json({ devices: rows.map((r) => ({ ...r, storages: j(r.storages, []) })), config: getSetting('tradein_config') });
});
api.post('/tradeins', formLimiter, uploader('tradeins').array('photos', 5), wrap(async (req, res) => {
  const body = req.body;
  const dev = db.prepare('SELECT * FROM tradein_devices WHERE id = ? AND active = 1').get(Number(body.device_id));
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
  if (Object.keys(errors).length) { cleanupFiles(req.files); return res.status(422).json({ error: 'Please check the highlighted fields.', errors }); }
  const est = estimateTradeIn(dev, a, getSetting('tradein_config'));
  const ref = makeRef('TI');
  const photos = (req.files || []).map((x) => 'tradeins/' + x.filename);
  db.prepare(`INSERT INTO tradeins(ref,device_type,brand,model,storage,answers,est_low,est_high,est_credit,name,email,phone,notes,photos)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ref, dev.device_type, dev.brand, dev.model, a.storage, JSON.stringify(a), est.low, est.high, est.credit,
    f.name, f.email, f.phone, f.notes, JSON.stringify(photos));
  const rows = [['Reference', ref], ['Device', `${dev.brand} ${dev.model} · ${a.storage}`], ['Estimated cash value', `${money(est.low)} – ${money(est.high)}`], ['Estimated store credit', `up to ${money(est.credit)}`]];
  const mail = await sendMail({ to: f.email, subject: `Trade-in request received — ${ref} | All Uplinks`,
    html: emailLayout('Your trade-in request is received', rows, 'This is an estimate. Your final offer is confirmed after we physically inspect the device in store. Please bring the device, its charger if you have it, and photo ID.') });
  notifyAdmin('tradein', `New trade-in ${ref}`, `${f.name} · ${dev.brand} ${dev.model} ${a.storage} · ${money(est.low)}–${money(est.high)}`, '/admin/tradeins',
    emailLayout(`New trade-in ${ref}`, [...rows, ['Name', f.name], ['Phone', f.phone], ['Email', f.email], ['Notes', f.notes || '—']]));
  res.status(201).json({ ref, estimate: est, email_status: mail.status });
}));

api.get('/products', (req, res) => {
  const cat = clean(String(req.query.category || ''), 40);
  const rows = cat ? db.prepare('SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY sort, id').all(cat)
    : db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort, id').all();
  res.json(rows.map(prodOut));
});
api.get('/products/:slug', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const related = db.prepare('SELECT * FROM products WHERE active = 1 AND category = ? AND id != ? ORDER BY sort LIMIT 4').all(p.category, p.id).map(prodOut);
  res.json({ ...prodOut(p), related });
});

api.post('/inquiries', formLimiter, uploader('inquiries').array('photos', 3), wrap(async (req, res) => {
  const f = { topic: clean(req.body.topic, 60) || 'General', name: clean(req.body.name, 120), email: clean(req.body.email, 160).toLowerCase(),
    phone: clean(req.body.phone, 30), message: clean(req.body.message, 3000), product: clean(req.body.product, 160) };
  const errors = {};
  if (f.name.length < 2) errors.name = 'Enter your name';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address';
  if (f.phone && !isPhone(f.phone)) errors.phone = 'Enter a valid 10-digit phone number';
  if (f.message.length < 5) errors.message = 'Tell us a little more';
  if (req.body.website) return res.status(201).json({ ref: 'OK' }); // honeypot
  if (Object.keys(errors).length) { cleanupFiles(req.files); return res.status(422).json({ error: 'Please check the highlighted fields.', errors }); }
  const ref = makeRef('CI');
  const photos = (req.files || []).map((x) => 'inquiries/' + x.filename);
  db.prepare('INSERT INTO inquiries(ref,topic,name,email,phone,message,product,photos) VALUES(?,?,?,?,?,?,?,?)')
    .run(ref, f.topic, f.name, f.email, f.phone, f.message, f.product, JSON.stringify(photos));
  notifyAdmin('inquiry', `New inquiry ${ref}: ${f.topic}`, `${f.name} · ${f.email} · ${f.message.slice(0, 140)}`, '/admin/inquiries',
    emailLayout(`New inquiry ${ref}`, [['Topic', f.topic], ['Product', f.product || '—'], ['Name', f.name], ['Email', f.email], ['Phone', f.phone || '—'], ['Message', f.message]]));
  res.status(201).json({ ref });
}));

api.post('/reviews', formLimiter, (req, res) => {
  const name = clean(req.body.name, 80), text = clean(req.body.text, 1500), device = clean(req.body.device, 80);
  const rating = Number(req.body.rating);
  const errors = {};
  if (name.length < 2) errors.name = 'Enter your name';
  if (!(rating >= 1 && rating <= 5)) errors.rating = 'Choose a rating';
  if (text.length < 10) errors.text = 'Please write at least a sentence';
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please check the highlighted fields.', errors });
  db.prepare('INSERT INTO reviews(name,rating,text,device,source,approved) VALUES(?,?,?,?,?,0)').run(name, Math.round(rating), text, device, 'website');
  notifyAdmin('review', 'New review awaiting approval', `${name} · ${rating}★ · ${text.slice(0, 120)}`, '/admin/reviews');
  res.status(201).json({ ok: true });
});

function cleanupFiles(files) { for (const f of files || []) fs.rm(f.path, { force: true }, () => {}); }

// ---------- admin auth ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in 15 minutes.' } });
const cookieOpts = { httpOnly: true, sameSite: 'strict', secure: isProd, path: '/', maxAge: 12 * 3600 * 1000 };

api.post('/admin/login', loginLimiter, (req, res) => {
  const email = clean(req.body?.email, 160).toLowerCase();
  const u = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
  if (!u || !bcrypt.compareSync(String(req.body?.password || ''), u.password_hash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  res.cookie('au_admin', jwt.sign({ sub: u.id, email: u.email }, JWT_SECRET, { expiresIn: '12h' }), cookieOpts);
  res.json({ email: u.email });
});
api.post('/admin/logout', (_req, res) => { res.clearCookie('au_admin', { ...cookieOpts, maxAge: undefined }); res.json({ ok: true }); });

function requireAdmin(req, res, next) {
  try {
    const p = jwt.verify(req.cookies?.au_admin || '', JWT_SECRET);
    const u = db.prepare('SELECT id, email FROM admin_users WHERE id = ?').get(p.sub);
    if (!u) throw new Error('no user');
    // CSRF defence in addition to SameSite=strict: state-changing requests must come from our own pages.
    if (!['GET', 'HEAD'].includes(req.method) && req.get('x-requested-with') !== 'alluplinks-admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = u; next();
  } catch { res.status(401).json({ error: 'Please sign in.' }); }
}
// Session probe for the admin UI: always 200 so signed-out visits don't log errors.
api.get('/admin/session', (req, res) => {
  try {
    const p = jwt.verify(req.cookies?.au_admin || '', JWT_SECRET);
    const u = db.prepare('SELECT id, email FROM admin_users WHERE id = ?').get(p.sub);
    res.json({ user: u || null });
  } catch { res.json({ user: null }); }
});
const admin = express.Router();
admin.use(requireAdmin);
admin.get('/me', (req, res) => res.json(req.admin));
admin.post('/password', (req, res) => {
  const u = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(String(req.body.current || ''), u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
  const next = String(req.body.next || '');
  if (next.length < 10) return res.status(400).json({ error: 'New password must be at least 10 characters.' });
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), u.id);
  const f = path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt'); if (fs.existsSync(f)) fs.rmSync(f);
  res.json({ ok: true });
});

admin.get('/stats', (_req, res) => {
  const now = torontoNow();
  const q = (sql, ...a) => db.prepare(sql).get(...a).n;
  res.json({
    bookings_today: q("SELECT COUNT(*) n FROM bookings WHERE date = ? AND status != 'cancelled'", now.date),
    bookings_upcoming: q("SELECT COUNT(*) n FROM bookings WHERE date >= ? AND status IN ('pending','confirmed')", now.date),
    bookings_pending: q("SELECT COUNT(*) n FROM bookings WHERE status = 'pending'"),
    tradeins_new: q("SELECT COUNT(*) n FROM tradeins WHERE status = 'new'"),
    inquiries_new: q("SELECT COUNT(*) n FROM inquiries WHERE status = 'new'"),
    reviews_pending: q('SELECT COUNT(*) n FROM reviews WHERE approved = 0'),
    models: q('SELECT COUNT(*) n FROM models'), price_points: q('SELECT COUNT(*) n FROM prices'),
    products: q('SELECT COUNT(*) n FROM products WHERE active = 1'),
    today: now.date,
    upcoming: db.prepare("SELECT * FROM bookings WHERE date >= ? AND status IN ('pending','confirmed') ORDER BY date, time LIMIT 8").all(now.date),
    notifications: db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 12').all(),
    unread: q('SELECT COUNT(*) n FROM notifications WHERE read = 0'),
    smtp: !!process.env.SMTP_HOST
  });
});
admin.post('/notifications/read', (_req, res) => { db.prepare('UPDATE notifications SET read = 1').run(); res.json({ ok: true }); });
admin.get('/email-log', (_req, res) => res.json(db.prepare('SELECT * FROM email_log ORDER BY id DESC LIMIT 100').all()));

// Generic CRUD for content tables. Only whitelisted columns are writable.
const TABLES = {
  categories: { cols: ['slug', 'name', 'device_type', 'image', 'blurb', 'sort', 'active'], order: 'sort, id' },
  brands: { cols: ['category_id', 'name', 'sort', 'active'], order: 'sort, id', filters: ['category_id'] },
  models: { cols: ['brand_id', 'name', 'sort', 'active'], order: 'sort, id', filters: ['brand_id'] },
  repair_types: { cols: ['device_type', 'key', 'name', 'time_estimate', 'diagnose_only', 'sort', 'active'], order: 'device_type, sort, id', filters: ['device_type'] },
  services: { cols: ['slug', 'name', 'short', 'description', 'benefits', 'image', 'image_alt', 'price_source', 'price_note', 'time_estimate', 'warranty', 'faqs', 'meta_title', 'meta_description', 'featured', 'sort', 'active'], json: ['benefits', 'price_source', 'faqs'], order: 'sort, id' },
  products: { cols: ['slug', 'name', 'category', 'brand', 'condition', 'price', 'compare_at', 'images', 'short', 'description', 'specs', 'featured', 'sort', 'active'], json: ['images', 'specs'], order: 'sort, id', filters: ['category'] },
  faqs: { cols: ['question', 'answer', 'page', 'sort', 'active'], order: 'page, sort, id' },
  reviews: { cols: ['name', 'rating', 'text', 'device', 'source', 'approved'], order: 'id DESC' },
  tradein_devices: { cols: ['device_type', 'brand', 'model', 'base_value', 'storages', 'sort', 'active'], json: ['storages'], order: 'device_type, brand, sort, id', filters: ['device_type', 'brand'] },
  blocked_dates: { cols: ['date', 'reason'], order: 'date' }
};
const REQUIRED = { categories: ['slug', 'name', 'device_type'], brands: ['category_id', 'name'], models: ['brand_id', 'name'], repair_types: ['device_type', 'key', 'name'],
  services: ['slug', 'name'], products: ['slug', 'name', 'category'], faqs: ['question', 'answer'], reviews: ['name', 'rating', 'text'],
  tradein_devices: ['device_type', 'brand', 'model', 'base_value'], blocked_dates: ['date'] };
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

admin.get('/t/:table', (req, res) => {
  const t = TABLES[req.params.table]; if (!t) return res.status(404).json({ error: 'Unknown table' });
  const where = [], args = [];
  for (const f of t.filters || []) if (req.query[f] != null && req.query[f] !== '') { where.push(`${f} = ?`); args.push(req.query[f]); }
  const rows = db.prepare(`SELECT * FROM ${req.params.table}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${t.order}`).all(...args);
  res.json(rows.map((r) => rowOut(req.params.table, r)));
});
admin.post('/t/:table', (req, res) => {
  const table = req.params.table; if (!TABLES[table]) return res.status(404).json({ error: 'Unknown table' });
  const row = rowIn(table, req.body || {});
  const missing = REQUIRED[table].filter((c) => row[c] == null || row[c] === '');
  if (missing.length) return res.status(422).json({ error: `Required: ${missing.join(', ')}` });
  try {
    const cols = Object.keys(row);
    const r = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c]));
    res.status(201).json(rowOut(table, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid)));
  } catch (e) { res.status(409).json({ error: /UNIQUE/.test(e.message) ? 'An item with that name or slug already exists.' : e.message }); }
});
admin.put('/t/:table/:id', (req, res) => {
  const table = req.params.table; if (!TABLES[table]) return res.status(404).json({ error: 'Unknown table' });
  const row = rowIn(table, req.body || {}); const cols = Object.keys(row);
  if (!cols.length) return res.status(400).json({ error: 'Nothing to update' });
  try {
    db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => row[c]), Number(req.params.id));
    res.json(rowOut(table, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(req.params.id))));
  } catch (e) { res.status(409).json({ error: /UNIQUE/.test(e.message) ? 'An item with that name or slug already exists.' : e.message }); }
});
admin.delete('/t/:table/:id', (req, res) => {
  if (!TABLES[req.params.table]) return res.status(404).json({ error: 'Unknown table' });
  db.prepare(`DELETE FROM ${req.params.table} WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

// Price grid for one device category.
admin.get('/prices', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(req.query.category_id));
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const repairTypes = db.prepare('SELECT * FROM repair_types WHERE device_type = ? ORDER BY sort, id').all(cat.device_type);
  const brands = db.prepare('SELECT * FROM brands WHERE category_id = ? ORDER BY sort, id').all(cat.id);
  const models = db.prepare(`SELECT m.* FROM models m JOIN brands b ON b.id = m.brand_id WHERE b.category_id = ? ORDER BY b.sort, m.sort, m.id`).all(cat.id);
  const prices = db.prepare(`SELECT p.* FROM prices p JOIN models m ON m.id = p.model_id JOIN brands b ON b.id = m.brand_id WHERE b.category_id = ?`).all(cat.id);
  res.json({ category: cat, repairTypes, brands, models, prices });
});
admin.put('/prices', (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  tx(() => {
    for (const it of items) {
      const mid = Number(it.model_id), rid = Number(it.repair_type_id);
      if (it.price === null || it.price === '' || it.price === undefined) db.prepare('DELETE FROM prices WHERE model_id = ? AND repair_type_id = ?').run(mid, rid);
      else {
        const p = Math.round(Number(it.price));
        if (!(p >= 0 && p < 100000)) throw Object.assign(new Error('Invalid price'), { status: 422 });
        db.prepare('INSERT INTO prices(model_id,repair_type_id,price) VALUES(?,?,?) ON CONFLICT(model_id,repair_type_id) DO UPDATE SET price = excluded.price').run(mid, rid, p);
      }
    }
  });
  res.json({ ok: true, updated: items.length });
});

// Bookings, trade-ins and inquiries.
const LISTS = {
  bookings: { search: ['ref', 'name', 'email', 'phone', 'model'], statuses: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'], order: 'date DESC, time DESC', editable: ['status', 'admin_notes', 'date', 'time'], json: ['repairs', 'photos'] },
  tradeins: { search: ['ref', 'name', 'email', 'phone', 'model'], statuses: ['new', 'contacted', 'offer_made', 'accepted', 'declined', 'completed'], order: 'id DESC', editable: ['status', 'admin_notes', 'offer_amount'], json: ['answers', 'photos'] },
  inquiries: { search: ['ref', 'name', 'email', 'phone', 'message'], statuses: ['new', 'replied', 'closed'], order: 'id DESC', editable: ['status', 'admin_notes'], json: ['photos'] }
};
for (const [name, cfg] of Object.entries(LISTS)) {
  admin.get(`/${name}`, (req, res) => {
    const where = [], args = [];
    if (req.query.status) { where.push('status = ?'); args.push(req.query.status); }
    if (name === 'bookings' && req.query.from) { where.push('date >= ?'); args.push(req.query.from); }
    if (name === 'bookings' && req.query.to) { where.push('date <= ?'); args.push(req.query.to); }
    if (req.query.q) { where.push('(' + cfg.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')'); for (const _ of cfg.search) args.push(`%${req.query.q}%`); }
    const rows = db.prepare(`SELECT * FROM ${name}${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${cfg.order} LIMIT 500`).all(...args);
    res.json({ statuses: cfg.statuses, rows: rows.map((r) => { const o = { ...r }; for (const c of cfg.json) o[c] = j(r[c], c === 'answers' ? {} : []); return o; }) });
  });
  admin.patch(`/${name}/:id`, (req, res) => {
    const id = Number(req.params.id);
    const cur = db.prepare(`SELECT * FROM ${name} WHERE id = ?`).get(id);
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const patch = {};
    for (const c of cfg.editable) if (c in req.body) patch[c] = req.body[c] === '' ? null : req.body[c];
    if (patch.status && !cfg.statuses.includes(patch.status)) return res.status(422).json({ error: 'Invalid status' });
    if (name === 'bookings' && (patch.date || patch.time)) {
      const date = patch.date || cur.date, time = patch.time || cur.time;
      const clash = db.prepare("SELECT COUNT(*) n FROM bookings WHERE date = ? AND time = ? AND id != ? AND status != 'cancelled'").get(date, time, id).n;
      if (clash >= getSetting('booking').capacity) return res.status(409).json({ error: 'That slot is already booked.' });
    }
    const cols = Object.keys(patch);
    if (cols.length) db.prepare(`UPDATE ${name} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => patch[c]), id);
    res.json({ ok: true });
  });
  admin.delete(`/${name}/:id`, (req, res) => { db.prepare(`DELETE FROM ${name} WHERE id = ?`).run(Number(req.params.id)); res.json({ ok: true }); });
}

const SETTING_KEYS = ['business', 'hours', 'content', 'pricing', 'warranty', 'booking', 'seo', 'tradein_config'];
admin.get('/settings', (_req, res) => res.json(Object.fromEntries(SETTING_KEYS.map((k) => [k, getSetting(k)]))));
admin.put('/settings/:key', (req, res) => {
  if (!SETTING_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown setting' });
  setSetting(req.params.key, req.body);
  res.json({ ok: true });
});

admin.post('/upload', uploader('public').single('file'), (req, res) => {
  if (!req.file) return res.status(422).json({ error: 'Upload a JPG, PNG or WebP image under 8 MB.' });
  res.status(201).json({ url: '/uploads/' + req.file.filename });
});
admin.get('/files/:folder/:name', (req, res) => {
  if (!['bookings', 'tradeins', 'inquiries'].includes(req.params.folder)) return res.status(404).end();
  const p = path.join(UPLOADS, req.params.folder, path.basename(req.params.name));
  if (!fs.existsSync(p)) return res.status(404).end();
  res.sendFile(p);
});

api.use('/admin', admin);
api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use('/api', api);

// ---------- static, SEO and SPA ----------
app.use('/uploads', express.static(path.join(UPLOADS, 'public'), { maxAge: '30d' }));
app.get('/robots.txt', (_req, res) => {
  const site = getSetting('business').site_url;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`);
});
app.get('/sitemap.xml', (_req, res) => res.type('application/xml').send(sitemapXml()));

if (fs.existsSync(DIST)) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(DIST, { index: false, maxAge: '7d' }));
  const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  app.get('/{*splat}', (req, res) => {
    const page = renderPage(req.path, template);
    res.status(page.status).type('html').send(page.html);
  });
}

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(413).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 8 MB.' : 'Too many photos (maximum 5).' });
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please call us at 905-535-9503.' });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`All Uplinks server on http://localhost:${PORT}`));
