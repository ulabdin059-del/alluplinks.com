// Database layer on libSQL: a Turso cloud database in production (TURSO_DATABASE_URL), or a local
// SQLite file in development and tests. Same SQL and the same code path in both cases.
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { SERVICES, PRODUCTS, FAQS, CATEGORIES, REPAIR_TYPES, DEFAULT_SETTINGS, STORE_HOURS, BOOKING_WEEKLY } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'storage');
fs.mkdirSync(DATA_DIR, { recursive: true });

const remoteUrl = process.env.TURSO_DATABASE_URL;
export const DB_KIND = remoteUrl ? 'turso' : 'local';
export const client = createClient(remoteUrl
  ? { url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN }
  : { url: 'file:' + (process.env.DB_PATH || path.join(DATA_DIR, 'alluplinks.db')) });

const norm = (args) => args.map((a) => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a));
const plain = (rs) => rs.rows.map((r) => ({ ...r }));

// Small async query helpers used throughout the server.
export const db = {
  all: async (sql, ...args) => plain(await client.execute({ sql, args: norm(args) })),
  get: async (sql, ...args) => plain(await client.execute({ sql, args: norm(args) }))[0],
  run: async (sql, ...args) => {
    const r = await client.execute({ sql, args: norm(args) });
    return { lastInsertRowid: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid), changes: r.rowsAffected };
  },
  // Runs all statements atomically (all succeed or none do) in one round trip. stmts: [[sql, ...args], ...]
  batch: async (stmts) => { if (stmts.length) await client.batch(stmts.map(([sql, ...args]) => ({ sql, args: norm(args) })), 'write'); }
};

// Serialises critical sections (e.g. "check slot is free, then insert booking") within this server.
let chain = Promise.resolve();
export function exclusive(fn) {
  const run = chain.then(() => fn());
  chain = run.catch(() => {});
  return run;
}

export const j = (s, fallback) => { try { return s == null ? fallback : JSON.parse(s); } catch { return fallback; } };

// Settings are read on almost every request, so they are cached in memory and written through.
const settingsCache = new Map();
export function getSetting(key) {
  return settingsCache.has(key) ? settingsCache.get(key) : DEFAULT_SETTINGS[key] ?? null;
}
export async function setSetting(key, value) {
  await db.run('INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value));
  settingsCache.set(key, value);
}
async function loadSettings() {
  settingsCache.clear();
  for (const r of await db.all('SELECT key, value FROM settings')) settingsCache.set(r.key, j(r.value, null));
}

export const TABLE_NAMES = ['settings', 'admin_users', 'categories', 'brands', 'models', 'repair_types', 'prices', 'services', 'bookings', 'blocked_dates',
  'tradein_devices', 'tradeins', 'products', 'inquiries', 'faqs', 'reviews', 'notifications', 'email_log'];

const SCHEMA = `
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
  price INTEGER NOT NULL, price_high INTEGER, PRIMARY KEY (model_id, repair_type_id));
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
  link TEXT, review_date TEXT, sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY, kind TEXT, title TEXT, body TEXT, link TEXT, read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY, recipient TEXT, subject TEXT, status TEXT, error TEXT,
  created_at TEXT DEFAULT (datetime('now')));
`;

// First-run seed. All rows are inserted with explicit ids in batched, atomic round trips so a remote
// database is seeded in seconds; a "seed_complete" marker is written last.
async function seedIfEmpty() {
  const done = await db.get("SELECT 1 x FROM settings WHERE key = 'seed_complete'");
  const hasData = (await db.get('SELECT COUNT(*) n FROM categories')).n > 0;
  if (done || hasData) return false; // existing databases (including ones created before the marker existed) are never re-seeded
  const prices = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'repair-prices.json'), 'utf8'));
  const trade = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tradein.json'), 'utf8'));
  const S = [];
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) S.push(['INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', k, JSON.stringify(v)]);
  S.push(['INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', 'tradein_config', JSON.stringify({
    creditBonus: trade.creditBonus, rangeLow: trade.rangeLow, storageBonus: trade.storageBonus,
    condition: trade.condition, noPenalty: trade.noPenalty,
    battery: { '85plus': 1, '80to84': 0.95, below80: 0.9, unknown: 0.95 }
  })]);

  let rtSeq = 0; const rtId = {};
  for (const [dt, list] of Object.entries(REPAIR_TYPES)) list.forEach(([key, name, time, diag], i) => {
    rtId[dt + ':' + key] = ++rtSeq;
    S.push(['INSERT INTO repair_types(id,device_type,key,name,time_estimate,diagnose_only,sort) VALUES(?,?,?,?,?,?,?)', rtSeq, dt, key, name, time || null, diag ? 1 : 0, i]);
  });
  let bSeq = 0, mSeq = 0;
  CATEGORIES.forEach((c, ci) => {
    const catId = ci + 1;
    S.push(['INSERT INTO categories(id,slug,name,device_type,image,blurb,sort) VALUES(?,?,?,?,?,?,?)', catId, c.slug, c.name, c.device_type, c.image, c.blurb, ci]);
    c.brands.forEach(([brandName, srcType, srcBrand], bi) => {
      const bId = ++bSeq;
      S.push(['INSERT INTO brands(id,category_id,name,sort) VALUES(?,?,?,?)', bId, catId, brandName, bi]);
      const models = (srcType && prices[srcType] && prices[srcType][srcBrand]) || {};
      Object.entries(models).forEach(([m, reps], mi) => {
        const mId = ++mSeq;
        S.push(['INSERT INTO models(id,brand_id,name,sort) VALUES(?,?,?,?)', mId, bId, m, mi]);
        for (const [rk, p] of Object.entries(reps)) {
          const id = rtId[c.device_type + ':' + rk];
          if (id) S.push(['INSERT INTO prices(model_id,repair_type_id,price) VALUES(?,?,?)', mId, id, p]);
        }
      });
    });
  });
  let tSeq = 0;
  for (const [dt, brands] of Object.entries(trade.devices)) for (const [b, models] of Object.entries(brands)) {
    Object.entries(models).forEach(([m, [val, st]], i) => S.push(['INSERT INTO tradein_devices(id,device_type,brand,model,base_value,storages,sort) VALUES(?,?,?,?,?,?,?)', ++tSeq, dt, b, m, val, JSON.stringify(st), i]));
  }
  SERVICES.forEach((s, i) => S.push([`INSERT INTO services(id,slug,name,short,description,benefits,image,image_alt,price_source,price_note,
    time_estimate,warranty,faqs,meta_title,meta_description,featured,sort) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, i + 1, s.slug, s.name, s.short, s.description,
    JSON.stringify(s.benefits), s.image, s.image_alt, JSON.stringify(s.price_source || {}), s.price_note || null, s.time_estimate || null, s.warranty || null,
    JSON.stringify(s.faqs || []), s.meta_title, s.meta_description, s.featured ? 1 : 0, i]));
  PRODUCTS.forEach((p, i) => S.push([`INSERT INTO products(id,slug,name,category,brand,condition,price,images,short,description,specs,featured,sort)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`, i + 1, p.slug, p.name, p.category, p.brand, p.condition, p.price ?? null, JSON.stringify(p.images), p.short, p.description,
    JSON.stringify(p.specs), p.featured ? 1 : 0, i]));
  FAQS.forEach((f, i) => S.push(['INSERT INTO faqs(id,question,answer,page,sort) VALUES(?,?,?,?,?)', i + 1, f.q, f.a, f.page || 'general', i]));
  S.push(['INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', 'schema_version', JSON.stringify(MIGRATIONS.length)]);
  S.push(['INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)', 'seed_complete', 'true']);
  await db.batch(S);
  console.log(`[db] Seeded ${DB_KIND} database: catalogue, prices, services, products and FAQs.`);
  return true;
}

// One-time data updates for databases created by an earlier version. Each runs once, in order,
// so later edits made in the admin dashboard are never overwritten.
const OLD_HERO = {
  hero_eyebrow: 'Keswick · Georgina · York Region',
  hero_title: 'Professional Phone Repair in Keswick, Ontario',
  hero_subtitle: 'Cracked screen, tired battery or a phone that won’t charge? All Uplinks repairs iPhone, Samsung, Google Pixel, iPad, laptops and game consoles at our Queensway South store — with clear prices before any work begins.'
};
const MIGRATIONS = [
  async () => { // 2026-11: owner-confirmed store hours, booking windows and Google review link.
    await setSetting('hours', STORE_HOURS);
    const b = getSetting('booking');
    await setSetting('booking', { ...b, slot_minutes: 30, days_ahead: 14, min_lead_minutes: 30, weekly: BOOKING_WEEKLY });
    const biz = getSetting('business');
    if (!biz.google_review_url) await setSetting('business', { ...biz, google_review_url: DEFAULT_SETTINGS.business.google_review_url });
  },
  async () => { // 2026-11: new hero copy — only replaces text that still matches the previous defaults.
    const c = { ...getSetting('content') };
    for (const [k, old] of Object.entries(OLD_HERO)) if (c[k] === old) c[k] = DEFAULT_SETTINGS.content[k];
    if (!c.announcement_short) c.announcement_short = DEFAULT_SETTINGS.content.announcement_short;
    await setSetting('content', c);
  }
];
async function migrate() {
  const done = getSetting('schema_version') || 0;
  for (let i = done; i < MIGRATIONS.length; i++) { await MIGRATIONS[i](); await setSetting('schema_version', i + 1); }
  if (!getSetting('seed_complete')) await setSetting('seed_complete', true);
}

// One-time price-list updates from the owner. Unlike MIGRATIONS these also run on brand-new databases
// (after the seed), so every database ends up with the same prices. Tracked by the "data_version" setting.
const DATA_UPDATES = [
  async () => { // 2026-11: owner's iPhone rate list (server/data/iphone-prices-owner-2026-11.json)
    const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'iphone-prices-owner-2026-11.json'), 'utf8'));
    const brand = await db.get("SELECT b.id FROM brands b JOIN categories c ON c.id = b.category_id WHERE c.slug = 'iphone' AND b.name = 'Apple'");
    if (!brand) return;
    const S = [];
    // New models: iPhone 18 directly after iPhone 18 Pro; iPhone 7 and 6 at the end.
    let models = await db.all('SELECT id, name, sort FROM models WHERE brand_id = ? ORDER BY sort, id', brand.id);
    const have = new Set(models.map((m) => m.name));
    let maxSort = Math.max(0, ...models.map((m) => m.sort));
    for (const [name, where, ref] of list.newModels) {
      if (have.has(name)) continue;
      if (where === 'after') {
        const r = models.find((m) => m.name === ref);
        const at = r ? r.sort + 1 : ++maxSort;
        await db.run('UPDATE models SET sort = sort + 1 WHERE brand_id = ? AND sort >= ?', brand.id, at);
        await db.run('INSERT INTO models(brand_id, name, sort) VALUES(?,?,?)', brand.id, name, at);
        maxSort++;
      } else await db.run('INSERT INTO models(brand_id, name, sort) VALUES(?,?,?)', brand.id, name, ++maxSort);
      models = await db.all('SELECT id, name, sort FROM models WHERE brand_id = ? ORDER BY sort, id', brand.id);
    }
    const rt = Object.fromEntries((await db.all("SELECT id, key FROM repair_types WHERE device_type = 'Phone'")).map((r) => [r.key, r.id]));
    const upsert = (mid, key, lo, hi) => S.push(['INSERT INTO prices(model_id,repair_type_id,price,price_high) VALUES(?,?,?,?) ON CONFLICT(model_id,repair_type_id) DO UPDATE SET price = excluded.price, price_high = excluded.price_high', mid, rt[key], lo, hi]);
    for (const m of models) {
      const screen = list.screen[m.name];
      if (screen) upsert(m.id, 'screen', screen[0], screen[1]);
      else S.push(['DELETE FROM prices WHERE model_id = ? AND repair_type_id = ?', m.id, rt.screen]); // "Quote in store"
      for (const [key, [lo, hi]] of Object.entries(list.allModels)) upsert(m.id, key, lo, hi);
    }
    // Ranges are now set per repair, so the "up to $60" wording no longer fits (only replaced if still the old default).
    const pricing = getSetting('pricing');
    if (pricing?.note === 'Final price can vary by up to $60 depending on part availability, part quality and device condition. We always confirm the price with you before any work begins.') await setSetting('pricing', { ...pricing, note: 'Final price depends on part availability, part quality and device condition. We always confirm the price with you before any work begins.' });
    // The range now starts at iPhone 6: update the wording that said "iPhone 8 to …".
    S.push(["UPDATE categories SET blurb = REPLACE(blurb, 'iPhone 8 to', 'iPhone 6 to') WHERE slug = 'iphone'"]);
    S.push(["UPDATE services SET benefits = REPLACE(benefits, 'iPhone 8 to', 'iPhone 6 to'), meta_description = REPLACE(meta_description, 'iPhone 8 to', 'iPhone 6 to') WHERE slug = 'iphone-screen-replacement'"]);
    await db.batch(S);
  }
];
async function applyDataUpdates() {
  const done = getSetting('data_version') || 0;
  for (let i = done; i < DATA_UPDATES.length; i++) { await DATA_UPDATES[i](); await setSetting('data_version', i + 1); }
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@alluplinks.com').toLowerCase();
  const n = (await db.get('SELECT COUNT(*) n FROM admin_users')).n;
  // ADMIN_RESET_PASSWORD=true resets that admin's password to ADMIN_PASSWORD on start (for lost passwords).
  if (n && process.env.ADMIN_RESET_PASSWORD === 'true' && process.env.ADMIN_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12);
    const r = await db.run('UPDATE admin_users SET password_hash = ? WHERE email = ?', hash, email);
    if (!r.changes) await db.run('INSERT INTO admin_users(email,password_hash) VALUES(?,?)', email, hash);
    console.log(`[db] Admin password reset for ${email}. Remove ADMIN_RESET_PASSWORD now.`);
    return;
  }
  if (n) return;
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (DB_KIND === 'turso') {
      console.error('[db] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.');
      return;
    }
    password = crypto.randomBytes(9).toString('base64url');
    const file = path.join(DATA_DIR, 'INITIAL_ADMIN_PASSWORD.txt');
    fs.writeFileSync(file, `Admin login\nEmail: ${email}\nPassword: ${password}\n\nChange it after first login, then delete this file.\n`, { mode: 0o600 });
    console.log(`[db] Created admin ${email}. Initial password written to ${file}`);
  } else console.log(`[db] Created admin ${email}.`);
  await db.run('INSERT INTO admin_users(email,password_hash) VALUES(?,?)', email, bcrypt.hashSync(password, 12));
}

// Full JSON backup of every table (used by Admin → Settings → Download backup and scripts/import-backup.mjs).
export async function exportAll() {
  const out = { format: 'alluplinks-backup', version: 1, exported_at: new Date().toISOString(), tables: {} };
  for (const t of TABLE_NAMES) out.tables[t] = await db.all(`SELECT * FROM ${t}`);
  return out;
}
// Replaces all data with a backup. Runs as atomic batches; tables are cleared children-first.
export async function importAll(backup) {
  if (backup?.format !== 'alluplinks-backup') throw new Error('Not an All Uplinks backup file');
  const order = TABLE_NAMES;
  const S = [...order].reverse().map((t) => [`DELETE FROM ${t}`]);
  for (const t of order) for (const row of backup.tables[t] || []) {
    const cols = Object.keys(row);
    S.push([`INSERT INTO ${t}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`, ...cols.map((c) => row[c])]);
  }
  await db.batch(S);
  await loadSettings();
}

// Adds columns introduced after a database was created (SQLite ALTER TABLE only adds; nothing is removed).
const ADDED_COLUMNS = { reviews: [['link', 'TEXT'], ['review_date', 'TEXT'], ['sort', 'INTEGER DEFAULT 0']], prices: [['price_high', 'INTEGER']] };
async function addMissingColumns() {
  for (const [table, cols] of Object.entries(ADDED_COLUMNS)) {
    const have = new Set((await db.all(`PRAGMA table_info(${table})`)).map((c) => c.name));
    for (const [name, type] of cols) if (!have.has(name)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }
}

export const ready = (async () => {
  if (DB_KIND === 'local') await client.execute('PRAGMA journal_mode = WAL').catch(() => {});
  await client.executeMultiple(SCHEMA);
  await addMissingColumns();
  await loadSettings();
  const seeded = await seedIfEmpty();
  if (seeded) await loadSettings();
  else await migrate();
  await applyDataUpdates();
  await ensureAdmin();
  console.log(`[db] Ready (${DB_KIND}).`);
})();
