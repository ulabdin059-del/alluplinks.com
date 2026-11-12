import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Clock, Search, Stethoscope, CalendarCheck, Phone, Info, RotateCcw } from 'lucide-react';
import { useCatalog, useSite } from '../lib/site.jsx';
import { cx, money, range, imgSrc, telHref } from '../lib/utils.js';
import Spinner from './Spinner.jsx';
import { WarrantyNote } from './ui.jsx';

const STEPS = ['Device', 'Brand', 'Model', 'Repair', 'Your price'];

export function bookHref({ category, brand, model, repair }) {
  const q = new URLSearchParams();
  if (category) q.set('category', category);
  if (brand) q.set('brand', brand);
  if (model) q.set('model', model);
  if (repair) q.set('repair', repair);
  return '/book' + (q.toString() ? '?' + q : '');
}

export default function PriceCalculator({ syncUrl = false, headingLevel = 'h2' }) {
  const { catalog, error } = useCatalog();
  const { business, pricing } = useSite();
  const [params, setParams] = useSearchParams();
  const [sel, setSel] = useState(() => syncUrl
    ? { category: params.get('category') || '', brand: params.get('brand') || '', model: params.get('model') || '', repair: params.get('repair') || '' }
    : { category: '', brand: '', model: '', repair: '' });
  const [query, setQuery] = useState('');
  const [customModel, setCustomModel] = useState('');
  const topRef = useRef(null);
  const H = headingLevel;

  const cat = catalog?.categories.find((c) => c.slug === sel.category);
  const brand = cat?.brands.find((b) => b.name === sel.brand);
  const model = brand?.models.find((m) => m.name === sel.model);
  const freeModel = brand && brand.models.length === 0;
  const repairTypes = (cat && catalog.repairTypes[cat.device_type]) || [];
  const repair = repairTypes.find((r) => r.key === sel.repair);
  const variance = catalog?.pricing?.variance ?? pricing?.variance ?? 0;

  // Auto-select the brand when a category has exactly one brand (e.g. iPhone → Apple).
  useEffect(() => {
    if (cat && cat.brands.length === 1 && sel.brand !== cat.brands[0].name) setSel((s) => ({ ...s, brand: cat.brands[0].name }));
  }, [cat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!syncUrl) return;
    const q = {}; for (const [k, v] of Object.entries(sel)) if (v) q[k] = v;
    setParams(q, { replace: true });
  }, [sel, syncUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = !cat ? 0 : !brand ? 1 : !sel.model ? 2 : !repair ? 3 : 4;
  const price = model && repair && model.prices[repair.key] != null ? model.prices[repair.key] : null;

  const choose = (patch) => {
    setSel((s) => ({ ...s, ...patch }));
    setQuery('');
    if (topRef.current && topRef.current.getBoundingClientRect().top < 0) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const back = () => {
    if (step === 4) choose({ repair: '' });
    else if (step === 3) choose({ model: '', repair: '' });
    else if (step === 2) choose(cat.brands.length === 1 ? { category: '', brand: '' } : { brand: '' });
    else if (step === 1) choose({ category: '' });
  };
  const reset = () => { choose({ category: '', brand: '', model: '', repair: '' }); setCustomModel(''); };

  const models = useMemo(() => {
    const list = brand?.models || [];
    const q = query.trim().toLowerCase();
    return q ? list.filter((m) => m.name.toLowerCase().includes(q)) : list;
  }, [brand, query]);

  if (error) return <div className="card p-8 text-center text-ink-500">We couldn’t load prices right now. Please call <a className="font-semibold text-brand-700" href={telHref(business)}>{business.phone_display}</a> for a quote.</div>;
  if (!catalog) return <div className="card grid min-h-[420px] place-items-center"><Spinner label="Loading prices" /></div>;

  return (
    <div ref={topRef} className="scroll-mt-28 overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-mist-200">
      {/* Progress */}
      <div className="border-b border-mist-200 bg-mist-50/80 px-4 py-4 sm:px-8">
        <ol className="flex items-center gap-2 overflow-x-auto no-scrollbar" aria-label="Calculator progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-2">
              <span className={cx('grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition',
                i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-ink text-white' : 'bg-white text-ink-400 ring-1 ring-mist-300')}
                aria-current={i === step ? 'step' : undefined}>
                {i < step ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cx('text-sm font-medium', i === step ? 'text-ink' : 'text-ink-400', i !== step && 'hidden sm:inline')}>{s}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-ink-300" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px]">
        <div className="min-h-[420px] p-4 sm:p-8" aria-live="polite">
          {step > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={back} className="btn-ghost btn-sm -ml-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</button>
              {cat && <img src={imgSrc(cat.image, 640)} alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-mist-200 lg:hidden" />}
              {cat && <span className="chip">{cat.name}</span>}
              {brand && cat.brands.length > 1 && <span className="chip">{brand.name}</span>}
              {sel.model && <span className="chip">{sel.model}</span>}
            </div>
          )}

          {step === 0 && (
            <>
              <H className="text-xl font-bold sm:text-2xl">What do you need repaired?</H>
              <p className="mt-1 text-sm text-ink-500">Select your device type to get started.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {catalog.categories.map((c) => (
                  <button key={c.slug} type="button" onClick={() => choose({ category: c.slug, brand: '', model: '', repair: '' })}
                    className="group overflow-hidden rounded-2xl bg-white text-left ring-1 ring-mist-200 transition hover:-translate-y-0.5 hover:shadow-card hover:ring-brand-300">
                    <img src={imgSrc(c.image, 640)} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    <span className="block p-3">
                      <span className="block text-[15px] font-semibold text-ink">{c.name}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-400">{c.blurb}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <H className="text-xl font-bold sm:text-2xl">Which brand is your {cat.name.toLowerCase()}?</H>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {cat.brands.map((b) => (
                  <button key={b.id} type="button" className="choice" onClick={() => choose({ brand: b.name, model: '', repair: '' })}>
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-mist-100 font-display text-sm font-bold text-ink-600">{b.name.slice(0, 2)}</span>
                    <span className="flex-1"><span className="block font-semibold">{b.name}</span>
                      <span className="text-xs text-ink-400">{b.models.length ? `${b.models.length} model${b.models.length > 1 ? 's' : ''} with listed prices` : 'Quoted in store'}</span></span>
                    <ChevronRight className="h-5 w-5 text-ink-300" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && !freeModel && (
            <>
              <H className="text-xl font-bold sm:text-2xl">Select your exact model</H>
              <div className="relative mt-5">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${brand.models.length} models…`}
                  aria-label="Search models" className="input pl-10" />
              </div>
              <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {models.map((m) => (
                  <button key={m.id} type="button" className="choice py-3" onClick={() => choose({ model: m.name, repair: '' })}>
                    <span className="flex-1 text-[15px] font-medium">{m.name}</span>
                    {Object.keys(m.prices).length > 0 && <span className="text-xs text-ink-400">from {money(Math.min(...Object.values(m.prices)))}</span>}
                  </button>
                ))}
                {!models.length && <p className="col-span-full py-6 text-center text-sm text-ink-500">No models match “{query}”. <button type="button" className="font-semibold text-brand-700" onClick={() => setQuery('')}>Clear search</button></p>}
              </div>
              <p className="mt-4 text-xs text-ink-400">Don’t see your model? <Link to={bookHref({ category: cat.slug, brand: brand.name })} className="font-semibold text-brand-700 hover:underline">Book an assessment</Link> or call us.</p>
            </>
          )}

          {step === 2 && freeModel && (
            <form onSubmit={(e) => { e.preventDefault(); if (customModel.trim()) choose({ model: customModel.trim(), repair: '' }); }}>
              <H className="text-xl font-bold sm:text-2xl">Which model do you have?</H>
              <p className="mt-1 text-sm text-ink-500">We’ll confirm parts and pricing for this device in store.</p>
              <label htmlFor="calc-model" className="label mt-5">Device model</label>
              <input id="calc-model" className="input" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="e.g. Motorola Edge 2024" maxLength={100} required />
              <button className="btn-primary mt-4" disabled={!customModel.trim()}>Continue <ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          )}

          {step === 3 && (
            <>
              <H className="text-xl font-bold sm:text-2xl">What needs fixing on your {sel.model}?</H>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {repairTypes.map((r) => {
                  const p = model?.prices[r.key];
                  return (
                    <button key={r.key} type="button" className="choice" onClick={() => choose({ repair: r.key })}>
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold">{r.name}</span>
                        <span className="mt-0.5 block text-xs text-ink-400">{p != null ? (r.time ? `About ${r.time}` : 'Same visit') : 'Diagnosed in store'}</span>
                      </span>
                      <span className={cx('text-sm font-bold', p != null ? 'text-ink' : 'text-ink-400')}>{p != null ? `From ${money(p)}` : 'Quote'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 4 && (
            <div className="animate-fade-up">
              <p className="text-sm font-medium text-ink-500">{sel.model} · {repair.name}</p>
              {price != null ? (
                <>
                  <H className="mt-2 font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl" aria-label={`Price ${range(price, price + variance)}`}>{range(price, price + variance)}</H>
                  <p className="mt-1 text-sm font-medium text-ink-500">CAD, plus applicable tax</p>
                  {repair.time && <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><Clock className="h-4 w-4" aria-hidden="true" />Estimated repair time: {repair.time}</p>}
                  <p className="mt-5 flex max-w-lg gap-2 text-sm leading-relaxed text-ink-500"><Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />{catalog.pricing?.note}</p>
                </>
              ) : (
                <>
                  <H className="mt-2 flex items-center gap-3 text-3xl font-extrabold sm:text-4xl"><Stethoscope className="h-8 w-8 text-brand-600" aria-hidden="true" />Quoted after diagnosis</H>
                  <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-500">This repair depends on what we find inside your device. Book a visit and we’ll inspect it, explain the fault and confirm the price with you before any work begins.</p>
                </>
              )}
              <WarrantyNote className="mt-4" />
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={bookHref(sel)} className="btn-primary btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book this repair</Link>
                <a href={telHref(business)} className="btn-outline btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />{business.phone_display}</a>
              </div>
              <button type="button" onClick={reset} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-700"><RotateCcw className="h-4 w-4" aria-hidden="true" />Price another repair</button>
            </div>
          )}
        </div>

        {/* Summary */}
        <aside className="hidden border-l border-mist-200 bg-gradient-to-b from-brand-50/60 to-white p-8 lg:block" aria-label="Your selection">
          {cat ? (
            <img key={cat.slug} src={imgSrc(cat.image, 640)} alt={`${cat.name} repair`} className="mb-6 aspect-[16/10] w-full animate-fade-in rounded-2xl object-cover ring-1 ring-mist-200" />
          ) : (
            <div className="mb-6 grid aspect-[16/10] w-full grid-cols-3 grid-rows-3 gap-1 overflow-hidden rounded-2xl" aria-hidden="true">
              {catalog.categories.slice(0, 9).map((c) => <img key={c.slug} src={imgSrc(c.image, 640)} alt="" className="h-full min-h-0 w-full object-cover" loading="lazy" />)}
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Your repair</p>
          <dl className="mt-5 space-y-4 text-sm">
            {[['Device', cat?.name], ['Brand', brand?.name], ['Model', sel.model], ['Repair', repair?.name]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-mist-200 pb-3">
                <dt className="text-ink-500">{k}</dt><dd className={cx('text-right font-semibold', v ? 'text-ink' : 'text-ink-300')}>{v || '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-mist-200">
            <p className="text-xs font-medium text-ink-400">{price != null ? 'Your price' : 'Price'}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{price != null ? range(price, price + variance) : repair ? 'In-store quote' : '—'}</p>
            {repair?.time && price != null && <p className="mt-2 text-xs text-ink-500">Typically {repair.time}</p>}
          </div>
          <p className="mt-6 text-xs leading-relaxed text-ink-400">Prices shown are for {business.name} in {business.city}, ON, in Canadian dollars.</p>
        </aside>
      </div>
    </div>
  );
}
