import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Navigation, CalendarCheck, CheckCircle2, ImagePlus, X } from 'lucide-react';
import { useSeo, useSite } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { cx, telHref, mapsDirections, useReveal, fileList } from '../lib/utils.js';
import { Field, LocationCard, PageHero } from '../components/ui.jsx';

const TOPICS = ['Repair question', 'Trade-in / selling', 'Product inquiry', 'Existing booking', 'Other'];

export default function Contact() {
  const { business: b } = useSite();
  useSeo('Contact & Directions — Phone Repair Keswick | All Uplinks', `Call All Uplinks at ${b.phone_display} or visit us at ${b.street}, Keswick, Ontario. Directions, map and contact form.`, '/contact');
  const ref = useReveal();
  const [f, setF] = useState({ topic: TOPICS[0], name: '', email: '', phone: '', message: '', website: '' });
  const [photos, setPhotos] = useState([]);
  const [s, setS] = useState({ status: 'idle', errors: {}, error: '', ref: '' });
  const set = (p) => { setF({ ...f, ...p }); setS((x) => ({ ...x, errors: Object.fromEntries(Object.entries(x.errors).filter(([k]) => !(k in p))) })); };
  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (f.name.trim().length < 2) errs.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) errs.email = 'Enter a valid email address';
    if (f.message.trim().length < 5) errs.message = 'Tell us a little more';
    if (Object.keys(errs).length) return setS({ ...s, errors: errs });
    setS({ status: 'sending', errors: {}, error: '' });
    const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v.trim())); photos.forEach((p) => fd.append('photos', p.file));
    try { const r = await api('/inquiries', { method: 'POST', form: fd }); setS({ status: 'done', errors: {}, error: '', ref: r.ref }); }
    catch (err) { setS({ status: 'idle', errors: err.errors || {}, error: err.message }); }
  };
  return (
    <div ref={ref}>
      <PageHero eyebrow="Contact" title="Get in touch" crumbs={[['Contact']]} image="store-counter" imageAlt="Customer being helped at a phone store counter"
        actions={<><a href={telHref(b)} className="btn-primary btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />Call {b.phone_display}</a>
          <a href={mapsDirections(b)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-lg"><Navigation className="h-5 w-5" aria-hidden="true" />Directions</a></>}>
        Questions about a repair, a trade-in or a product? Call us, visit the store at {b.street} in {b.city}, or send a message below.
      </PageHero>
      <section className="container-x py-14"><div className="reveal"><LocationCard /></div></section>
      <section className="container-x grid gap-10 pb-20 lg:grid-cols-[.8fr_1.2fr]">
        <div className="reveal">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Send us a message</h2>
          <p className="mt-3 text-ink-500">We’ll reply by email or phone. For the fastest answer on pricing, try the <Link to="/repair-prices" className="font-semibold text-brand-700 hover:underline">price calculator</Link>, or <Link to="/book" className="font-semibold text-brand-700 hover:underline">book a repair</Link> directly.</p>
          <div className="mt-8 space-y-3">
            <a href={telHref(b)} className="card card-hover flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50"><Phone className="h-5 w-5 text-brand-600" aria-hidden="true" /></span><span><span className="block text-sm text-ink-500">Call the store</span><span className="block font-bold">{b.phone_display}</span></span></a>
            <Link to="/book" className="card card-hover flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50"><CalendarCheck className="h-5 w-5 text-brand-600" aria-hidden="true" /></span><span><span className="block text-sm text-ink-500">Reserve a time</span><span className="block font-bold">Book a repair online</span></span></Link>
          </div>
        </div>
        <div className="reveal card p-6 sm:p-8">
          {s.status === 'done' ? (
            <div className="py-10 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" /><h3 className="mt-4 text-2xl font-bold">Message sent</h3><p className="mt-2 text-ink-500">Thanks, {f.name.split(' ')[0]}. Your reference is <strong className="font-mono text-ink">{s.ref}</strong>. We’ll be in touch soon.</p></div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <Field label="Topic" id="ct-topic"><select id="ct-topic" className="input" value={f.topic} onChange={(e) => set({ topic: e.target.value })}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" id="ct-name" error={s.errors.name} required><input id="ct-name" autoComplete="name" className={cx('input', s.errors.name && 'input-error')} value={f.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></Field>
                <Field label="Phone" id="ct-phone" error={s.errors.phone}><input id="ct-phone" type="tel" autoComplete="tel" className={cx('input', s.errors.phone && 'input-error')} value={f.phone} maxLength={30} onChange={(e) => set({ phone: e.target.value })} /></Field>
              </div>
              <Field label="Email" id="ct-email" error={s.errors.email} required><input id="ct-email" type="email" autoComplete="email" className={cx('input', s.errors.email && 'input-error')} value={f.email} maxLength={160} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="Message" id="ct-message" error={s.errors.message} required><textarea id="ct-message" rows={5} className={cx('input', s.errors.message && 'input-error')} value={f.message} maxLength={3000} onChange={(e) => set({ message: e.target.value })} /></Field>
              <div className="hidden" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set({ website: e.target.value })} /></label></div>
              <div>
                <span className="label">Photos <span className="font-normal text-ink-400">(optional, up to 3)</span></span>
                <div className="flex flex-wrap gap-3">
                  {photos.map((p, i) => <div key={p.url} className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-mist-200"><img src={p.url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/80 text-white"><X className="h-3 w-3" /></button></div>)}
                  {photos.length < 3 && <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-mist-300 text-ink-400 hover:border-brand-400"><ImagePlus className="h-5 w-5" aria-hidden="true" /><span className="sr-only">Add photos</span>
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { setPhotos([...photos, ...fileList(e.target.files, 3 - photos.length).filter((x) => x.size <= 8e6).map((file) => ({ file, url: URL.createObjectURL(file) }))]); e.target.value = ''; }} /></label>}
                </div>
              </div>
              {s.error && !Object.keys(s.errors).length && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">{s.error}</p>}
              <button className="btn-primary btn-lg w-full sm:w-auto" disabled={s.status === 'sending'}>{s.status === 'sending' ? 'Sending…' : 'Send message'}</button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
