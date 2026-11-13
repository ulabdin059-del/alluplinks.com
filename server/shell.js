// Server-rendered first view. Uses the same Tailwind classes as the React header and hero, so a visitor
// sees the finished design immediately (even before JavaScript loads) and the hand-over to the app is
// near-invisible. It also carries the page text and links for search engines.
import { storeStatus } from '../shared/hours.js';
import { googleRating, RATING_CLASS, STAR_PATH, G_PATHS } from '../shared/rating.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LEAF = 'M50 4 57 18 66 13 63 35 77 22 80 30 92 27 86 42 95 47 75 62 78 70 55 66 54 90 52 90 52 98 48 98 48 90 46 90 45 66 22 70 25 62 5 47 14 42 8 27 20 30 23 22 37 35 34 13 43 18Z';
const leaf = (cls) => `<svg viewBox="0 0 100 100" class="${cls}" fill="currentColor" aria-hidden="true"><path d="${LEAF}"/></svg>`;
const icon = (d, cls = 'h-5 w-5') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PHONE = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>';
const CAL = '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>';
const MENU = '<path d="M4 6h16M4 12h16M4 18h16"/>';
const PIN = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';
const ARROW = '<path d="M5 12h14M12 5l7 7-7 7"/>';
const CHEV = '<path d="m6 9 6 6 6-6"/>';
const imgSet = (k) => `/images/${k}-640.webp 640w, /images/${k}-1280.webp 1280w`;

function topBar(b, content, status) {
  return `<div class="bg-ink text-white"><div class="container-x flex items-center justify-between gap-4 py-2 text-[13px] font-medium">
<p class="flex min-w-0 items-center gap-2">${leaf('h-3.5 w-3.5 shrink-0 text-brand-400')}
<span class="truncate sm:hidden">${esc(content.announcement_short || 'Upfront prices · Book online')}</span>
<span class="hidden truncate sm:inline">${esc(content.announcement || '')}</span>
<a href="/repair-prices" class="ml-1 hidden shrink-0 items-center gap-1 font-semibold text-brand-300 hover:text-white md:inline-flex">Check your price ${icon(ARROW, 'h-3.5 w-3.5')}</a></p>
<a href="tel:${esc(b.phone_tel)}" class="shrink-0 font-semibold text-white sm:hidden">${esc(b.phone_display)}</a>
<div class="hidden shrink-0 items-center gap-5 lg:flex">${status ? `<span class="inline-flex items-center gap-2"><span class="h-2 w-2 rounded-full ${status.open ? 'bg-emerald-400' : 'bg-white/40'}" aria-hidden="true"></span>${esc(status.label)}</span>` : ''}
<span class="inline-flex items-center gap-1.5 text-white/80">${icon(PIN, 'h-3.5 w-3.5')}${esc(b.street)}, ${esc(b.city)}</span></div></div></div>`;
}

function header(b) {
  const nav = [['Prices', '/repair-prices'], ['Sell / Trade-in', '/sell'], ['Shop', '/shop'], ['Contact', '/contact']]
    .map(([l, h]) => `<a href="${h}" class="rounded-lg px-3.5 py-2 text-[15px] font-medium text-ink-600">${l}</a>`).join('');
  return `<header class="sticky top-0 z-40 border-b border-transparent bg-white/90 backdrop-blur-lg"><div class="container-x flex h-[72px] items-center justify-between gap-6">
<a href="/" aria-label="All Uplinks home"><span class="inline-flex items-center gap-2.5"><svg viewBox="0 0 40 40" class="h-9 w-9 shrink-0" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#c8102e"/><g transform="translate(7.2 6.4) scale(.256)"><path d="${LEAF}" fill="#fff"/></g></svg>
<span class="whitespace-nowrap leading-none"><span class="block font-display text-[19px] font-extrabold tracking-tight text-ink">All Uplinks</span><span class="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400 min-[380px]:text-[10.5px] min-[380px]:tracking-[0.14em]">Phone Repair · Keswick</span></span></span></a>
<nav aria-label="Main" class="hidden items-center gap-1 lg:flex"><a href="/services" class="inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[15px] font-medium text-ink-600">Repairs${icon(CHEV, 'h-4 w-4')}</a>${nav}</nav>
<div class="flex items-center gap-2"><a href="tel:${esc(b.phone_tel)}" class="hidden items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-semibold text-ink xl:inline-flex">${icon(PHONE, 'h-4 w-4 text-brand-600')}${esc(b.phone_display)}</a>
<a href="/book" class="btn-primary hidden sm:inline-flex">${icon(CAL, 'h-4 w-4')}Book a Repair</a>
<a href="tel:${esc(b.phone_tel)}" class="btn-outline px-3 sm:hidden" aria-label="Call ${esc(b.phone_display)}">${icon(PHONE)}</a>
<span class="btn-ghost px-2.5 lg:hidden" aria-hidden="true">${icon(MENU, 'h-6 w-6')}</span></div></div></header>`;
}

function ratingBadge(b) {
  const r = googleRating(b);
  if (!r) return '';
  const g = `<svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">${G_PATHS.map(([f, d]) => `<path fill="${f}" d="${d}"/>`).join('')}</svg>`;
  const stars = [1, 2, 3, 4, 5].map((i) => `<svg viewBox="0 0 20 20" class="${i <= r.stars ? 'h-4 w-4 text-amber-400' : 'h-4 w-4 text-mist-300'}" fill="currentColor"><path d="${STAR_PATH}"/></svg>`).join('');
  return `<a${r.url ? ` href="${esc(r.url)}"` : ''} target="_blank" rel="noopener noreferrer" class="${RATING_CLASS} transition hover:ring-brand-200" aria-label="Rated ${esc(r.value)} out of 5 on Google, ${esc(r.count)}">${g}<span class="font-bold text-ink">${esc(r.value)}</span><span class="inline-flex gap-0.5" aria-hidden="true">${stars}</span><span class="text-ink-500">${esc(r.count)}</span></a>`;
}

function homeHero(b, content, status) {
  const t = content.hero_title || '';
  const i = t.indexOf(' — ');
  const [lead, accent] = i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ''];
  const trust = ['Exact prices by model', 'Most repairs under an hour', 'Book online 24/7']
    .map((x) => `<li class="inline-flex items-center gap-1.5"><span class="h-4 w-4 rounded-full bg-brand-100" aria-hidden="true"></span>${x}</li>`).join('');
  return `<section class="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white"><div class="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true"></div>
<div class="container-x relative grid items-center gap-8 pb-12 pt-8 sm:gap-10 sm:pb-16 sm:pt-12 lg:grid-cols-[1.2fr_.8fr] lg:gap-14 lg:pb-24 lg:pt-16"><div>
<p class="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm ring-1 ring-mist-200"><span class="inline-flex items-center gap-1.5 text-brand-700">${leaf('h-3.5 w-3.5')}${esc(content.hero_eyebrow || 'Keswick, Ontario')}</span>${status ? `<span class="text-mist-300" aria-hidden="true">|</span><span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full ${status.open ? 'bg-emerald-500' : 'bg-ink-300'}" aria-hidden="true"></span>${esc(status.label)}</span>` : ''}</p>
<h1 class="mt-5 text-balance text-[2.3rem] font-extrabold leading-[1.06] tracking-tight min-[380px]:text-[2.55rem] sm:text-[3.25rem] lg:text-[3.45rem] xl:text-[3.9rem]">${esc(lead)}${accent ? `<span class="mt-1 block text-brand-600">${esc(accent)}</span>` : ''}</h1>
<p class="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-500 sm:text-lg">${esc(content.hero_subtitle || '')}</p>${ratingBadge(b)}
<div class="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"><a href="/book" class="btn-primary btn-lg px-4 sm:px-7">${icon(CAL)}Book a Repair</a><a href="tel:${esc(b.phone_tel)}" class="btn-dark btn-lg px-4 sm:px-7">${icon(PHONE)}Call Now</a></div>
<a href="/repair-prices" class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">Or see your exact price in 30 seconds${icon(ARROW, 'h-4 w-4')}</a>
<ul class="mt-7 flex flex-col gap-2 text-sm font-medium text-ink-600 sm:flex-row sm:flex-wrap sm:gap-x-5">${trust}</ul></div>
<div class="relative"><div class="overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200 lg:rounded-[2rem]"><img src="/images/hero-technician-1280.webp" srcset="${imgSet('hero-technician')}" sizes="(min-width:1024px) 38vw, 100vw" alt="All Uplinks technician repairing an opened smartphone at the bench" fetchpriority="high" decoding="async" class="object-cover aspect-[16/10] w-full lg:aspect-[4/4.4]"></div>
<div class="absolute bottom-3 left-3 w-60 rounded-2xl bg-white/95 p-3.5 shadow-lift ring-1 ring-mist-200 backdrop-blur sm:bottom-4 sm:left-4 sm:w-64 lg:-bottom-6 lg:-left-8 lg:w-72 lg:p-4"><p class="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Example · iPhone 15</p>
<div class="mt-1.5 grid grid-cols-2 gap-3"><div><p class="text-xs text-ink-500">Screen</p><p class="font-display text-lg font-extrabold sm:text-xl"><span class="inline-block h-6 w-14 animate-pulse rounded bg-mist-200 align-middle"></span></p></div><div><p class="text-xs text-ink-500">Battery</p><p class="font-display text-lg font-extrabold sm:text-xl"><span class="inline-block h-6 w-14 animate-pulse rounded bg-mist-200 align-middle"></span></p></div></div></div></div>
</div></section>`;
}

function pageHero(m) {
  return `<section class="relative overflow-hidden border-b border-mist-200 bg-gradient-to-b from-brand-50/70 to-white"><div class="bg-grid absolute inset-0 opacity-60" aria-hidden="true"></div>
<div class="container-x relative py-12 sm:py-16 lg:py-20"><div class="max-w-2xl"><h1 class="text-4xl font-extrabold leading-[1.08] sm:text-5xl">${esc(m.h1)}</h1>${m.intro ? `<p class="lead mt-5 max-w-xl">${esc(m.intro.length > 260 ? m.intro.slice(0, 257) + '…' : m.intro)}</p>` : ''}</div></div></section>`;
}

/** Returns the markup placed inside <div id="root"> for a server-rendered page. */
export function renderShell({ business: b, content, hours, m, isHome }) {
  const status = storeStatus(hours);
  const links = [['Home', '/'], ['Repair prices', '/repair-prices'], ['Book a repair', '/book'], ['Sell / Trade-in', '/sell'], ['Shop', '/shop'], ['Contact', '/contact'], ...(m.links || [])];
  // Below the first screen: the page's links and the store details, laid out like the footer (crawlable, and out of view until scrolled).
  const more = `<div class="border-t border-mist-200 bg-mist-50"><div class="container-x py-14"><nav aria-label="Site"><ul class="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3 lg:grid-cols-4">${links
    .map(([n, h]) => `<li><a href="${esc(h)}" class="text-ink-600">${esc(n)}</a></li>`).join('')}</ul></nav>
<p class="mt-8 text-sm text-ink-600"><strong class="text-ink">${esc(b.legal_name)}</strong> — ${esc(b.street)}, ${esc(b.city)}, ${esc(b.region_name)} · <a href="tel:${esc(b.phone_tel)}" class="font-semibold text-ink">${esc(b.phone_display)}</a></p></div></div>`;
  return `<div class="flex min-h-screen flex-col" data-shell="">${topBar(b, content, status)}${header(b)}<main id="main" class="flex-1">${isHome ? homeHero(b, content, status) : pageHero(m)}<div class="min-h-[40vh]"></div></main>${more}</div>`;
}
