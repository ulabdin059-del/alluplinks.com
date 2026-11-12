import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, MessageSquare, CheckCircle2, Info } from 'lucide-react';
import { useSeo, useSite } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { cx, money, useFetch, useReveal, telHref } from '../lib/utils.js';
import { Img, Field } from '../components/ui.jsx';
import Spinner from '../components/Spinner.jsx';
import { ProductCard } from './Shop.jsx';
import NotFound from './NotFound.jsx';
import { SHOP_CATEGORIES } from '../../shared/constants.js';

function Inquiry({ product }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', message: `Hi, I'm interested in the ${product.name}. Could you confirm price and availability?` });
  const [s, setS] = useState({ status: 'idle', errors: {}, error: '', ref: '' });
  const submit = async (e) => {
    e.preventDefault(); setS({ status: 'sending', errors: {}, error: '' });
    const fd = new FormData(); Object.entries({ ...f, topic: 'Product inquiry', product: product.name }).forEach(([k, v]) => fd.append(k, v));
    try { const r = await api('/inquiries', { method: 'POST', form: fd }); setS({ status: 'done', errors: {}, error: '', ref: r.ref }); }
    catch (err) { setS({ status: 'idle', errors: err.errors || {}, error: err.message }); }
  };
  if (s.status === 'done') return <div className="flex gap-3 rounded-2xl bg-emerald-50 p-5 ring-1 ring-emerald-200"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" /><div><p className="font-semibold">Inquiry sent</p><p className="mt-1 text-sm text-ink-600">Reference {s.ref}. We’ll get back to you with pricing and availability.</p></div></div>;
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" id="pi-name" error={s.errors.name} required><input id="pi-name" autoComplete="name" className={cx('input', s.errors.name && 'input-error')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone" id="pi-phone" error={s.errors.phone}><input id="pi-phone" type="tel" autoComplete="tel" className={cx('input', s.errors.phone && 'input-error')} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label="Email" id="pi-email" error={s.errors.email} required><input id="pi-email" type="email" autoComplete="email" className={cx('input', s.errors.email && 'input-error')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Message" id="pi-msg" error={s.errors.message} required><textarea id="pi-msg" rows={3} className="input" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
      {s.error && !Object.keys(s.errors).length && <p className="field-error">{s.error}</p>}
      <button className="btn-dark w-full" disabled={s.status === 'sending'}><MessageSquare className="h-4 w-4" aria-hidden="true" />{s.status === 'sending' ? 'Sending…' : 'Send inquiry'}</button>
    </form>
  );
}

export default function Product() {
  const { slug } = useParams();
  const { business } = useSite();
  const { data: p, loading, error } = useFetch(() => api('/products/' + slug), [slug]);
  const [active, setActive] = useState(0);
  const ref = useReveal();
  useSeo(p ? `${p.name} | All Uplinks Keswick` : 'Shop | All Uplinks', p ? `${p.short} Available at All Uplinks, Keswick, Ontario.` : '', `/shop/product/${slug}`);
  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
  if (error || !p) return <NotFound />;
  const cat = SHOP_CATEGORIES.find((c) => c.slug === p.category);
  return (
    <div ref={ref}>
      <div className="container-x py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
          <ol className="flex flex-wrap items-center gap-1.5"><li><Link to="/" className="hover:text-brand-700">Home</Link></li><li aria-hidden="true">/</li><li><Link to="/shop" className="hover:text-brand-700">Shop</Link></li>
            {cat && <><li aria-hidden="true">/</li><li><Link to={`/shop/${cat.slug}`} className="hover:text-brand-700">{cat.name}</Link></li></>}<li aria-hidden="true">/</li><li aria-current="page" className="text-ink-700">{p.name}</li></ol>
        </nav>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-3xl bg-mist-100 ring-1 ring-mist-200"><Img k={p.images[active]} alt={p.name} priority className="aspect-square w-full" sizes="(min-width:1024px) 50vw, 100vw" /></div>
            {p.images.length > 1 && <div className="mt-3 flex gap-3">{p.images.map((im, i) => (
              <button key={im} type="button" onClick={() => setActive(i)} aria-label={`Show image ${i + 1}`} aria-pressed={active === i} className={cx('h-20 w-20 overflow-hidden rounded-xl ring-2', active === i ? 'ring-brand-500' : 'ring-transparent')}><Img k={im} alt="" className="h-full w-full" sizes="80px" /></button>))}</div>}
          </div>
          <div>
            <span className={cx('chip', p.condition === 'pre-owned' && 'bg-amber-50 text-amber-800')}>{p.condition === 'pre-owned' ? 'Pre-owned' : 'New'}</span>
            {p.brand && p.brand !== 'Assorted' && <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-ink-400">{p.brand}</p>}
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
            <p className="mt-3 text-lg text-ink-500">{p.short}</p>
            <div className="mt-6">
              {p.price != null ? <p className="flex items-baseline gap-3"><span className="font-display text-4xl font-extrabold">{money(p.price)}</span><span className="text-sm text-ink-400">CAD{p.compare_at > p.price ? <> · <s>{money(p.compare_at)}</s></> : ''}</span></p>
                : <p className="font-display text-2xl font-extrabold text-ink">Call for current price</p>}
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500"><Info className="h-4 w-4" aria-hidden="true" />Availability changes often — contact us to confirm before visiting.</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={telHref(business)} className="btn-primary btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />Call {business.phone_display}</a>
              <a href="#inquire" className="btn-outline btn-lg"><MessageSquare className="h-5 w-5" aria-hidden="true" />Ask about this item</a>
            </div>
            <div className="mt-10">
              <h2 className="text-lg font-bold">Description</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{p.description}</p>
            </div>
            {p.specs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold">Specifications</h2>
                <dl className="mt-3 divide-y divide-mist-200 rounded-2xl ring-1 ring-mist-200">
                  {p.specs.map(([k, v]) => <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-3 text-sm"><dt className="text-ink-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
                </dl>
              </div>
            )}
            <div id="inquire" className="mt-10 scroll-mt-28 rounded-3xl bg-mist-50 p-6 ring-1 ring-mist-200">
              <h2 className="text-lg font-bold">Ask about this item</h2>
              <p className="mb-4 mt-1 text-sm text-ink-500">We’ll reply with current pricing and availability.</p>
              <Inquiry product={p} />
            </div>
          </div>
        </div>
        {p.related?.length > 0 && (
          <section className="mt-20">
            <h2 className="reveal text-2xl font-extrabold">You may also like</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">{p.related.map((r) => <ProductCard key={r.slug} p={r} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
