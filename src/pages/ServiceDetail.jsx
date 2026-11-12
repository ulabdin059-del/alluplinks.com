import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Phone, CheckCircle2, Clock, Search, Stethoscope, Info, ArrowRight } from 'lucide-react';
import { useSite, useSeo, useCatalog } from '../lib/site.jsx';
import { useFetch, useReveal, telHref, money, range, cx } from '../lib/utils.js';
import { api } from '../lib/api.js';
import { Img, Accordion, WarrantyNote } from '../components/ui.jsx';
import Spinner from '../components/Spinner.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { bookHref } from '../components/PriceCalculator.jsx';
import { FinalCta } from './Home.jsx';
import NotFound from './NotFound.jsx';

function PriceTable({ table, variance, note }) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const groups = [...new Set(table.rows.map((r) => r.category))];
  const rows = useMemo(() => table.rows.filter((r) => (!group || r.category === group) && r.model.toLowerCase().includes(q.trim().toLowerCase())), [table, q, group]);
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-mist-200 bg-mist-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input type="search" className="input pl-10" placeholder="Search your model" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search models in price table" />
        </div>
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by device">
            {['', ...groups].map((g) => <button key={g || 'all'} type="button" aria-pressed={group === g} onClick={() => setGroup(g)}
              className={cx('rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition', group === g ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-600 ring-mist-300 hover:ring-brand-300')}>{g || 'All'}</button>)}
          </div>
        )}
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e7edf4]">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold text-ink-500">Model</th>
              {table.repairs.map((r) => <th key={r.key} scope="col" className="px-5 py-3 font-semibold text-ink-500">{r.name}{r.time && <span className="block text-xs font-normal text-ink-400">{r.time}</span>}</th>)}
              <th scope="col" className="px-5 py-3"><span className="sr-only">Book</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist-200">
            {rows.map((r) => (
              <tr key={r.category + r.brand + r.model} className="transition hover:bg-brand-50/40">
                <th scope="row" className="px-5 py-3 font-semibold text-ink">{r.model}{r.brand !== 'Apple' && !r.model.includes(r.brand) && groups.length > 1 && <span className="ml-1 font-normal text-ink-400">· {r.brand}</span>}</th>
                {table.repairs.map((rt) => <td key={rt.key} className="px-5 py-3 tabular-nums text-ink-700">{r.prices[rt.key] != null ? range(r.prices[rt.key], r.prices[rt.key] + variance) : <span className="text-ink-300">—</span>}</td>)}
                <td className="px-5 py-3 text-right"><Link to={bookHref({ category: r.category_slug, brand: r.brand, model: r.model, repair: table.repairs.length === 1 ? table.repairs[0].key : '' })} className="btn-outline btn-sm">Book</Link></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={table.repairs.length + 2} className="px-5 py-10 text-center text-ink-500">No models match your search.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="flex gap-2 border-t border-mist-200 bg-mist-50 px-5 py-4 text-xs leading-relaxed text-ink-500"><Info className="h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />Prices in CAD. {note}</p>
    </div>
  );
}

export default function ServiceDetail() {
  const { slug } = useParams();
  const { business: b, pricing } = useSite();
  const { data: s, error, loading } = useFetch(() => api('/services/' + slug), [slug]);
  const { data: all } = useFetch(() => api('/services'), []);
  const { catalog } = useCatalog();
  const ref = useReveal();
  useSeo(s?.meta_title || (s ? `${s.name} in Keswick | All Uplinks` : 'All Uplinks'), s?.meta_description || s?.short, `/services/${slug}`);

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
  if (error?.status === 404 || !s) return <NotFound />;
  const variance = pricing?.variance ?? 0;
  const from = s.price_table?.rows.length ? Math.min(...s.price_table.rows.flatMap((r) => Object.values(r.prices))) : null;
  const firstCat = s.price_source?.categories?.[0];
  const related = (all || []).filter((x) => x.slug !== s.slug).slice(0, 4);

  return (
    <div ref={ref}>
      <section className="relative overflow-hidden border-b border-mist-200 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-x grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-2 lg:py-16">
          <div>
            <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-500">
              <ol className="flex flex-wrap items-center gap-1.5"><li><Link to="/" className="hover:text-brand-700">Home</Link></li><li aria-hidden="true">/</li>
                <li><Link to="/services" className="hover:text-brand-700">Services</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="text-ink-700">{s.name}</li></ol>
            </nav>
            <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl">{s.name} <span className="text-brand-600">in Keswick</span></h1>
            <p className="lead mt-5 max-w-xl">{s.short}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {from != null ? <span className="chip bg-white text-sm ring-1 ring-mist-200">From <strong className="text-ink">{money(from)}</strong> CAD</span>
                : <span className="chip bg-white text-sm ring-1 ring-mist-200"><Stethoscope className="h-4 w-4 text-brand-600" aria-hidden="true" />Quoted after diagnosis</span>}
              {s.time_estimate && <span className="chip bg-white text-sm ring-1 ring-mist-200"><Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />Typical time {s.time_estimate}</span>}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={bookHref({ category: firstCat, repair: s.price_source?.repairs?.length === 1 ? s.price_source.repairs[0] : '' })} className="btn-primary btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book Repair</Link>
              <a href={telHref(b)} className="btn-outline btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />{b.phone_display}</a>
            </div>
            <WarrantyNote className="mt-5" />
          </div>
          <div className="overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200">
            <Img k={s.image} alt={s.image_alt || s.name} priority className="aspect-[4/3] w-full" sizes="(min-width:1024px) 50vw, 100vw" />
          </div>
        </div>
      </section>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1.1fr_.9fr]">
        <div className="reveal">
          <h2 className="text-2xl font-extrabold sm:text-3xl">About this repair</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{s.description}</p>
          {s.price_note && <p className="mt-6 flex gap-3 rounded-2xl bg-brand-50 p-5 text-[15px] leading-relaxed text-ink-700 ring-1 ring-brand-100"><Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />{s.price_note}</p>}
        </div>
        <div className="reveal card p-6 sm:p-8">
          <h2 className="text-xl font-bold">Repair benefits</h2>
          <ul className="mt-5 space-y-3.5">
            {s.benefits.map((x) => <li key={x} className="flex gap-3 text-[15px] text-ink-600"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />{x}</li>)}
          </ul>
        </div>
      </section>

      {s.price_table?.rows.length > 0 && (
        <section className="bg-mist-100/70 py-16" aria-labelledby="prices">
          <div className="container-x">
            <div className="reveal flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><h2 id="prices" className="text-2xl font-extrabold sm:text-3xl">{s.name} prices</h2>
                <p className="mt-2 text-ink-500">Advertised prices for each model we stock parts for.</p></div>
              <Link to={`/repair-prices${firstCat ? `?category=${firstCat}` : ''}`} className="btn-outline shrink-0">Open price calculator<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <div className="reveal mt-8"><PriceTable table={s.price_table} variance={variance} note={pricing?.note} /></div>
          </div>
        </section>
      )}

      {s.faqs?.length > 0 && (
        <section className="container-x grid gap-10 py-16 lg:grid-cols-[.8fr_1.2fr]">
          <h2 className="reveal text-2xl font-extrabold sm:text-3xl">{s.name}: common questions</h2>
          <div className="reveal"><Accordion items={s.faqs} /></div>
        </section>
      )}

      {related.length > 0 && catalog && (
        <section className="container-x pb-8 pt-4">
          <h2 className="reveal text-2xl font-extrabold">Other repairs</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ServiceCard key={x.slug} s={x} catalog={catalog} />)}</div>
        </section>
      )}
      <FinalCta />
    </div>
  );
}
