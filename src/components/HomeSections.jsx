import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck } from 'lucide-react';
import { useCatalog, useSite } from '../lib/site.jsx';
import { cx, money, range } from '../lib/utils.js';
import { Img, SectionHeading } from './ui.jsx';
import { bookHref } from './PriceCalculator.jsx';

const minPrice = (cat) => {
  let m = Infinity;
  for (const b of cat.brands) for (const mod of b.models) for (const p of Object.values(mod.prices)) m = Math.min(m, p);
  return Number.isFinite(m) ? m : null;
};

// Image tile for every device category; each opens the calculator pre-set to that device.
export function DevicesGrid() {
  const { catalog } = useCatalog();
  const cats = catalog?.categories || [];
  return (
    <section className="section pb-8 sm:pb-10" aria-labelledby="devices-heading">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="What we fix" title={<span id="devices-heading">Choose your device</span>}>Phones, tablets, laptops and game consoles — tap your device to see every repair and its price.</SectionHeading>
          <Link to="/repair-prices" className="btn-outline reveal shrink-0">Open price calculator<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {!cats.length && Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-mist-100" />)}
          {cats.map((c, i) => {
            const from = minPrice(c);
            return (
              <Link key={c.slug} to={`/repair-prices?category=${c.slug}`}
                className={cx('reveal group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl p-4 ring-1 ring-mist-200 transition hover:-translate-y-0.5 hover:shadow-lift',
                  i === 0 ? 'col-span-2 min-h-[260px] sm:col-span-1 sm:min-h-[190px] lg:col-span-2 lg:row-span-2 lg:p-6' : 'min-h-[170px] sm:min-h-[190px]')}>
                <Img k={c.image} alt={`${c.name} repair`} className="absolute inset-0 -z-10 h-full w-full transition duration-700 group-hover:scale-105" sizes={i === 0 ? '(min-width:1024px) 50vw, 100vw' : '(min-width:1024px) 25vw, 50vw'} />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" aria-hidden="true" />
                <span className={cx('font-display font-bold text-white', i === 0 ? 'text-2xl lg:text-3xl' : 'text-lg')}>{c.name}</span>
                <span className="mt-0.5 text-xs text-white/80">{from != null ? `Repairs from ${money(from)}` : 'Quoted after diagnosis'}</span>
                {i === 0 && <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white">See iPhone prices<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const TABS = [
  { slug: 'iphone', label: 'iPhone', models: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15', 'iPhone 14', 'iPhone 13', 'iPhone 12', 'iPhone 11'] },
  { slug: 'samsung', label: 'Samsung', models: ['Galaxy S25 Ultra', 'Galaxy S25', 'Galaxy S24 Ultra', 'Galaxy S24', 'Galaxy S23 Ultra', 'Galaxy S23', 'Galaxy S22', 'Galaxy A54', 'Galaxy A15'] },
  { slug: 'google-pixel', label: 'Google Pixel', models: ['Pixel 9 Pro', 'Pixel 9', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 7'] }
];
const COLS = [['screen', 'Screen'], ['battery', 'Battery'], ['port', 'Charging port'], ['back', 'Back glass']];

// Quick price table for the most-requested phones; values come straight from the price database.
export function PopularPrices() {
  const { catalog } = useCatalog();
  const { pricing } = useSite();
  const [tab, setTab] = useState(0);
  const variance = catalog?.pricing?.variance ?? pricing?.variance ?? 0;
  const t = TABS[tab];
  const cat = catalog?.categories.find((c) => c.slug === t.slug);
  const brand = cat?.brands[0];
  const rows = t.models.map((name) => brand?.models.find((m) => m.name === name)).filter(Boolean);
  return (
    <section className="section pt-8 sm:pt-10" aria-labelledby="popular-prices">
      <div className="container-x">
        <SectionHeading eyebrow="Price list" title={<span id="popular-prices">Popular repair prices</span>}>Prices for the phones we see most. Every other model is in the calculator below.</SectionHeading>
        <div className="reveal mt-8 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-mist-200">
          <div className="flex gap-1 overflow-x-auto border-b border-mist-200 bg-mist-50 p-2 no-scrollbar" role="tablist" aria-label="Phone brand">
            {TABS.map((x, i) => (
              <button key={x.slug} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                className={cx('shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition', tab === i ? 'bg-white text-ink shadow-sm ring-1 ring-mist-200' : 'text-ink-500 hover:text-ink')}>{x.label}</button>
            ))}
          </div>
          {/* Phones: one card per model */}
          <ul className="divide-y divide-mist-200 sm:hidden" role="tabpanel">
            {!catalog && <li className="px-4 py-8 text-center text-sm text-ink-400">Loading prices…</li>}
            {rows.map((m) => (
              <li key={m.id} className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{m.name}</p>
                  <Link to={bookHref({ category: t.slug, brand: brand.name, model: m.name })} className="btn-outline btn-sm">Book</Link>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-2">
                  {COLS.map(([k, l]) => (
                    <div key={k} className="rounded-lg bg-mist-50 px-3 py-2 ring-1 ring-mist-200">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{l}</dt>
                      <dd className="text-sm font-semibold tabular-nums text-ink">{m.prices[k] != null ? range(m.prices[k], m.prices[k] + variance) : '—'}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block" role="tabpanel">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="text-xs uppercase tracking-wider text-ink-400">
                <th scope="col" className="px-5 py-3 font-semibold">Model</th>
                {COLS.map(([, l]) => <th key={l} scope="col" className="px-5 py-3 font-semibold">{l}</th>)}
                <th scope="col" className="px-5 py-3"><span className="sr-only">Book</span></th>
              </tr></thead>
              <tbody className="divide-y divide-mist-200">
                {!catalog && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">Loading prices…</td></tr>}
                {rows.map((m) => (
                  <tr key={m.id} className="transition hover:bg-brand-50/40">
                    <th scope="row" className="whitespace-nowrap px-5 py-3.5 font-semibold text-ink">{m.name}</th>
                    {COLS.map(([k]) => <td key={k} className="whitespace-nowrap px-5 py-3.5 tabular-nums text-ink-700">{m.prices[k] != null ? range(m.prices[k], m.prices[k] + variance) : <span className="text-ink-300">—</span>}</td>)}
                    <td className="px-5 py-3.5 text-right"><Link to={bookHref({ category: t.slug, brand: brand.name, model: m.name })} className="btn-outline btn-sm"><CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />Book</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-mist-200 bg-mist-50 px-5 py-3 text-xs text-ink-500">Prices in CAD before tax. {catalog?.pricing?.note}</p>
        </div>
      </div>
    </section>
  );
}
