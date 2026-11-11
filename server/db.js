// Database layer: schema, migrations and first-run seeding (Node built-in SQLite).
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { SERVICES, PRODUCTS, FAQS, CATEGORIES, REPAIR_TYPES, DEFAULT_SETTINGS, STORE_HOURS, BOOKING_WEEKLY } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'storage');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH || path.join(DATA_DIR, 'alluplinks.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, device_type TEXT NOT NULL,
  image TEXT, blurb TEXT, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS brands (
  id INTEGER PRIMARY KEY, category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1, UNIQUE(category_id, name));
CREATE TABLE IF NOT EXISTS models (
  id INTEGER PRIMARY KEY, brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1, UNIQUE(brand_id, name));
CREATE TABLE IF NOT EXISTS repair_types (
  id INTEGER PRIMARY KEY, device_type TEXT NOT NULL, key TEXT NOT NULL, name TEXT NOT NULL,
  time_estimate TEXT, diagnose_only INTEGER DEFAULT 0, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
  UNIQUE(device_type, key));
CREATE TABLE IF NOT EXISTS prices (
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  repair_type_id INTEGER NOT NULL REFERENCES repair_types(id) ON DELETE CASCADE,
  price INTEGER NOT NULL, PRIMARY KEY (model_id, repair_type_id));
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, short TEXT, description TEXT,
  benefits TEXT DEFAULT '[]', image TEXT, image_alt TEXT, price_source TEXT DEFAULT '{}',
  price_note TEXT, time_estimate TEXT, warranty TEXT, faqs TEXT DEFAULT '[]', meta_title TEXT,
  meta_description TEXT, featured INTEGER DEFAULT 0, sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE NOT NULL, category TEXT, brand TEXT, model TEXT,
  repairs TEXT DEFAULT '[]', est_low INTEGER, est_high INTEGER, needs_diagnosis INTEGER DEFAULT 0,
  date TEXT NOT NULL, time TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
  details TEXT, photos TEXT DEFAULT '[]', status TEXT DEFAULT 'pending', admin_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS bookings_slot ON bookings(date, time, status);
CREATE TABLE IF NOT EXISTS blocked_dates (id INTEGER PRIMARY KEY, date TEXT UNIQUE NOT NULL, reason TEXT);
CREATE TABLE IF NOT EXISTS tradein_devices (
  id INTEGER PRIMARY KEY, device_type TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL,
  base_value INTEGER NOT NULL, storages TEXT DEFAULT '[]', sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
  UNIQUE(device_type, brand, model));
CREATE TABLE IF NOT EXISTS tradeins (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE NOT NULL, device_type TEXT, brand TEXT, model TEXT, storage TEXT,
  answers TEXT DEFAULT '{}', est_low INTEGER, est_high INTEGER, est_credit INTEGER,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, notes TEXT, photos TEXT DEFAULT '[]',
  status TEXT DEFAULT 'new', offer_amount INTEGER, admin_notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL,
  brand TEXT, condition TEXT DEFAULT 'new', price REAL, compare_at REAL, images TEXT DEFAULT '[]',
  short TEXT, description TEXT, specs TEXT DEFAULT '[]', featured INTEGER DEFAULT 0, sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE NOT NULL, topic TEXT, name TEXT NOT NULL, email TEXT, phone TEXT,
  message TEXT NOT NULL, product TEXT, photos TEXT DEFAULT '[]', status TEXT DEFAULT 'new',
  admin_notes TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, page TEXT DEFAULT 'general',
  sort INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL, device TEXT, source TEXT DEFAULT 'website', approved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, kind TEXT, title TEXT, body TEXT, link TEXT, read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY, recipient TEXT, subject TEXT, status TEXT, error TEXT,
  created_at TEXT DEFAULT (datetime('now')));
`);

export const j = (s, fallback) => { try { return s == null ? fallback : JSON.parse(s); } catch { return fallback; } };

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? j(row.value, null) : DEFAULT_SETTINGS[key] ?? null;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

function seedIfEmpty() {
  const has = db.prepare('SELECT COUNT(*) n FROM categories').get().n;
  if (has) return;
  const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'repair-prices.json'), 'utf8'));
  const trade = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tradein.json'), 'utf8'));
  tx(() => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) setSetting(k, v);
    setSetting('tradein_config', {
      creditBonus: trade.creditBonus, rangeLow: trade.rangeLow, storageBonus: trade.storageBonus,
      condition: trade.condition, noPenalty: trade.noPenalty,
      battery: { '85plus': 1, '80to84': 0.95, below80: 0.9, unknown: 0.95 }
    });

    const insRT = db.prepare('INSERT INTO repair_types(device_type,key,name,time_estimate,diagnose_only,sort) VALUES(?,?,?,?,?,?)');
    const rtId = {};
    for (const [dt, list] of Object.entries(REPAIR_TYPES)) list.forEach(([key, name, time, diag], i) => {
      rtId[dt + ':' + key] = Number(insRT.run(dt, key, name, time || null, diag ? 1 : 0, i).lastInsertRowid);
    });

    const insCat = db.prepare('INSERT INTO categories(slug,name,device_type,image,blurb,sort) VALUES(?,?,?,?,?,?)');
    const insBrand = db.prepare('INSERT INTO brands(category_id,name,sort) VALUES(?,?,?)');
    const insModel = db.prepare('INSERT INTO models(brand_id,name,sort) VALUES(?,?,?)');
    const insPrice = db.prepare('INSERT INTO prices(model_id,repair_type_id,price) VALUES(?,?,?)');
    CATEGORIES.forEach((c, ci) => {
      const catId = Number(insCat.run(c.slug, c.name, c.device_type, c.image, c.blurb, ci).lastInsertRowid);
      c.brands.forEach(([brandName, srcType, srcBrand], bi) => {
        const bId = Number(insBrand.run(catId, brandName, bi).lastInsertRowid);
        const models = (srcType && prices[srcType] && prices[srcType][srcBrand]) || {};
        Object.entries(models).forEach(([m, reps], mi) => {
          const mId = Number(insModel.run(bId, m, mi).lastInsertRowid);
          for (const [rk, p] of Object.entries(reps)) {
            const id = rtId[c.device_type + ':' + rk];
            if (id) insPrice.run(mId, id, p);
          }
        });
      });
    });

    const insTD = db.prepare('INSERT INTO tradein_devices(device_type,brand,model,base_value,storages,sort) VALUES(?,?,?,?,?,?)');
    for (const [dt, brands] of Object.entries(trade.devices)) for (const [b, models] of Object.entries(brands)) {
      Object.entries(models).forEach(([m, [val, st]], i) => insTD.run(dt, b, m, val, JSON.stringify(st), i));
    }

    const insSvc = db.prepare(`INSERT INTO services(slug,name,short,description,benefits,image,image_alt,price_source,price_note,
      time_estimate,warranty,faqs,meta_title,meta_description,featured,sort) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    SERVICES.forEach((s, i) => insSvc.run(s.slug, s.name, s.short, s.description, JSON.stringify(s.benefits), s.image,
      s.image_alt, JSON.stringify(s.price_source || {}), s.price_note || null, s.time_estimate || null, s.warranty || null,
      JSON.stringify(s.faqs || []), s.meta_title, s.meta_description, s.featured ? 1 : 0, i));

    const insProd = db.prepare(`INSERT INTO products(slug,name,category,brand,condition,price,images,short,description,specs,featured,sort)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
    PRODUCTS.forEach((p, i) => insProd.run(p.slug, p.name, p.category, p.brand, p.condition, p.price ?? null,
      JSON.stringify(p.images), p.short, p.description, JSON.stringify(p.specs), p.featured ? 1 : 0, i));

    const insFaq = db.prepare('INSERT INTO faqs(question,answer,page,sort) VALUES(?,?,?,?)');
    FAQS.forEach((f, i) => insFaq.run(f.q, f.a, f.page || 'general', i));
  });
  console.log('[db] Seeded catalogue, prices, services, products and FAQs.');
}

function ensureAdmin() {
  const n = db.prepare('SELECT COUNT(*) n FROM admin_users').get().n;
  if (n) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@alluplinks.com').toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = crypto.randomBytes(9).toString('base64url');
    const file = path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt');
    fs.writeFileSync(file, `Admin login\nEmail: ${email}\nPassword: ${password}\n\nChange it after first login, then delete this file.\n`, { mode: 0o600 });
    console.log(`[db] Created admin ${email}. Initial password written to ${file}`);
  }
  db.prepare('INSERT INTO admin_users(email,password_hash) VALUES(?,?)').run(email, bcrypt.hashSync(password, 12));
}

// One-time data updates for databases created by an earlier version. Each runs once, in order,
// so later edits made in the admin dashboard are never overwritten.
const MIGRATIONS = [
  () => { // 2026-11: owner-confirmed store hours, booking windows and Google review link.
    setSetting('hours', STORE_HOURS);
    const b = getSetting('booking');
    setSetting('booking', { ...b, slot_minutes: 30, days_ahead: 14, min_lead_minutes: 30, weekly: BOOKING_WEEKLY });
    const biz = getSetting('business');
    if (!biz.google_review_url) setSetting('business', { ...biz, google_review_url: DEFAULT_SETTINGS.business.google_review_url });
  }
];
function migrate(freshDb) {
  const done = getSetting('schema_version') || 0;
  if (freshDb) return setSetting('schema_version', MIGRATIONS.length);
  for (let i = done; i < MIGRATIONS.length; i++) tx(() => { MIGRATIONS[i](); setSetting('schema_version', i + 1); });
}

const freshDb = !db.prepare('SELECT COUNT(*) n FROM categories').get().n;
seedIfEmpty();
migrate(freshDb);
ensureAdmin();
