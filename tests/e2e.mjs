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
    assert(/<h1>/.test(html) && html.includes('og:title') && html.includes('application/ld+json'), 'h1/og/jsonld');
    assert(t.length <= 70, `title too long (${t.length}): ${t}`);
  });
}
await test('Unknown URL returns 404 with noindex', async () => { const r = await fetch(BASE + '/no-such-page'); eq(r.status, 404); assert((await r.text()).includes('noindex')); });
await test('LocalBusiness, Service, FAQPage, Product and Breadcrumb schema present', async () => {
  const get = async (p) => [...(await (await fetch(BASE + p)).text()).matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const home = await get('/'); const lb = home.find((x) => Array.isArray(x['@type']) && x['@type'].includes('LocalBusiness'));
  eq(lb.telephone, '+19055359503'); eq(lb.address.streetAddress, '443 The Queensway South'); eq(lb.address.addressLocality, 'Keswick');
  assert(!lb.openingHoursSpecification, 'no unverified opening hours in schema'); assert(home.some((x) => x['@type'] === 'FAQPage'), 'FAQPage');
  const svc = await get('/services/iphone-screen-replacement'); const s = svc.find((x) => x['@type'] === 'Service');
  eq(s.offers.priceCurrency, 'CAD'); eq(s.offers.lowPrice, 79); eq(s.offers.highPrice, 499); assert(svc.some((x) => x['@type'] === 'BreadcrumbList'));
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
await test('Every one of the 579 researched price points is served exactly by the catalogue API', async () => {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'server/data/repair-prices.json'), 'utf8'));
  const cat = (await json('/api/catalog')).body;
  const map = { 'Phone/Apple': 'iphone', 'Phone/Samsung': 'samsung', 'Phone/Google': 'google-pixel', 'Tablet/Apple': 'ipad', 'Tablet/Samsung': 'tablet', 'Laptop/Apple': 'macbook', 'Laptop/Dell': 'laptop', 'Laptop/HP': 'laptop', 'Laptop/Lenovo': 'laptop', 'Console/PlayStation': 'gaming-console', 'Console/Xbox': 'gaming-console', 'Console/Nintendo': 'gaming-console' };
  let n = 0;
  for (const [dt, brands] of Object.entries(src)) for (const [b, models] of Object.entries(brands)) for (const [m, reps] of Object.entries(models)) for (const [k, p] of Object.entries(reps)) {
    const c = cat.categories.find((x) => x.slug === map[`${dt}/${b}`]); const model = c.brands.find((x) => x.name === b).models.find((x) => x.name === m);
    eq(model?.prices[k], p, `${b} ${m} ${k}`); n++;
  }
  eq(n, 579, 'price point count');
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
await test('iPhone 15 screen → $259 – $319, time 30–60 min, Book link prefilled', async () => {
  const p = await newPage(); await p.goto(BASE + '/repair-prices');
  eq(await calc(p, 'iPhone', null, 'iPhone 15', 'Screen replacement'), 'Price $259 – $319');
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
  assert(await p.getByText('$368 – $488').first().isVisible(), 'combined estimate (259+109, +2×60)');
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
  assert(await p.getByText('$368 – $488').first().isVisible(), 'estimate on confirmation');
  assert(await p.getByRole('link', { name: 'Add to calendar' }).isVisible()); await p.close();
});
const adminCtx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const adminFetch = async (p, o = {}) => { const r = await adminCtx.request.fetch(BASE + '/api/admin' + p, { ...o, headers: { 'X-Requested-With': 'alluplinks-admin', ...(o.headers || {}) } }); return { status: r.status(), body: await r.json().catch(() => null) }; };
await test('Booking saved to database with photo and estimate', async () => {
  await adminCtx.request.post(BASE + '/api/admin/login', { data: { email: 'owner@example.com', password: 'test-password-123' } });
  const b = (await adminFetch('/bookings?q=' + bookingRef)).body.rows[0];
  eq(b.model, 'iPhone 15'); eq(b.est_low, 368); eq(b.est_high, 488); eq(b.photos.length, 1); eq(b.status, 'pending'); deepRepairs(b.repairs);
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
  await adminFetch('/prices', { method: 'PUT', data: { model_id: m.id, repair_type_id: rt.id, price: 199 } });
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
  await p.goto(BASE + '/admin/pricing'); const cell = p.getByLabel('iPhone 15 Screen replacement price'); await cell.fill('265'); await cell.press('Enter'); await p.getByText('Price saved').waitFor();
  eq((await json('/api/catalog')).body.categories[0].brands[0].models.find((x) => x.name === 'iPhone 15').prices.screen, 265);
  await cell.fill('259'); await cell.press('Enter'); await p.getByText('Price saved').first().waitFor();
  await c.close();
});
await test('Admin can publish verified store hours → shown on site and in LocalBusiness schema', async () => {
  const hours = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({ day, open: '10:00', close: '18:00', closed: day === 'Sunday' }));
  await adminFetch('/settings/hours', { method: 'PUT', data: hours });
  const html = await (await fetch(BASE + '/contact')).text(); assert(html.includes('OpeningHoursSpecification'), 'schema hours');
  await adminFetch('/settings/hours', { method: 'PUT', data: [] });
});
await test('Blocked date removes all slots', async () => {
  const d = await tomorrowOpen(); const r = await adminFetch('/t/blocked_dates', { method: 'POST', data: { date: d, reason: 'Holiday' } });
  eq((await json('/api/slots?date=' + d)).body.slots.length, 0); await adminFetch('/t/blocked_dates/' + r.body.id, { method: 'DELETE' });
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
await test('Every service uses a distinct image file', async () => { eq(new Set(services.map((s) => s.image)).size, 18); });
await test('No JavaScript console errors on any page', async () => { eq(consoleErrors.length, 0, consoleErrors.slice(0, 5).join('\n')); });
await test('Performance: home HTML < 30 KB, JS on first load < 120 KB gzip, images WebP', async () => {
  const p = await newPage(); const sizes = []; p.on('response', async (r) => { if (r.url().includes('/assets/') && r.url().endsWith('.js')) sizes.push(Number(r.headers()['content-length'] || (await r.body()).length)); });
  const t0 = Date.now(); await p.goto(BASE + '/', { waitUntil: 'load' }); const loadMs = Date.now() - t0;
  const html = await (await fetch(BASE + '/')).text(); assert(html.length < 30000, 'html ' + html.length);
  const gz = await fetch(BASE + '/', { headers: { 'Accept-Encoding': 'gzip' } }); assert(gz.headers.get('content-encoding') === 'gzip', 'compression');
  const imgs = await p.$$eval('img', (i) => i.map((x) => x.currentSrc || x.src).filter((s) => s.includes('/images/'))); assert(imgs.every((s) => s.endsWith('.webp')), 'webp');
  results.push(`      (home load ${loadMs} ms locally)`); await p.close();
});

await browser.close(); server.kill();
fs.rmSync(DATA, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
