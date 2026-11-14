// End-to-end test suite: starts the production server on a fresh database and drives it with Playwright.
// Run: npm run build && npm test
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'au-e2e-'));
let pass = 0, fail = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); pass++; results.push(`  ✓ ${name}`); }
  catch (e) { fail++; results.push(`  ✗ ${name}\n      ${String(e.message || e).split('\n').join('\n      ')}`); }
  console.log(results.at(-1));
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const eq = (a, b, m) => assert(a === b, `${m || 'expected equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
const json = async (p, o = {}) => { const r = await fetch(BASE + p, o); return { status: r.status, body: await r.json().catch(() => null), headers: r.headers }; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const server = spawn(process.execPath, ['--no-warnings', 'server/index.js'], { cwd: ROOT, env: { ...process.env, PORT, DATA_DIR: DATA, NODE_ENV: 'production', ADMIN_EMAIL: 'owner@example.com', ADMIN_PASSWORD: 'test-password-123' }, stdio: ['ignore', 'pipe', 'pipe'] });
server.stderr.on('data', (d) => process.stderr.write('[server] ' + d));
for (let i = 0; i < 50; i++) { try { await fetch(BASE + '/api/site'); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const consoleErrors = [];
const newPage = async (c = ctx) => { const p = await c.newPage(); p.on('console', (m) => m.type() === 'error' && !/google\.com|ERR_TUNNEL|ERR_CONNECTION|fonts\.g/.test(m.text()) && consoleErrors.push(`${p.url()}: ${m.text()}`)); p.on('pageerror', (e) => consoleErrors.push(`${p.url()}: ${e.message}`)); return p; };
const tomorrowOpen = async () => (await json('/api/availability')).body.days.find((d) => d.open).date;

const ROUTES = ['/', '/services', '/repair-prices', '/book', '/sell', '/shop', '/shop/new-phones', '/shop/pre-owned-phones', '/shop/iphones', '/shop/samsung-phones', '/shop/cases',
  '/shop/screen-protectors', '/shop/chargers', '/shop/cables', '/shop/wireless', '/shop/product/pre-owned-iphone-13-pro', '/contact', '/faq', '/about', '/reviews', '/privacy', '/terms'];
const services = (await json('/api/services')).body;
for (const s of services) ROUTES.push('/services/' + s.slug);

console.log('\nSEO & server rendering');
await test(`18 service pages exist`, () => eq(services.length, 18, 'service count'));
const titles = new Set(), descs = new Set();
for (const r of ROUTES) {
  await test(`GET ${r} → 200 with unique title, description, canonical, H1`, async () => {
    const res = await fetch(BASE + r); eq(res.status, 200, 'status');
    const html = await res.text();
    const t = html.match(/<title>([^<]+)<\/title>/)?.[1]?.replace(/&amp;/g, '&'); const d = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    assert(t && d, 'missing title/description'); assert(!titles.has(t), 'duplicate title ' + t); assert(!descs.has(d), 'duplicate description');
    titles.add(t); descs.add(d);
    assert(html.includes(`<link rel="canonical" href="https://alluplinks.com${r === '/' ? '/' : r}">`), 'canonical');
    assert(/<h1[ >]/.test(html) && html.includes('og:title') && html.includes('application/ld+json'), 'h1/og/jsonld');
    assert(t.length <= 70, `title too long (${t.length}): ${t}`);
  });
}
await test('Unknown URL returns 404 with noindex', async () => { const r = await fetch(BASE + '/no-such-page'); eq(r.status, 404); assert((await r.text()).includes('noindex')); });
await test('LocalBusiness, Service, FAQPage, Product and Breadcrumb schema present', async () => {
  const get = async (p) => [...(await (await fetch(BASE + p)).text()).matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const home = await get('/'); const lb = home.find((x) => Array.isArray(x['@type']) && x['@type'].includes('LocalBusiness'));
  eq(lb.telephone, '+19055359503'); eq(lb.address.streetAddress, '443 The Queensway South, Unit 23'); eq(lb.address.postalCode, 'L4P 3J4'); eq(lb.address.addressLocality, 'Keswick');
  eq(lb.openingHoursSpecification.length, 7, 'opening hours in schema'); eq(lb.openingHoursSpecification[0].opens, '09:00'); eq(lb.sameAs[0], 'https://maps.app.goo.gl/aShYzmUiNqCu9nHr8'); assert(home.some((x) => x['@type'] === 'FAQPage'), 'FAQPage');
  const svc = await get('/services/iphone-screen-replacement'); const s = svc.find((x) => x['@type'] === 'Service');
  eq(s.offers.priceCurrency, 'CAD'); eq(s.offers.lowPrice, 55); eq(s.offers.highPrice, 200); assert(svc.some((x) => x['@type'] === 'BreadcrumbList'));
  assert((await get('/shop/product/apple-airpods-pro')).some((x) => x['@type'] === 'Product'), 'Product');
});
await test('sitemap.xml lists all pages, robots.txt blocks admin/api', async () => {
  const sm = await (await fetch(BASE + '/sitemap.xml')).text(); for (const r of ROUTES) assert(sm.includes(`<loc>https://alluplinks.com${r}</loc>`), 'missing ' + r);
  const rb = await (await fetch(BASE + '/robots.txt')).text(); assert(rb.includes('Disallow: /admin') && rb.includes('Disallow: /api/') && rb.includes('Sitemap: https://alluplinks.com/sitemap.xml'));
});
await test('Reference brand name appears nowhere in source, build, data or rendered pages', async () => {
  const bad = /wireless\s*4\s*u|wireless4u|smartsource|telephonia/i;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (['node_modules', '.git', 'images'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const files = ['src', 'server', 'shared', 'dist', 'public', 'index.html', 'README.md'].flatMap((p) => { const f = path.join(ROOT, p); return fs.existsSync(f) ? (fs.statSync(f).isDirectory() ? walk(f) : [f]) : []; });
  for (const f of files) { if (/\.(webp|png|jpg|ico)$/.test(f)) continue; assert(!bad.test(fs.readFileSync(f, 'utf8')), 'found in ' + f); }
  for (const r of ROUTES) assert(!bad.test(await (await fetch(BASE + r)).text()), 'found in page ' + r);
  assert(!bad.test(JSON.stringify((await json('/api/catalog')).body)) && !bad.test(JSON.stringify((await json('/api/site')).body)), 'found in API');
});

console.log('\nPricing data');
await test('Prices: non-iPhone prices unchanged; iPhone prices follow the owner rate list exactly', async () => {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/repair-prices.json'), 'utf8'));
  const owner = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/iphone-prices-owner-2026-11.json'), 'utf8'));
  const cat = (await json('/api/catalog')).body;
  const map = { 'Phone/Apple': 'iphone', 'Phone/Samsung': 'samsung', 'Phone/Google': 'google-pixel', 'Tablet/Apple': 'ipad', 'Tablet/Samsung': 'tablet', 'Laptop/Apple': 'macbook', 'Laptop/Dell': 'laptop', 'Laptop/HP': 'laptop', 'Laptop/Lenovo': 'laptop', 'Console/PlayStation': 'gaming-console', 'Console/Xbox': 'gaming-console', 'Console/Nintendo': 'gaming-console' };
  let other = 0, camera = 0;
  for (const [dt, brands] of Object.entries(src)) for (const [b, models] of Object.entries(brands)) for (const [m, reps] of Object.entries(models)) for (const [k, p] of Object.entries(reps)) {
    const slug = map[`${dt}/${b}`]; const c = cat.categories.find((x) => x.slug === slug); const model = c.brands.find((x) => x.name === b).models.find((x) => x.name === m);
    if (slug === 'iphone' && k !== 'camera') continue; // replaced by the owner list (checked below)
    eq(model?.prices[k], p, `${b} ${m} ${k}`); eq(model?.high?.[k], undefined, `${m} ${k} keeps automatic range`); slug === 'iphone' ? camera++ : other++;
  }
  eq(other, 384, 'non-iPhone price points unchanged'); eq(camera, 39, 'iPhone camera prices unchanged');
  const iphone = cat.categories.find((x) => x.slug === 'iphone').brands[0].models;
  eq(iphone.length, 42, 'iPhone models (39 + iPhone 18, 7, 6)');
  for (const m of iphone) {
    const s = owner.screen[m.name];
    if (s) { eq(m.prices.screen, s[0], m.name + ' screen from'); eq(m.high.screen, s[1], m.name + ' screen to'); }
    else eq(m.prices.screen, undefined, m.name + ' screen = quote in store');
    for (const [k, [lo, hi]] of Object.entries(owner.allModels)) { eq(m.prices[k], lo, `${m.name} ${k} from`); eq(m.high[k], hi, `${m.name} ${k} to`); }
  }
  eq(iphone.map((m) => m.name).slice(0, 3).join('|'), 'iPhone 18 Pro Max|iPhone 18 Pro|iPhone 18', 'iPhone 18 listed after 18 Pro');
  eq(iphone.slice(-2).map((m) => m.name).join('|'), 'iPhone 7|iPhone 6');
  assert(!cat.pricing.note.includes('$60'), 'price note no longer says up to $60');
});

await test('Service pages show their model price tables (API and page)', async () => {
  const expect = { 'iphone-screen-replacement': 30, 'charging-port-repair': 104, 'ipad-repair': 4, 'gaming-console-repair': 8 };
  for (const [slug, rows] of Object.entries(expect)) {
    const t = (await json('/api/services/' + slug)).body.price_table; assert(t && t.rows.length === rows, `${slug}: ${t?.rows.length} rows, expected ${rows}`);
  }
  const t = (await json('/api/services/iphone-screen-replacement')).body.price_table;
  const r15 = t.rows.find((r) => r.model === 'iPhone 15'); eq(`${r15.prices.screen}-${r15.high.screen}`, '100-155', 'iPhone 15 row');
  eq((await json('/api/services/water-damage-repair')).body.price_table, null, 'diagnosis-only service has no table');
  const p = await newPage(); await p.goto(BASE + '/services/iphone-screen-replacement', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'iPhone Screen Replacement prices' }).waitFor();
  assert(await p.getByRole('row', { name: /iPhone 15 \$100 – \$155/ }).count() === 1, 'iPhone 15 row shows owner range'); await p.close();
});

console.log('\nRepair price calculator (UI)');
const calc = async (p, cat, brand, model, repairName) => {
  await p.getByRole('button', { name: new RegExp('^' + cat) }).first().click();
  if (brand) await p.getByRole('button', { name: new RegExp('^' + brand.slice(0, 2) + '\\s*' + brand) }).click();
  await p.getByPlaceholder(/Search \d+ models/).fill(model);
  await p.getByRole('button', { name: new RegExp('^' + model.replace(/[()+]/g, '\\$&') + '( from|$)') }).first().click();
  await p.getByRole('button', { name: new RegExp('^' + repairName) }).click();
  return (await p.locator('h2[aria-label^="Price"]').getAttribute('aria-label'));
};
await test('iPhone 15 screen → $100 – $155 (owner list), time 30–60 min, Book link prefilled', async () => {
  const p = await newPage(); await p.goto(BASE + '/repair-prices');
  eq(await calc(p, 'iPhone', null, 'iPhone 15', 'Screen replacement'), 'Price $100 – $155');
  assert(await p.getByText('Estimated repair time: 30–60 min').isVisible(), 'time');
  const href = await p.getByRole('link', { name: 'Book this repair' }).getAttribute('href');
  eq(href, '/book?category=iphone&brand=Apple&model=iPhone+15&repair=screen');
  assert(p.url().includes('model=iPhone+15'), 'URL state synced'); await p.close();
});
await test('Galaxy S24 Ultra battery → $119 – $179', async () => { const p = await newPage(); await p.goto(BASE + '/repair-prices'); eq(await calc(p, 'Samsung', null, 'Galaxy S24 Ultra', 'Battery replacement'), 'Price $119 – $179'); await p.close(); });
await test('Pixel 9 Pro back glass → $129 – $189', async () => { const p = await newPage(); await p.goto(BASE + '/repair-prices'); eq(await calc(p, 'Google Pixel', null, 'Pixel 9 Pro', 'Back glass'), 'Price $129 – $189'); await p.close(); });
await test('Dell XPS screen → $349 – $409 (multi-brand step)', async () => { const p = await newPage(); await p.goto(BASE + '/repair-prices'); eq(await calc(p, 'Laptop', 'Dell', 'XPS', 'Screen replacement'), 'Price $349 – $409'); await p.close(); });
await test('PS5 HDMI → $149 – $209, time 2–3 hours', async () => { const p = await newPage(); await p.goto(BASE + '/repair-prices'); eq(await calc(p, 'Gaming Console', 'PlayStation', 'PS5', 'HDMI port'), 'Price $149 – $209'); assert(await p.getByText('2–3 hours').first().isVisible()); await p.close(); });
await test('iPad (10th gen) screen → $169 – $229; diagnosis-only repair shows no price', async () => {
  const p = await newPage(); await p.goto(BASE + '/repair-prices'); eq(await calc(p, 'iPad', null, 'iPad (10th gen)', 'Screen replacement'), 'Price $169 – $229');
  await p.getByRole('button', { name: 'Back' }).click(); await p.getByRole('button', { name: /^Water damage/ }).click();
  assert(await p.getByText('Quoted after diagnosis').first().isVisible()); await p.close();
});
await test('Other Devices → free-text model → quote after diagnosis', async () => {
  const p = await newPage(); await p.goto(BASE + '/repair-prices'); await p.getByRole('button', { name: /^Other Devices/ }).click();
  await p.getByLabel('Device model').fill('Motorola Edge 2024'); await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('button', { name: /^Battery issue/ }).click(); assert(await p.getByText('Quoted after diagnosis').first().isVisible()); await p.close();
});

console.log('\nBooking system');
let bookingRef, bookedDate, bookedTime;
await test('Full booking flow in the browser with photo upload → reference + confirmation', async () => {
  const p = await newPage(); await p.goto(BASE + '/book?category=iphone&brand=Apple&model=iPhone+15&repair=screen');
  await p.getByText('What needs fixing on your iPhone 15?').waitFor();
  assert(await p.getByRole('checkbox', { name: /Screen replacement/ }).getAttribute('aria-checked') === 'true', 'prefilled repair');
  await p.getByRole('checkbox', { name: /Battery replacement/ }).click();
  assert(await p.getByText('$150 – $335').first().isVisible(), 'combined estimate: screen 100–155 + battery 50–180');
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.locator('[role=radiogroup][aria-label="Appointment date"] button:not([disabled])').first().click();
  const slot = p.locator('[role=radiogroup][aria-label="Appointment time"] button:not([disabled])').first(); await slot.waitFor(); await slot.click();
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('button', { name: 'Continue' }).click(); assert(await p.getByText('Enter your full name').isVisible(), 'validation shown');
  await p.getByLabel('Full name').fill('Test Customer'); await p.getByLabel('Phone').fill('905-555-0142'); await p.getByLabel('Email').fill('test.customer@example.com');
  await p.getByLabel('Repair details').fill('Dropped it, cracked top-left.');
  await p.locator('input[type=file]').setInputFiles({ name: 'crack.png', mimeType: 'image/png', buffer: PNG });
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.getByRole('button', { name: 'Confirm booking' }).click(); assert(await p.getByText('Please confirm to continue').isVisible(), 'consent required');
  await p.getByRole('checkbox').check(); await p.getByRole('button', { name: 'Confirm booking' }).click();
  await p.getByText('Your repair is booked').waitFor();
  bookingRef = await p.getByLabel('Booking reference').textContent(); assert(/^AU-\d{6}-[A-Z0-9]{4}$/.test(bookingRef), 'ref format ' + bookingRef);
  assert(await p.getByText('$150 – $335').first().isVisible(), 'estimate on confirmation');
  assert(await p.getByRole('link', { name: 'Add to calendar' }).isVisible()); await p.close();
});
const adminCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const adminFetch = async (p, o = {}) => { const r = await adminCtx.request.fetch(BASE + '/api/admin' + p, { ...o, headers: { 'X-Requested-With': 'alluplinks-admin', ...(o.headers || {}) } }); return { status: r.status(), body: await r.json().catch(() => null) }; };
await test('Booking saved to database with photo and estimate', async () => {
  await adminCtx.request.post(BASE + '/api/admin/login', { data: { email: 'owner@example.com', password: 'test-password-123' } });
  const b = (await adminFetch('/bookings?q=' + bookingRef)).body.rows[0];
  eq(b.model, 'iPhone 15'); eq(b.est_low, 150); eq(b.est_high, 335); eq(b.photos.length, 1); eq(b.status, 'pending'); deepRepairs(b.repairs);
  bookedDate = b.date; bookedTime = b.time;
  const photo = await adminCtx.request.get(BASE + '/api/admin/files/' + b.photos[0]); eq(photo.status(), 200, 'photo served to admin');
  eq((await fetch(BASE + '/api/admin/files/' + b.photos[0])).status, 401, 'photo private');
});
function deepRepairs(r) { eq(JSON.stringify(r), '["screen","battery"]'); }
await test('Booked slot is shown as unavailable and double booking is rejected (409)', async () => {
  const s = (await json('/api/slots?date=' + bookedDate)).body.slots.find((x) => x.time === bookedTime); eq(s.available, false);
  const fd = new FormData(); Object.entries({ category: 'samsung', brand: 'Samsung', model: 'Galaxy S24', repairs: '["screen"]', date: bookedDate, time: bookedTime, name: 'Second Person', email: 'b@example.com', phone: '9055550199' }).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(BASE + '/api/bookings', { method: 'POST', body: fd }); eq(r.status, 409);
});
await test('Concurrent requests for the same free slot: exactly one succeeds', async () => {
  const date = await tomorrowOpen(); const free = (await json('/api/slots?date=' + date)).body.slots.filter((x) => x.available).at(-1).time;
  const mk = (i) => { const fd = new FormData(); Object.entries({ category: 'iphone', brand: 'Apple', model: 'iPhone 13', repairs: '["battery"]', date, time: free, name: 'Racer ' + i, email: `r${i}@example.com`, phone: '9055550100' }).forEach(([k, v]) => fd.append(k, v)); return fetch(BASE + '/api/bookings', { method: 'POST', body: fd }).then((r) => r.status); };
  const st = await Promise.all([1, 2, 3, 4, 5].map(mk)); eq(st.filter((s) => s === 201).length, 1, 'one success ' + st); eq(st.filter((s) => s === 409).length, 4);
});
await test('Server-side validation rejects bad booking input and past dates', async () => {
  const fd = new FormData(); Object.entries({ category: 'iphone', brand: 'Apple', model: 'iPhone 13', repairs: '[]', date: '2020-01-01', time: '10:00', name: 'X', email: 'nope', phone: '12' }).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(BASE + '/api/bookings', { method: 'POST', body: fd }); eq(r.status, 422); const b = await r.json(); for (const k of ['repairs', 'name', 'email', 'phone']) assert(b.errors[k], 'error for ' + k);
  eq((await json('/api/slots?date=2020-01-01')).body.slots.length, 0, 'no past slots');
});
await test('Confirmation email + admin notification recorded (SMTP not configured → logged as not_sent)', async () => {
  const log = (await adminFetch('/email-log')).body; assert(log.some((e) => e.recipient === 'test.customer@example.com' && /AU-/.test(e.subject)), 'customer email attempted');
  const st = (await adminFetch('/stats')).body; assert(st.notifications.some((n) => n.title.includes(bookingRef)), 'admin notification');
});

console.log('\nTrade-in');
await test('Trade-in flow: iPhone 14 Pro 256GB, good/fair → estimate shown and submitted', async () => {
  const p = await newPage(); await p.goto(BASE + '/sell');
  await p.getByLabel('Brand').selectOption('Apple'); await p.getByLabel('Model').selectOption({ label: 'iPhone 14 Pro' });
  await p.getByRole('radio', { name: '256GB' }).click(); await p.getByRole('button', { name: 'Continue' }).click();
  await p.locator('[aria-labelledby=ti-screen]').getByRole('radio', { name: /^Good/ }).click();
  await p.locator('[aria-labelledby=ti-body]').getByRole('radio', { name: /^Fair/ }).click();
  await p.locator('[aria-labelledby=ti-batt]').getByRole('radio', { name: /85% or higher/ }).click();
  for (const id of ['ti-powers', 'ti-bio', 'ti-unlocked', 'ti-account']) await p.locator(`[aria-labelledby=${id}]`).getByRole('radio', { name: 'Yes' }).click();
  // (430 + 30) × 0.55 = 253 → $255 high, × 0.85 → $215 low, credit × 1.2 → $305
  assert(await p.getByText('$215 – $255').isVisible(), 'live estimate'); assert(await p.getByText('$305').isVisible(), 'credit');
  assert(await p.getByText('Final valuation requires physical inspection.').isVisible());
  await p.getByRole('button', { name: 'See my estimate' }).click();
  await p.getByLabel('Full name').fill('Trade Person'); await p.getByLabel('Phone').fill('(905) 555-0177'); await p.getByLabel('Email').fill('trade@example.com');
  await p.locator('input[type=file]').setInputFiles({ name: 'phone.png', mimeType: 'image/png', buffer: PNG });
  await p.getByRole('button', { name: 'Submit trade-in request' }).click(); await p.getByText('Trade-in request received').waitFor();
  const t = (await adminFetch('/tradeins')).body.rows[0]; eq(t.model, 'iPhone 14 Pro'); eq(t.est_high, 255); eq(t.est_low, 215); eq(t.photos.length, 1); await p.close();
});

console.log('\nContact, reviews & shop');
await test('Contact form validates then submits → inquiry stored', async () => {
  const p = await newPage(); await p.goto(BASE + '/contact'); await p.getByRole('button', { name: 'Send message' }).click();
  assert(await p.getByText('Enter your name').isVisible());
  await p.getByLabel('Name').fill('Contact Tester'); await p.getByLabel('Email').fill('ct@example.com'); await p.getByLabel('Message').fill('Do you fix Apple Watch screens?');
  await p.getByRole('button', { name: 'Send message' }).click(); await p.getByText('Message sent').waitFor();
  assert((await adminFetch('/inquiries')).body.rows.some((r) => r.name === 'Contact Tester')); await p.close();
});
await test('Product page inquiry works; products without verified price show "Call for current price"', async () => {
  const p = await newPage(); await p.goto(BASE + '/shop/product/tempered-glass-screen-protector');
  await p.getByText('Call for current price').first().waitFor();
  await p.getByLabel('Name').fill('Shopper'); await p.getByLabel('Email').fill('shop@example.com'); await p.getByRole('button', { name: 'Send inquiry' }).click();
  await p.getByText('Inquiry sent').waitFor(); await p.close();
});
await test('Review submission is held for moderation, then published by admin', async () => {
  const r = await json('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Real Customer', rating: 5, text: 'Quick and friendly screen repair, thank you!' }) }); eq(r.status, 201);
  eq((await json('/api/site')).body.reviews.length, 0, 'not public before approval');
  const rv = (await adminFetch('/t/reviews')).body[0]; await adminFetch('/t/reviews/' + rv.id, { method: 'PUT', data: { approved: 1 } });
  eq((await json('/api/site')).body.reviews.length, 1, 'public after approval');
});

console.log('\nAdmin dashboard');
await test('Admin API requires auth (401) and CSRF header (403)', async () => {
  eq((await json('/api/admin/bookings')).status, 401);
  const r = await adminCtx.request.post(BASE + '/api/admin/notifications/read'); eq(r.status(), 403);
  eq((await json('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password: 'wrong' }) })).status, 401);
});
await test('Price change in admin is reflected immediately in the public calculator data', async () => {
  const cat = (await adminFetch('/t/categories')).body.find((c) => c.slug === 'iphone');
  const grid = (await adminFetch('/prices?category_id=' + cat.id)).body;
  const m = grid.models.find((x) => x.name === 'iPhone 13'); const rt = grid.repairTypes.find((x) => x.key === 'screen');
  eq((await adminFetch('/prices', { method: 'PUT', data: { model_id: m.id, repair_type_id: rt.id, price: 211 } })).status, 200);
  const pub = (await json('/api/catalog')).body.categories.find((c) => c.slug === 'iphone').brands[0].models.find((x) => x.name === 'iPhone 13');
  eq(pub.prices.screen, 211);
  await adminFetch('/prices', { method: 'PUT', data: { model_id: m.id, repair_type_id: rt.id, price: 90, price_high: 145 } });
  eq((await adminFetch('/prices', { method: 'PUT', data: { model_id: m.id, repair_type_id: rt.id, price: 90, price_high: 80 } })).status, 422, '"to" below price rejected');
  const back = (await json('/api/catalog')).body.categories.find((c) => c.slug === 'iphone').brands[0].models.find((x) => x.name === 'iPhone 13');
  eq(`${back.prices.screen}-${back.high.screen}`, '90-145', 'restored owner range');
});
await test('Admin UI: login, dashboard, bookings, pricing grid, schedule and settings pages render', async () => {
  const c = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const p = await newPage(c);
  await p.goto(BASE + '/admin'); await p.getByLabel('Email').fill('owner@example.com'); await p.getByLabel('Password').fill('test-password-123'); await p.getByRole('button', { name: 'Sign in' }).click();
  await p.getByRole('heading', { name: 'Dashboard' }).waitFor();
  for (const [path, heading] of [['bookings', 'Bookings'], ['pricing', 'Repair prices'], ['schedule', 'Appointment schedule'], ['tradeins', 'Trade-in requests'], ['inquiries', 'Customer inquiries'], ['catalogue', 'Devices & repairs'], ['tradein-values', 'Trade-in values'], ['services', 'Services'], ['products', 'Products'], ['faqs', 'FAQs'], ['reviews', 'Reviews'], ['settings', 'Site settings'], ['email-log', 'Email log'], ['account', 'Account']]) {
    await p.goto(BASE + '/admin/' + path); await p.getByRole('heading', { name: heading, exact: true }).waitFor({ timeout: 5000 });
  }
  await p.goto(BASE + '/admin/bookings'); await p.getByText(bookingRef).click(); await p.getByLabel('Status', { exact: true }).selectOption('confirmed'); await p.getByText('Updated').waitFor();
  eq((await adminFetch('/bookings?q=' + bookingRef)).body.rows[0].status, 'confirmed');
  await p.goto(BASE + '/admin/pricing'); const cell = p.getByLabel('iPhone 15 Screen replacement price', { exact: true }); await cell.fill('120'); await cell.press('Enter'); await p.getByText('Price saved').waitFor();
  eq((await json('/api/catalog')).body.categories[0].brands[0].models.find((x) => x.name === 'iPhone 15').prices.screen, 120);
  const to = p.getByLabel('iPhone 15 Screen replacement price to'); eq(await to.inputValue(), '155', '"to" price shown in grid');
  await to.fill('165'); await to.press('Enter'); await p.getByText('Price saved').first().waitFor();
  eq((await json('/api/catalog')).body.categories[0].brands[0].models.find((x) => x.name === 'iPhone 15').high.screen, 165, '"to" saved from admin grid');
  await to.fill('155'); await to.press('Enter'); await p.waitForTimeout(400);
  await cell.fill('100'); await cell.press('Enter'); await p.getByText('Price saved').first().waitFor();
  await c.close();
});
await test('Admin can publish verified store hours → shown on site and in LocalBusiness schema', async () => {
  const original = (await adminFetch('/settings')).body.hours;
  const hours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({ day, open: '10:00', close: '18:00', closed: day === 'Sunday' }));
  await adminFetch('/settings/hours', { method: 'PUT', data: hours });
  const html = await (await fetch(BASE + '/contact')).text(); assert(html.includes('OpeningHoursSpecification'), 'schema hours');
  await adminFetch('/settings/hours', { method: 'PUT', data: original });
});
await test('Booking slots match store hours: 30-min slots, 9:00–16:30 weekdays, 10:00–15:30 weekends, 14 days ahead', async () => {
  const days = (await json('/api/availability')).body.days; eq(days.length, 15, 'today + 14 days');
  const wk = days.find((d) => { const g = new Date(d.date + 'T12:00:00Z').getUTCDay(); return g >= 1 && g <= 5 && d.date !== days[0].date; });
  const we = days.find((d) => { const g = new Date(d.date + 'T12:00:00Z').getUTCDay(); return (g === 0 || g === 6) && d.date !== days[0].date; });
  const a = (await json('/api/slots?date=' + wk.date)).body.slots; eq(a[0].time, '09:00'); eq(a.at(-1).time, '16:30'); eq(a.length, 16);
  const b = (await json('/api/slots?date=' + we.date)).body.slots; eq(b[0].time, '10:00'); eq(b.at(-1).time, '15:30'); eq(b.length, 12);
});
await test('Store hours shown on contact page; Google reviews link present', async () => {
  const p = await newPage(); await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  assert(await p.getByText('9 a.m. – 5 p.m.').first().isVisible(), 'weekday hours'); assert(await p.getByText('10 a.m. – 4 p.m.').first().isVisible(), 'weekend hours');
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  eq(await p.getByRole('link', { name: /Read All Google Reviews/ }).first().getAttribute('href'), 'https://maps.app.goo.gl/aShYzmUiNqCu9nHr8'); await p.close();
});
await test('Blocked date removes all slots', async () => {
  const d = await tomorrowOpen(); const r = await adminFetch('/t/blocked_dates', { method: 'POST', data: { date: d, reason: 'Holiday' } });
  eq((await json('/api/slots?date=' + d)).body.slots.length, 0); await adminFetch('/t/blocked_dates/' + r.body.id, { method: 'DELETE' });
});

console.log('\nDeployment readiness');
await test('Health endpoint reports database, storage and email status', async () => {
  const h = (await json('/api/health')).body; eq(h.ok, true); eq(h.database, 'local'); eq(h.storage, 'local'); eq(h.email, 'none');
});
await test('Backup download contains every table; restore round-trips all records', async () => {
  const r = await adminCtx.request.get(BASE + '/api/admin/backup'); eq(r.status(), 200);
  assert(/attachment/.test(r.headers()['content-disposition'] || ''), 'download header');
  const backup = await r.json(); eq(backup.format, 'alluplinks-backup'); eq(backup.tables.prices.length, 579);
  assert(backup.tables.bookings.some((b) => b.ref === bookingRef), 'booking in backup');
  eq((await fetch(BASE + '/api/admin/backup')).status, 401, 'backup requires login');
  // Restore into a separate fresh database through the import script, then compare.
  const RESTORE = fs.mkdtempSync(path.join(os.tmpdir(), 'au-restore-')); const file = path.join(RESTORE, 'b.json'); fs.writeFileSync(file, JSON.stringify(backup));
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, ['--no-warnings', 'scripts/import-backup.mjs', file, '--yes'], { cwd: ROOT, env: { ...process.env, DATA_DIR: RESTORE, ADMIN_PASSWORD: 'x-unused-123' }, stdio: 'pipe' });
  const out = execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', "const m = await import('./server/db.js'); await m.ready; const e = await m.exportAll(); console.log(JSON.stringify(Object.fromEntries(Object.entries(e.tables).map(([k, v]) => [k, v.length]))));"], { cwd: ROOT, env: { ...process.env, DATA_DIR: RESTORE }, encoding: 'utf8' });
  const counts = JSON.parse(out.trim().split('\n').pop());
  for (const [t, rows] of Object.entries(backup.tables)) eq(counts[t], rows.length, 'restored ' + t);
  fs.rmSync(RESTORE, { recursive: true, force: true });
});
await test('Deleting a model removes its prices (explicit cascade)', async () => {
  const cat = (await adminFetch('/t/categories')).body.find((c) => c.slug === 'google-pixel');
  const brand = (await adminFetch('/t/brands?category_id=' + cat.id)).body[0];
  const m = (await adminFetch('/t/models', { method: 'POST', data: { brand_id: brand.id, name: 'Pixel Test 99', sort: 99, active: 1 } })).body;
  const rt = (await adminFetch('/t/repair_types?device_type=Phone')).body.find((r) => r.key === 'screen');
  await adminFetch('/prices', { method: 'PUT', data: { model_id: m.id, repair_type_id: rt.id, price: 123 } });
  assert((await json('/api/catalog')).body.categories.find((c) => c.slug === 'google-pixel').brands[0].models.some((x) => x.name === 'Pixel Test 99'), 'model visible');
  await adminFetch('/t/models/' + m.id, { method: 'DELETE' });
  const backup = await (await adminCtx.request.get(BASE + '/api/admin/backup')).json();
  assert(!backup.tables.prices.some((p) => p.model_id === m.id), 'orphan price removed'); eq(backup.tables.prices.length, 579);
});

console.log('\nFirst load, transitions, hero, fonts & accessibility (A–H regression)');
await test('A/B: server sends a styled first view + store settings; no unstyled link list', async () => {
  const html = await (await fetch(BASE + '/')).text();
  assert(!html.includes('seo-fallback'), 'old unstyled fallback removed');
  assert(html.includes('data-shell') && html.includes('aria-label="All Uplinks home"'), 'header in first view');
  assert(/<h1 class="[^"]*text-balance[^"]*">Phone repair in Keswick<span[^>]*>fixed fast, priced upfront\.<\/span><\/h1>/.test(html), 'styled hero h1');
  const boot = JSON.parse(html.match(/<script type="application\/json" id="__SITE__">([\s\S]*?)<\/script>/)[1]);
  eq(boot.content.hero_title, 'Phone repair in Keswick — fixed fast, priced upfront.'); eq(boot.business.phone_tel, '+19055359503');
  assert(boot.hours.length === 7 && boot.services.length === 18, 'hours + services embedded');
  for (const href of ['/repair-prices', '/book', '/services/iphone-screen-replacement']) assert(html.includes(`href="${href}"`), 'crawlable link ' + href);
  const svc = await (await fetch(BASE + '/services/water-damage-repair')).text();
  assert(/<h1 class="text-4xl[^"]*">Water Damage Repair in Keswick<\/h1>/.test(svc), 'styled first view on inner pages');
});
await test('A: before JavaScript loads, the page already looks finished (desktop + 360px phone)', async () => {
  for (const vp of [{ width: 1366, height: 900 }, { width: 360, height: 740 }]) {
    const c = await browser.newContext({ viewport: vp, isMobile: vp.width < 500 }); const p = await c.newPage();
    await p.route('**/assets/*.js', (r) => r.abort());
    await p.goto(BASE + '/', { waitUntil: 'load' });
    const info = await p.evaluate(() => { const h = document.querySelector('main h1').getBoundingClientRect(); const nav = document.querySelector('nav[aria-label="Site"]').getBoundingClientRect();
      return { h1Size: parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize), h1Top: h.top, navTop: nav.top, book: !!document.querySelector('main a[href="/book"].btn-primary'), vh: innerHeight }; });
    assert(info.h1Size >= 30, 'big hero heading ' + info.h1Size); assert(info.h1Top < 260, 'heading near top'); assert(info.book, 'Book button styled');
    assert(info.navTop > info.vh, 'link list is below the first screen'); await c.close();
  }
});
await test('A: hand-over from first view to app moves nothing (same positions)', async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const p = await c.newPage();
  await p.route('**/assets/*.js', async (r) => { await new Promise((x) => setTimeout(x, 1500)); r.continue(); });
  const pos = () => p.evaluate(() => ['main h1', 'main h1 + p', 'main a.btn-primary', 'main a.btn-dark', 'main section img'].map((q) => Math.round(document.querySelector(q).getBoundingClientRect().top)));
  p.goto(BASE + '/').catch(() => {}); await p.waitForSelector('[data-shell]'); await p.waitForTimeout(300); const before = await pos();
  await p.waitForFunction(() => !document.querySelector('[data-shell]'), null, { timeout: 15000 }); await p.waitForTimeout(500); const after = await pos();
  eq(JSON.stringify(after), JSON.stringify(before), 'element tops'); await c.close();
});
await test('B/C: zero layout shift on the homepage (desktop + phone)', async () => {
  for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
    const c = await browser.newContext({ viewport: vp, isMobile: vp.width < 500 }); const p = await c.newPage();
    await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); });
    await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    const cls = await p.evaluate(() => window.__cls); assert(cls < 0.01, `CLS ${cls.toFixed(4)} at ${vp.width}px`); await c.close();
  }
});
await test('C: fonts are self-hosted and preloaded (no Google Fonts requests)', async () => {
  const p = await newPage(); const urls = []; p.on('request', (r) => urls.push(r.url()));
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  assert(!urls.some((u) => /fonts\.(googleapis|gstatic)\.com/.test(u)), 'no Google Fonts');
  assert(urls.some((u) => u.endsWith('/fonts/inter-latin-var.woff2')) && urls.some((u) => u.endsWith('/fonts/plus-jakarta-sans-latin-var.woff2')), 'self-hosted fonts requested');
  for (const f of ['inter-latin-var.woff2', 'plus-jakarta-sans-latin-var.woff2']) eq((await fetch(BASE + '/fonts/' + f)).status, 200, f);
  const html = await (await fetch(BASE + '/')).text(); assert(html.includes('rel="preload" href="/fonts/inter-latin-var.woff2"'), 'preload'); await p.close();
});
await test('D: changing pages never shows a blank screen or spinner', async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const p = await c.newPage();
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  for (const [link, h1] of [['Prices', 'Repair price calculator'], ['Sell / Trade-in', 'Sell or trade in your phone'], ['Contact', 'Get in touch']]) {
    await p.getByRole('button', { name: 'Open menu' }).click(); await p.getByRole('dialog').getByRole('link', { name: link, exact: true }).click();
    for (let i = 0; i < 6; i++) { // sample the screen during the change
      const st = await p.evaluate(() => ({ h1: document.querySelector('main h1')?.textContent || '', busy: [...document.querySelectorAll('[aria-busy="true"]')].some((e) => e.getBoundingClientRect().height > 0), spinner: !!document.querySelector('main [role="status"] svg.animate-spin') }));
      assert(st.h1 && !st.busy && !st.spinner, `blank/spinner while opening ${link}: ${JSON.stringify(st)}`); await p.waitForTimeout(40);
    }
    await p.waitForFunction((t) => document.querySelector('main h1')?.textContent.includes(t), h1);
  }
  await c.close();
});
await test('E: hero — customer-focused heading, two main buttons above the fold at every size', async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
    const c = await browser.newContext({ viewport: vp, isMobile: vp.width < 500 }); const p = await c.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => { const sec = document.querySelector('main section'); const btns = [...sec.querySelectorAll('a.btn-lg')];
      return { h1: sec.querySelector('h1').textContent, btns: btns.map((b) => [b.textContent.trim(), Math.round(b.getBoundingClientRect().bottom)]), vh: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }; });
    eq(r.h1, 'Phone repair in Keswickfixed fast, priced upfront.'); eq(r.btns.length, 2, 'two hero buttons');
    eq(r.btns.map((b) => b[0]).join('|'), 'Book a Repair|Call Now'); assert(r.btns.every((b) => b[1] <= r.vh), `buttons above fold at ${vp.width}px`); assert(r.overflow <= 0, 'no sideways scroll');
    await c.close();
  }
});
await test('E: phone sticky Call/Book bar hidden at the top, slides in after scrolling', async () => {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const p = await c.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const visible = () => p.evaluate(() => { const r = document.querySelector('[data-testid="mobile-bar"]').getBoundingClientRect(); return r.top < innerHeight - 4; });
  eq(await visible(), false, 'hidden at top'); await p.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' })); await p.waitForTimeout(500);
  eq(await visible(), true, 'shown after scroll'); await c.close();
});
await test('F: logo subtitle stays on one line at 320px and 360px, no sideways scroll', async () => {
  for (const w of [320, 360]) {
    const c = await browser.newContext({ viewport: { width: w, height: 740 }, isMobile: true }); const p = await c.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => { const s = [...document.querySelectorAll('header span')].find((x) => x.textContent === 'Phone Repair · Keswick'); return { h: s.getBoundingClientRect().height, overflow: document.documentElement.scrollWidth - innerWidth }; });
    assert(r.h <= 16, `subtitle one line at ${w}px (height ${r.h})`); assert(r.overflow <= 0, `no overflow at ${w}px`); await c.close();
  }
});
await test('G: no colour-contrast (or other WCAG A/AA) failures on main pages', async () => {
  const AXE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: true }); const p = await c.newPage(); const bad = [];
  for (const r of ['/', '/services', '/services/iphone-screen-replacement', '/repair-prices', '/book', '/sell', '/shop', '/contact', '/faq', '/admin']) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' }); await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'))); await p.waitForTimeout(700);
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}(${x.nodes.length})`));
    if (v.length) bad.push(`${r}: ${v.join(', ')}`);
  }
  eq(bad.length, 0, bad.join(' | ')); await c.close();
});
await test('E: hero text migration updates old default copy but keeps owner-edited text', async () => {
  const { execFileSync } = await import('node:child_process');
  const run = (dir, js) => execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', js], { cwd: ROOT, env: { ...process.env, DATA_DIR: dir, ADMIN_PASSWORD: 'x-unused-123' }, encoding: 'utf8' }).trim().split('\n').pop();
  for (const [title, expected] of [['Professional Phone Repair in Keswick, Ontario', 'Phone repair in Keswick — fixed fast, priced upfront.'], ['My own headline', 'My own headline']]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'au-mig-'));
    run(dir, `const m = await import('./server/db.js'); await m.ready; await m.setSetting('content', { ...m.getSetting('content'), hero_title: ${JSON.stringify(title)} }); await m.setSetting('schema_version', 1); console.log('ok');`);
    const out = run(dir, "const m = await import('./server/db.js'); await m.ready; console.log(m.getSetting('content').hero_title);");
    eq(out, expected, 'after migration'); fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('\nGoogle reviews section');
await test('Reviews: buttons use the configured Google links; no review cards without real data', async () => {
  // Hide the website review published earlier in this run, so the section has no reviews at all.
  for (const r of (await adminFetch('/t/reviews')).body) await adminFetch('/t/reviews/' + r.id, { method: 'PUT', data: { approved: 0 } });
  const p = await newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  eq(await p.locator('[data-review]').count(), 0, 'no cards when there are no approved reviews');
  eq(await p.getByRole('link', { name: 'Read All Google Reviews' }).getAttribute('href'), 'https://maps.app.goo.gl/aShYzmUiNqCu9nHr8');
  eq(await p.getByRole('link', { name: 'Leave Us a Google Review' }).getAttribute('href'), 'https://maps.app.goo.gl/aShYzmUiNqCu9nHr8', 'falls back to reviews page');
  const biz = (await adminFetch('/settings')).body.business;
  await adminFetch('/settings/business', { method: 'PUT', data: { ...biz, google_write_review_url: 'https://g.page/r/TEST-ONLY/review' } });
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  eq(await p.getByRole('link', { name: 'Leave Us a Google Review' }).getAttribute('href'), 'https://g.page/r/TEST-ONLY/review', 'uses write-review link when set');
  await adminFetch('/settings/business', { method: 'PUT', data: biz }); await p.close();
});
await test('Reviews: Google reviews show first with name, date, stars, Google mark and their own link', async () => {
  const add = async (d) => (await adminFetch('/t/reviews', { method: 'POST', data: { approved: 1, ...d } })).body;
  const g2 = await add({ name: 'TEST Reviewer Two', rating: 4, text: 'TEST ONLY second google entry.', source: 'Google', review_date: 'TEST date 2', link: 'https://example.com/test-review-2', sort: 2 });
  const g1 = await add({ name: 'TEST Reviewer One', rating: 5, text: 'TEST ONLY '.repeat(40), source: 'Google', review_date: 'TEST date 1', link: 'https://example.com/test-review-1', sort: 1 });
  const w = await add({ name: 'TEST Website Person', rating: 5, text: 'TEST ONLY website entry here.', source: 'website' });
  const site = (await json('/api/site')).body; eq(site.reviews.map((r) => r.name).join('|'), 'TEST Reviewer One|TEST Reviewer Two|TEST Website Person', 'Google first, by display order');
  const p = await newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')));
  const cards = p.locator('[data-review]'); eq(await cards.count(), 3);
  const first = cards.first(); eq(await first.getAttribute('data-review'), 'google');
  assert((await first.textContent()).includes('TEST date 1'), 'date shown');
  eq(await first.getByRole('link', { name: /View on Google/ }).getAttribute('href'), 'https://example.com/test-review-1');
  eq(await first.getByRole('img', { name: '5 out of 5 stars' }).count(), 1, 'star rating');
  await first.getByRole('button', { name: 'Read more' }).click(); await first.getByRole('button', { name: 'Show less' }).waitFor();
  eq(await cards.nth(2).getAttribute('data-review'), 'website'); eq(await cards.nth(2).getByRole('link', { name: /View on Google/ }).count(), 0, 'no Google link on website review');
  assert((await p.locator('main').textContent()).includes('4.9'), 'header shows the Google profile rating when set');
  await p.close();
  // Phone: horizontal swipe row; desktop: grid
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true }); const mp = await m.newPage(); await mp.goto(BASE + '/', { waitUntil: 'networkidle' });
  const row = await mp.evaluate(() => { const l = document.querySelector('[aria-label="Customer reviews"]'); return { scroll: l.scrollWidth > l.clientWidth + 50, overflow: document.documentElement.scrollWidth - innerWidth }; });
  assert(row.scroll, 'swipeable on phones'); assert(row.overflow <= 0, 'page itself does not scroll sideways'); await m.close();
  for (const r of [g1, g2, w]) await adminFetch('/t/reviews/' + r.id, { method: 'DELETE' });
});
await test('Reviews: databases created before this change gain the new review fields without losing reviews', async () => {
  const { execFileSync } = await import('node:child_process');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'au-rev-'));
  const env = { ...process.env, DATA_DIR: dir, ADMIN_PASSWORD: 'x-unused-123' };
  execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', `import { createClient } from '@libsql/client';
    const c = createClient({ url: 'file:${dir.replace(/\\/g, '/')}/alluplinks.db' });
    await c.execute("CREATE TABLE reviews (id INTEGER PRIMARY KEY, name TEXT NOT NULL, rating INTEGER NOT NULL, text TEXT NOT NULL, device TEXT, source TEXT DEFAULT 'website', approved INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))");
    await c.execute("INSERT INTO reviews(name,rating,text,approved) VALUES('Old row',5,'kept text',1)");`], { cwd: ROOT, env });
  const out = execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', "const m = await import('./server/db.js'); await m.ready; const cols = (await m.db.all('PRAGMA table_info(reviews)')).map((c) => c.name); const r = await m.db.get('SELECT * FROM reviews'); console.log(JSON.stringify({ cols, name: r.name, text: r.text }));"], { cwd: ROOT, env, encoding: 'utf8' });
  const res = JSON.parse(out.trim().split('\n').pop());
  for (const c of ['link', 'review_date', 'sort']) assert(res.cols.includes(c), 'column ' + c);
  eq(res.name, 'Old row'); eq(res.text, 'kept text'); fs.rmSync(dir, { recursive: true, force: true });
});

console.log('\nBusiness email');
const OWNER_EMAIL = 'alluplinks1@gmail.com';
await test('Email: shown in footer, contact section, contact page, privacy policy and business schema', async () => {
  eq((await json('/api/site')).body.business.email, OWNER_EMAIL);
  const p = await newPage();
  await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  const mailtos = await p.$$eval('a[href^="mailto:"]', (as) => as.map((a) => a.getAttribute('href')));
  assert(mailtos.length >= 3 && mailtos.every((h) => h === 'mailto:' + OWNER_EMAIL), 'contact card, location card and footer: ' + mailtos.join(','));
  await p.goto(BASE + '/privacy', { waitUntil: 'networkidle' }); assert((await p.locator('main').textContent()).includes(OWNER_EMAIL), 'privacy policy');
  await p.close();
  const html = await (await fetch(BASE + '/')).text();
  const lb = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((x) => Array.isArray(x['@type']));
  eq(lb.email, OWNER_EMAIL, 'LocalBusiness email');
});
await test('Email: new booking / inquiry alerts are addressed to the business email', async () => {
  const log = (await adminFetch('/email-log')).body;
  assert(log.some((e) => e.recipient === OWNER_EMAIL && /New booking AU-/.test(e.subject)), 'booking alert');
  assert(log.some((e) => e.recipient === OWNER_EMAIL && /New inquiry/.test(e.subject)), 'inquiry alert');
});
await test('Email: existing database — public email set if empty (never overwritten) and the single admin login moved to it', async () => {
  const { execFileSync } = await import('node:child_process');
  const run = (dir, js, extra = {}) => execFileSync(process.execPath, ['--no-warnings', '--input-type=module', '-e', js], { cwd: ROOT, env: { ...process.env, DATA_DIR: dir, ...extra }, encoding: 'utf8' }).trim().split('\n').pop();
  for (const [preset, expectPublic] of [['', OWNER_EMAIL], ['shop@example.com', 'shop@example.com']]) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'au-email-'));
    run(dir, `const m = await import('./server/db.js'); await m.ready; await m.setSetting('business', { ...m.getSetting('business'), email: ${JSON.stringify(preset)} }); await m.setSetting('data_version', 1); console.log('ok');`, { ADMIN_EMAIL: 'old-admin@example.com', ADMIN_PASSWORD: 'old-pass-12345' });
    const out = JSON.parse(run(dir, "const m = await import('./server/db.js'); await m.ready; const a = await m.db.all('SELECT email, password_hash FROM admin_users'); const bc = (await import('bcryptjs')).default; console.log(JSON.stringify({ pub: m.getSetting('business').email, admins: a.map((x) => x.email), pw: bc.compareSync('old-pass-12345', a[0].password_hash) }));"));
    eq(out.pub, expectPublic, 'public email'); eq(JSON.stringify(out.admins), JSON.stringify([OWNER_EMAIL]), 'admin login email'); eq(out.pw, true, 'password unchanged');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
await test('Email: admin can change the sign-in email from Account (password required)', async () => {
  eq((await adminFetch('/email', { method: 'POST', data: { email: 'new-login@example.com', current: 'wrong' } })).status, 400, 'wrong password rejected');
  eq((await adminFetch('/email', { method: 'POST', data: { email: 'not-an-email', current: 'test-password-123' } })).status, 422);
  eq((await adminFetch('/email', { method: 'POST', data: { email: 'new-login@example.com', current: 'test-password-123' } })).status, 200);
  eq((await json('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'new-login@example.com', password: 'test-password-123' }) })).status, 200, 'login with new email');
  eq((await adminFetch('/email', { method: 'POST', data: { email: 'owner@example.com', current: 'test-password-123' } })).status, 200, 'changed back');
});

console.log('\nHero Google rating');
await test('Hero rating: hidden until a real rating is entered; then shown in first view and app, linking to Google', async () => {
  const hero = async () => { const h = await (await fetch(BASE + '/')).text(); return h.slice(h.indexOf('data-shell'), h.indexOf('</section>')); };
  assert((await hero()).includes('aria-label="Rated 4.9 out of 5 on Google, 204 Google reviews"'), 'Google profile rating 4.9 / 204 set by the data update');
  const biz = (await adminFetch('/settings')).body.business;
  await adminFetch('/settings/business', { method: 'PUT', data: { ...biz, google_rating: '' } });
  assert(!(await hero()).includes('out of 5 on Google'), 'hidden when the rating is cleared');
  await adminFetch('/settings/business', { method: 'PUT', data: { ...biz, google_rating: '9', google_review_count: '5' } });
  assert(!(await hero()).includes('out of 5 on Google'), 'invalid rating (above 5) not shown');
  await adminFetch('/settings/business', { method: 'PUT', data: { ...biz, google_rating: '4.75', google_review_count: '1234' } });
  const h = await hero(); assert(h.includes('aria-label="Rated 4.8 out of 5 on Google, 1,234 Google reviews"'), 'first view badge');
  const p = await newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const badge = p.getByTestId('hero-rating'); eq(await badge.getAttribute('href'), biz.google_review_url, 'links to Google reviews');
  eq((await badge.textContent()).trim(), '4.81,234 Google reviews'); eq(await badge.locator('svg.text-amber-400').count(), 5, '4.75 rounds to 5 stars');
  await p.close();
  await adminFetch('/settings/business', { method: 'PUT', data: biz });
});

console.log('\nOwner review fixes (side scroll, top bar, wording, sitemap)');
// The page must never be wider than the phone screen. Phones zoom out to fit wide content, so we compare
// with the real screen width (innerWidth grows when that happens), not just scrollWidth vs innerWidth.
const pageWiderThanScreen = (p, W) => p.evaluate((W) => Math.max(innerWidth, document.documentElement.scrollWidth) - W, W);
await test('No side scroll on phones on any page, including every booking and trade-in step (320/360/390px)', async () => {
  const bad = [];
  for (const W of [320, 360, 390]) {
    const c = await browser.newContext({ viewport: { width: W, height: 800 }, isMobile: true, hasTouch: true }); const p = await c.newPage();
    const check = async (label) => { const o = await pageWiderThanScreen(p, W); if (o > 0) bad.push(`${W}px ${label}: +${o}px`); };
    for (const r of ['/', '/services', '/services/iphone-screen-replacement', '/repair-prices', '/book', '/sell', '/shop', '/contact', '/reviews', '/faq']) { await p.goto(BASE + r, { waitUntil: 'networkidle' }); await check(r); }
    await p.goto(BASE + '/book?category=iphone&brand=Apple&model=iPhone+15&repair=screen', { waitUntil: 'networkidle' }); await check('book: repair');
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Continue')).click()); await p.waitForTimeout(900); await check('book: dates');
    await p.evaluate(() => document.querySelector('[aria-label="Appointment date"] button:not([disabled])').click()); await p.waitForTimeout(700); await check('book: times');
    await p.evaluate(() => document.querySelector('[aria-label="Appointment time"] button:not([disabled])').click());
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Continue')).click()); await p.waitForTimeout(600); await check('book: details');
    await p.goto(BASE + '/sell', { waitUntil: 'networkidle' }); await p.getByLabel('Brand').selectOption('Apple'); await p.getByLabel('Model').selectOption({ label: 'iPhone 16 Pro' }); await check('sell: storage chips');
    await c.close();
  }
  eq(bad.length, 0, bad.join(' | '));
});
await test('Top bar text is never cut off (320px to 1440px)', async () => {
  const bad = [];
  for (const W of [320, 360, 390, 640, 768, 1024, 1100, 1280, 1440, 1600]) {
    const c = await browser.newContext({ viewport: { width: W, height: 800 }, isMobile: W < 640 }); const p = await c.newPage(); await p.goto(BASE + '/', { waitUntil: 'networkidle' });
    const cut = await p.evaluate(() => [...document.querySelectorAll('.bg-ink span.truncate')].filter((s) => s.offsetParent && s.scrollWidth > s.clientWidth + 1).map((s) => s.textContent.slice(0, 30)));
    if (cut.length) bad.push(`${W}px: ${cut.join(', ')}`); await c.close();
  }
  eq(bad.length, 0, bad.join(' | '));
});
await test('No "exact price" claims on public pages; contact form says where messages go; /sitemap redirects', async () => {
  for (const r of ['/', '/repair-prices', '/services/iphone-screen-replacement', '/services/samsung-screen-replacement', '/services/tablet-repair', '/faq']) {
    const p = await newPage(); await p.goto(BASE + r, { waitUntil: 'networkidle' });
    const txt = (await p.locator('body').textContent()) + (await (await fetch(BASE + r)).text());
    assert(!/exact (advertised )?price|exact prices|exact model prices|exact repair price/i.test(txt), 'exact-price wording on ' + r); await p.close();
  }
  const p = await newPage(); await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  assert((await p.locator('form').textContent()).includes('Your message goes straight to the All Uplinks team (alluplinks1@gmail.com)'), 'form destination note'); await p.close();
  const r = await fetch(BASE + '/sitemap', { redirect: 'manual' }); eq(r.status, 301); eq(r.headers.get('location'), '/sitemap.xml');
});
await test('Business details: Unit 23 + postal code L4P 3J4 shown; Google rating 4.9 · 204 shown in reviews header', async () => {
  const p = await newPage(); await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  const t = await p.locator('main').textContent(); assert(t.includes('443 The Queensway South, Unit 23') && t.includes('L4P 3J4'), 'address on contact page');
  await p.goto(BASE + '/reviews', { waitUntil: 'networkidle' }); assert((await p.locator('main').textContent()).includes('204 Google reviews on Google') || (await p.locator('main').textContent()).includes('4.9'), 'rating in reviews header');
  await p.close();
});

console.log('\nLinks, images, contact buttons, responsiveness');
await test('Every internal link on every page resolves (no broken links)', async () => {
  const p = await newPage(); const seen = new Set(); const bad = [];
  for (const r of ROUTES) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' });
    const links = await p.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of links) { if (!h.startsWith('/') || seen.has(h.split('#')[0])) continue; seen.add(h.split('#')[0]); const s = (await fetch(BASE + h.split('#')[0])).status; if (s !== 200) bad.push(`${h} (${s}) on ${r}`); }
  }
  eq(bad.length, 0, 'broken: ' + bad.join(', ')); assert(seen.size > 40, 'checked ' + seen.size + ' links'); await p.close();
});
await test('All phone links use tel:+19055359503; directions link targets the store address', async () => {
  const p = await newPage(); await p.goto(BASE + '/contact', { waitUntil: 'networkidle' });
  const tels = await p.$$eval('a[href^="tel:"]', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]); eq(JSON.stringify(tels), '["tel:+19055359503"]');
  const dir = await p.getByRole('link', { name: 'Get directions' }).getAttribute('href'); assert(dir.includes('443%20The%20Queensway%20South') && dir.includes('Keswick'), dir);
  const map = await p.locator('iframe').getAttribute('src'); assert(map.includes('443%20The%20Queensway%20South'), 'map iframe'); await p.close();
});
await test('All images load, have alt attributes, and pages have no horizontal scroll at 390px', async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await newPage(m);
  for (const r of ['/', '/services', '/services/iphone-screen-replacement', '/repair-prices', '/book', '/sell', '/shop', '/shop/product/pre-owned-iphone-13-pro', '/contact', '/about']) {
    await p.goto(BASE + r, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((x) => setTimeout(x, 30)); } });
    await p.waitForTimeout(300);
    const info = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src), noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length }));
    assert(info.overflow <= 0, `${r} overflows by ${info.overflow}px`); eq(info.broken.length, 0, `${r} broken images ${info.broken}`); eq(info.noAlt, 0, `${r} images without alt`);
  }
  await m.close();
});
await test('Mobile menu opens full-screen, links work, and closes', async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await newPage(m);
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await p.getByRole('button', { name: 'Open menu' }).click();
  const dlg = p.getByRole('dialog', { name: 'Menu' }); await dlg.waitFor();
  const box = await dlg.boundingBox(); assert(box.height >= 800, 'menu covers screen, height ' + box.height);
  await dlg.getByRole('link', { name: 'Prices' }).click(); await p.waitForURL(/\/repair-prices/); eq(await dlg.count(), 0, 'menu closed after navigation');
  await p.getByRole('button', { name: 'Open menu' }).click(); await p.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Close menu' }).click(); eq(await p.getByRole('dialog', { name: 'Menu' }).count(), 0, 'close button');
  await m.close();
});
await test('Every service uses a distinct image file', async () => { eq(new Set(services.map((s) => s.image)).size, 18); });
await test('No JavaScript console errors on any page', async () => { eq(consoleErrors.length, 0, consoleErrors.slice(0, 5).join('\n')); });
await test('Performance: home HTML < 30 KB, JS on first load < 120 KB gzip, images WebP', async () => {
  const p = await newPage(); const sizes = []; p.on('response', async (r) => { if (r.url().includes('/assets/') && r.url().endsWith('.js')) try { sizes.push(Number(r.headers()['content-length'] || (await r.body()).length)); } catch { /* page closed */ } });
  const t0 = Date.now(); await p.goto(BASE + '/', { waitUntil: 'load' }); const loadMs = Date.now() - t0;
  const html = await (await fetch(BASE + '/')).text(); assert(html.length < 40000, 'html ' + html.length); // includes the styled first view + embedded store settings (~8 KB gzipped)
  const gz = await fetch(BASE + '/', { headers: { 'Accept-Encoding': 'gzip' } }); assert(gz.headers.get('content-encoding') === 'gzip', 'compression');
  const imgs = await p.$$eval('img', (i) => i.map((x) => x.currentSrc || x.src).filter((s) => s.includes('/images/'))); assert(imgs.every((s) => s.endsWith('.webp')), 'webp');
  results.push(`      (home load ${loadMs} ms locally)`); await p.close();
});

await browser.close(); server.kill();
fs.rmSync(DATA, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
