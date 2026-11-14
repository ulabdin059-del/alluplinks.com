// Server-rendered <head> metadata, JSON-LD and crawlable fallback content for every public route.
import { db, j as parseJson, getSetting } from './db.js';
import { renderShell } from './shell.js';
// Accepts either a JSON string (raw row) or an already-parsed value (cached row).
const j = (v, f) => (typeof v === 'string' ? parseJson(v, f) : v ?? f);
import { SHOP_CATEGORIES, SHOP_BRANDS } from '../shared/constants.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const img = (key) => (!key ? '' : key.startsWith('/') || key.startsWith('http') ? key : `/images/${key}-1280.webp`);

function business() {
  const b = getSetting('business');
  const hours = getSetting('hours') || [];
  const o = {
    '@context': 'https://schema.org', '@type': ['LocalBusiness', 'ElectronicsStore'], '@id': b.site_url + '/#business',
    name: b.legal_name || b.name, alternateName: b.name, url: b.site_url + '/', telephone: b.phone_tel,
    image: b.site_url + '/images/hero-technician-1280.webp', logo: b.site_url + '/logo.svg',
    address: { '@type': 'PostalAddress', streetAddress: b.street, addressLocality: b.city, addressRegion: b.region, addressCountry: b.country, ...(b.postal_code ? { postalCode: b.postal_code } : {}) },
    hasMap: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.maps_query),
    areaServed: ['Keswick', 'Georgina', 'Sutton', 'Pefferlaw', 'Queensville', 'Holland Landing', 'York Region'].map((n) => ({ '@type': 'Place', name: n + ', ON' })),
    currenciesAccepted: 'CAD',
    makesOffer: ['Phone screen replacement', 'Phone battery replacement', 'Charging port repair', 'Back glass replacement', 'Water damage repair', 'Device trade-in'].map((n) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n } }))
  };
  if (b.email) o.email = b.email;
  if (b.google_review_url) o.sameAs = [b.google_review_url];
  const open = hours.filter((h) => !h.closed && h.open && h.close);
  if (open.length) o.openingHoursSpecification = open.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.day, opens: h.open, closes: h.close }));
  return o;
}
const crumbs = (site, items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: [['Home', '/'], ...items].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: site + p })) });
const faqLd = (faqs) => faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;

async function servicePriceRange(svc) {
  const src = j(svc.price_source, {});
  if (!src.categories?.length) return null;
  const r = await db.get(`SELECT MIN(p.price) lo, MAX(p.price) hi, COUNT(*) n FROM prices p JOIN models m ON m.id = p.model_id JOIN brands b ON b.id = m.brand_id
    JOIN categories c ON c.id = b.category_id JOIN repair_types r ON r.id = p.repair_type_id
    WHERE c.slug IN (${src.categories.map(() => '?').join(',')}) AND r.key IN (${src.repairs.map(() => '?').join(',')})`, ...src.categories, ...src.repairs);
  return r && r.n ? r : null;
}

async function meta(pathname, preload) {
  const b = getSetting('business');
  const seo = getSetting('seo');
  const site = b.site_url.replace(/\/$/, '');
  const services = preload.services;
  const svcLinks = services.map((s) => [s.name, '/services/' + s.slug]);
  const base = { status: 200, image: seo.og_image, ld: [business()], links: svcLinks };
  const loc = `${b.city}, ${b.region_name}`;
  const p = pathname.replace(/\/+$/, '') || '/';

  if (p === '/') {
    const faqs = await db.all("SELECT question q, answer a FROM faqs WHERE active = 1 AND page = 'general' ORDER BY sort, id");
    return { ...base, title: seo.default_title, description: seo.default_description, h1: getSetting('content').hero_title,
      intro: getSetting('content').hero_subtitle, ld: [business(), faqLd(faqs)].filter(Boolean) };
  }
  if (p === '/services') return { ...base, title: `Phone, Tablet & Laptop Repair Services in ${b.city}, ON | All Uplinks`,
    description: `All repair services at All Uplinks in ${loc}: iPhone and Samsung screens and batteries, charging ports, back glass, water damage, micro soldering, data recovery, iPad, laptop, MacBook and console repair.`,
    h1: 'Repair services', intro: 'Every repair we offer, with model-specific pricing in CAD.', ld: [business(), crumbs(site, [['Services', '/services']])] };
  const sm = p.match(/^\/services\/([a-z0-9-]+)$/);
  if (sm) {
    const s = services.find((x) => x.slug === sm[1]);
    if (!s) return null;
    const range = await servicePriceRange(s);
    const faqs = j(s.faqs, []);
    const svc = { '@context': 'https://schema.org', '@type': 'Service', name: s.name, serviceType: s.name, description: s.short,
      provider: { '@id': site + '/#business' }, areaServed: { '@type': 'City', name: loc }, url: site + p, image: site + img(s.image) };
    if (range) svc.offers = { '@type': 'AggregateOffer', priceCurrency: 'CAD', lowPrice: range.lo, highPrice: range.hi, offerCount: range.n };
    return { ...base, title: s.meta_title || `${s.name} in ${loc} | All Uplinks`, description: s.meta_description || s.short, image: img(s.image),
      h1: `${s.name} in ${b.city}`, intro: s.description, ld: [business(), svc, crumbs(site, [['Services', '/services'], [s.name, p]]), faqLd(faqs)].filter(Boolean) };
  }
  if (p === '/repair-prices') return { ...base, title: `Phone Repair Prices in ${b.city}, ON — Instant Quote | All Uplinks`,
    description: 'Get the repair price range for your iPhone, Samsung, Pixel, iPad, laptop, MacBook or game console in CAD. Choose your model and repair to see your price and repair time.',
    h1: 'Repair price calculator', intro: 'Choose your device, model and repair to see your price in CAD.', ld: [business(), crumbs(site, [['Repair prices', '/repair-prices']])] };
  if (p === '/book') return { ...base, title: `Book a Phone Repair in ${b.city} | All Uplinks`,
    description: `Book your phone, tablet, laptop or console repair online at All Uplinks, ${b.street}, ${loc}. Choose your repair, see your estimate and pick a time.`,
    h1: 'Book a repair', intro: 'Pick your device and repair, choose a time, and we\u2019ll have everything ready.', ld: [business(), crumbs(site, [['Book a repair', '/book']])] };
  if (p === '/sell') return { ...base, title: `Sell or Trade In Your Phone in ${b.city} | All Uplinks`, image: img('tradein-iphones'),
    description: 'Get an instant trade-in estimate for your iPhone, Samsung Galaxy, Google Pixel or tablet. Bring it to All Uplinks in Keswick for inspection and a final offer.',
    h1: 'Sell or trade in your phone', intro: 'Instant estimate online. Final offer after in-store inspection.', ld: [business(), crumbs(site, [['Sell / Trade-in', '/sell']])] };
  if (p === '/shop') return { ...base, title: `Phones & Accessories in ${b.city} | All Uplinks Shop`, image: img('shop-hero'),
    description: 'New and pre-owned iPhone and Samsung phones, cases, screen protectors, chargers, cables and wireless accessories at All Uplinks in Keswick, Ontario.',
    h1: 'Shop phones & accessories', intro: 'New and pre-owned smartphones and the accessories to go with them.',
    links: SHOP_CATEGORIES.map((c) => [c.name, '/shop/' + c.slug]), ld: [business(), crumbs(site, [['Shop', '/shop']])] };
  const cm = p.match(/^\/shop\/([a-z0-9-]+)$/);
  if (cm) {
    const c = SHOP_CATEGORIES.find((x) => x.slug === cm[1]) || SHOP_BRANDS.find((x) => x.slug === cm[1]);
    if (!c) return null;
    return { ...base, title: `${c.name} in ${b.city}, ON | All Uplinks`, image: img(c.image || 'shop-hero'), description: `${c.name} at All Uplinks, ${b.street}, ${loc}. ${c.blurb || ''}`.trim(),
      h1: c.name, intro: c.blurb || '', ld: [business(), crumbs(site, [['Shop', '/shop'], [c.name, p]])] };
  }
  const pm = p.match(/^\/shop\/product\/([a-z0-9-]+)$/);
  if (pm) {
    const pr = preload.products.find((x) => x.slug === pm[1]);
    if (!pr) return null;
    const images = j(pr.images, []);
    const prod = { '@context': 'https://schema.org', '@type': 'Product', name: pr.name, description: pr.description, image: images.map((i) => site + img(i)),
      brand: pr.brand && pr.brand !== 'Assorted' ? { '@type': 'Brand', name: pr.brand } : undefined, url: site + p,
      itemCondition: pr.condition === 'pre-owned' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition' };
    if (pr.price != null) prod.offers = { '@type': 'Offer', price: pr.price, priceCurrency: 'CAD', url: site + p, seller: { '@id': site + '/#business' },
      itemCondition: prod.itemCondition };
    return { ...base, title: `${pr.name} | All Uplinks ${b.city}`, description: `${pr.short} Available at All Uplinks, ${loc}.`, image: img(images[0]),
      h1: pr.name, intro: pr.description, ld: [business(), prod, crumbs(site, [['Shop', '/shop'], [pr.name, p]])] };
  }
  if (p === '/contact') return { ...base, title: `Contact & Directions — Phone Repair ${b.city} | All Uplinks`,
    description: `Call All Uplinks at ${b.phone_display} or visit us at ${b.street}, ${loc}. Directions, map and contact form.`,
    h1: 'Contact All Uplinks', intro: `${b.legal_name}, ${b.street}, ${loc}. Phone ${b.phone_display}.`, ld: [business(), crumbs(site, [['Contact', '/contact']])] };
  if (p === '/faq') {
    const faqs = await db.all('SELECT question q, answer a FROM faqs WHERE active = 1 ORDER BY sort, id');
    return { ...base, title: `Phone Repair FAQ | All Uplinks ${b.city}`, description: 'Answers to common questions about phone repair prices, repair times, data, water damage and trade-ins at All Uplinks in Keswick.',
      h1: 'Frequently asked questions', intro: '', ld: [business(), faqLd(faqs), crumbs(site, [['FAQ', '/faq']])].filter(Boolean) };
  }
  if (p === '/about') return { ...base, title: `About All Uplinks — Phone Repair in ${b.city}, ON`, image: img('store-counter'),
    description: getSetting('content').about_body.slice(0, 155), h1: getSetting('content').about_title, intro: getSetting('content').about_body, ld: [business(), crumbs(site, [['About', '/about']])] };
  if (p === '/reviews') return { ...base, title: `Customer Reviews | All Uplinks ${b.city}`, description: `Read and leave reviews for All Uplinks phone repair in ${loc}.`,
    h1: 'Customer reviews', intro: '', ld: [business(), crumbs(site, [['Reviews', '/reviews']])] };
  if (p === '/privacy') return { ...base, title: 'Privacy Policy | All Uplinks', description: 'How All Uplinks collects, uses and protects the personal information you share through bookings, trade-ins and inquiries.', h1: 'Privacy policy', intro: '' };
  if (p === '/terms') return { ...base, title: 'Terms of Service | All Uplinks', description: 'Terms that apply to repairs, bookings, trade-ins and purchases at All Uplinks in Keswick, Ontario.', h1: 'Terms of service', intro: '' };
  if (p.startsWith('/admin')) return { ...base, title: 'Admin | All Uplinks', description: 'All Uplinks admin dashboard.', noindex: true, h1: 'Admin', intro: '', ld: [] };
  return null;
}

export async function renderPage(pathname, template, preload) {
  const b = getSetting('business');
  const site = b.site_url.replace(/\/$/, '');
  let m = await meta(pathname, preload);
  let status = 200;
  if (!m) { status = 404; m = { title: 'Page not found | All Uplinks', description: 'This page could not be found.', noindex: true, h1: 'Page not found', intro: '', ld: [], links: [], image: getSetting('seo').og_image }; }
  const canonical = site + (pathname.replace(/\/+$/, '') || '/');
  const image = m.image ? (m.image.startsWith('http') ? m.image : site + m.image) : '';
  const head = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    m.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">',
    status === 200 ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    '<meta property="og:type" content="website">', '<meta property="og:site_name" content="All Uplinks">', '<meta property="og:locale" content="en_CA">',
    `<meta property="og:title" content="${esc(m.title)}">`, `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(canonical)}">`, image ? `<meta property="og:image" content="${esc(image)}">` : '',
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${esc(m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`, image ? `<meta name="twitter:image" content="${esc(image)}">` : '',
    '<meta name="geo.region" content="CA-ON">', `<meta name="geo.placename" content="${esc(b.city)}">`,
    ...(m.ld || []).map(ld)
  ].filter(Boolean).join('\n    ');
  const site_data = preload.site;
  const body = renderShell({ business: b, content: getSetting('content') || {}, hours: getSetting('hours') || [], m, isHome: (pathname.replace(/\/+$/, '') || '/') === '/' });
  // Store settings the app needs on its first render, so it never shows placeholder text (not executed: type is JSON).
  const boot = site_data ? `<script type="application/json" id="__SITE__">${JSON.stringify(site_data).replace(/</g, '\\u003c')}</script>` : '';
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace('<!--app-head-->', head)
    .replace('<!--app-body-->', body)
    .replace('</body>', `${boot}\n  </body>`);
  return { status, html };
}

export async function sitemapXml() {
  const site = getSetting('business').site_url.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const urls = [['/', '1.0'], ['/repair-prices', '0.9'], ['/book', '0.9'], ['/services', '0.9'], ['/sell', '0.8'], ['/shop', '0.7'],
    ['/contact', '0.8'], ['/faq', '0.6'], ['/about', '0.5'], ['/reviews', '0.5'], ['/privacy', '0.2'], ['/terms', '0.2']];
  for (const s of await db.all('SELECT slug FROM services WHERE active = 1 ORDER BY sort')) urls.push(['/services/' + s.slug, '0.8']);
  for (const c of [...SHOP_CATEGORIES, ...SHOP_BRANDS]) urls.push(['/shop/' + c.slug, '0.6']);
  for (const p of await db.all('SELECT slug FROM products WHERE active = 1 ORDER BY sort')) urls.push(['/shop/product/' + p.slug, '0.5']);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([u, pr]) => `  <url><loc>${site}${u}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`;
}
