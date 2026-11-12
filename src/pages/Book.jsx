import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, CalendarCheck, Clock, ImagePlus, X, CheckCircle2, MapPin, Phone, Download, Info, Stethoscope, Mail } from 'lucide-react';
import { useCatalog, useSite, useSeo } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { cx, money, range, telHref, mapsDirections, fileList } from '../lib/utils.js';
import { Field } from '../components/ui.jsx';
import Spinner from '../components/Spinner.jsx';

const STEPS = ['Device', 'Repair', 'Date & time', 'Your details', 'Review'];

function Stepper({ step }) {
  return (
    <ol className="grid grid-cols-5 gap-2" aria-label="Booking progress">
      {STEPS.map((s, i) => (
        <li key={s} className="min-w-0" aria-current={i === step ? 'step' : undefined}>
          <div className={cx('h-1.5 rounded-full transition-colors duration-500', i <= step ? 'bg-brand-600' : 'bg-mist-200')} />
          <p className={cx('mt-2 truncate text-xs font-semibold', i === step ? 'text-ink' : i < step ? 'text-brand-700' : 'text-ink-400')}>
            <span className="sm:hidden">{i + 1}</span><span className="hidden sm:inline">{i + 1}. {s}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function icsFile(res, business) {
  const [y, mo, d] = res.date.split('-').map(Number);
  const [h, mi] = res.time.split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(mi)}00`;
  const endM = h * 60 + mi + 30;
  const end = `${y}${pad(mo)}${pad(d)}T${pad(Math.floor(endM / 60))}${pad(endM % 60)}00`;
  const loc = `${business.street}, ${business.city}, ${business.region_name}, Canada`.replace(/,/g, '\\,');
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//All Uplinks//Booking//EN', 'BEGIN:VEVENT', `UID:${res.ref}@alluplinks.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;TZID=America/Toronto:${start}`, `DTEND;TZID=America/Toronto:${end}`,
    `SUMMARY:Repair appointment — All Uplinks (${res.ref})`, `LOCATION:${loc}`, `DESCRIPTION:${res.repairs}. Call ${business.phone_display} if you need to reschedule.`,
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
}

export default function Book() {
  useSeo('Book a Phone Repair in Keswick | All Uplinks', 'Book your phone, tablet, laptop or console repair online at All Uplinks, 443 The Queensway South, Keswick, Ontario. Choose your repair, see your estimate and pick a time.', '/book');
  const { catalog, error: catErr } = useCatalog();
  const { business, pricing } = useSite();
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ category: params.get('category') || '', brand: params.get('brand') || '', model: params.get('model') || '',
    repairs: params.get('repair') ? [params.get('repair')] : [], date: '', time: '', name: '', email: '', phone: '', details: '', consent: false });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [days, setDays] = useState(null);
  const [slots, setSlots] = useState({ loading: false, list: [], reason: '' });
  const [submit, setSubmit] = useState({ status: 'idle', error: '' });
  const [result, setResult] = useState(null);
  const set = (patch) => { setF((s) => ({ ...s, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  const cat = catalog?.categories.find((c) => c.slug === f.category);
  const brand = cat?.brands.find((b) => b.name === f.brand);
  const model = brand?.models.find((m) => m.name === f.model);
  const freeModel = brand && !brand.models.length;
  const repairTypes = (cat && catalog.repairTypes[cat.device_type]) || [];
  const variance = catalog?.pricing?.variance ?? pricing.variance ?? 0;

  useEffect(() => { if (cat && cat.brands.length === 1 && !f.brand) set({ brand: cat.brands[0].name }); }, [cat]); // eslint-disable-line
  // If a prefilled model isn't in the catalogue for this brand, clear it so the customer can choose.
  useEffect(() => { if (brand && brand.models.length && f.model && !model) set({ model: '' }); }, [brand]); // eslint-disable-line
  // Arriving from the calculator or a price table with a known model: jump straight to the repair step.
  useEffect(() => { if (catalog && step === 0 && model && params.get('model')) setStep(1); }, [catalog, model]); // eslint-disable-line

  const estimate = useMemo(() => {
    let lo = 0, n = 0, diag = false;
    for (const k of f.repairs) { const p = model?.prices[k]; if (p != null) { lo += p; n++; } else diag = true; }
    return { lo, hi: lo + n * variance, n, diag };
  }, [f.repairs, model, variance]);

  useEffect(() => { if (step === 2 && !days) api('/availability').then((r) => setDays(r.days)).catch(() => setDays([])); }, [step, days]);
  useEffect(() => {
    if (!f.date) return;
    let alive = true;
    setSlots({ loading: true, list: [], reason: '' });
    api('/slots?date=' + f.date).then((r) => alive && setSlots({ loading: false, list: r.slots, reason: r.reason || '' }))
      .catch(() => alive && setSlots({ loading: false, list: [], reason: 'Could not load times. Please try again.' }));
    return () => { alive = false; };
  }, [f.date]);
  useEffect(() => { document.getElementById('book-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [step, result]);

  const validate = (s) => {
    const e = {};
    if (s === 0) { if (!cat) e.category = 'Choose your device type'; if (!f.brand) e.brand = 'Choose a brand'; if (!f.model.trim()) e.model = 'Choose or enter your model'; }
    if (s === 1 && !f.repairs.length) e.repairs = 'Choose at least one repair';
    if (s === 2) { if (!f.date) e.date = 'Choose a date'; if (!f.time) e.time = 'Choose a time'; }
    if (s === 3) {
      if (f.name.trim().length < 2) e.name = 'Enter your full name';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = 'Enter a valid email address';
      const d = f.phone.replace(/\D/g, ''); if (!(d.length === 10 || (d.length === 11 && d[0] === '1'))) e.phone = 'Enter a valid 10-digit phone number';
    }
    if (s === 4 && !f.consent) e.consent = 'Please confirm to continue';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const next = () => { if (validate(step)) setStep(step + 1); };

  const onSubmit = async () => {
    if (!validate(4)) return;
    setSubmit({ status: 'sending', error: '' });
    const fd = new FormData();
    for (const k of ['brand', 'model', 'date', 'time', 'name', 'email', 'phone', 'details']) fd.append(k, f[k].trim());
    fd.append('category', f.category); fd.append('repairs', JSON.stringify(f.repairs));
    photos.forEach((p) => fd.append('photos', p.file));
    try {
      const r = await api('/bookings', { method: 'POST', form: fd });
      setResult(r); setSubmit({ status: 'done', error: '' });
    } catch (err) {
      setSubmit({ status: 'idle', error: err.message });
      if (err.status === 409) { setErrors({ time: 'That time was just taken — please choose another.' }); set({ time: '' }); setStep(2); const r = await api('/slots?date=' + f.date).catch(() => null); if (r) setSlots({ loading: false, list: r.slots, reason: r.reason || '' }); }
      else if (err.errors && Object.keys(err.errors).length) setErrors(err.errors);
    }
  };

  const addPhotos = (files) => {
    const list = fileList(files, 5 - photos.length).filter((x) => x.size <= 8 * 1024 * 1024);
    setPhotos((p) => [...p, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };

  if (catErr) return <div className="container-x py-20 text-center">We couldn’t load the booking form. Please call <a href={telHref(business)} className="font-semibold text-brand-700">{business.phone_display}</a>.</div>;

  if (result) {
    const ics = icsFile(result, business);
    return (
      <div id="book-top" className="scroll-mt-24 bg-gradient-to-b from-emerald-50/60 to-white">
        <div className="container-x max-w-3xl py-14 sm:py-20">
          <div className="card animate-fade-up p-6 text-center sm:p-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50"><CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" /></span>
            <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">Your repair is booked</h1>
            <p className="mt-3 text-ink-500">Thanks, {f.name.split(' ')[0]}. Keep your reference handy — quote it if you call us.</p>
            <p className="mx-auto mt-6 w-fit rounded-2xl bg-mist-100 px-6 py-3 font-mono text-2xl font-bold tracking-wider text-ink" aria-label="Booking reference">{result.ref}</p>
            <dl className="mx-auto mt-8 grid max-w-xl gap-3 text-left text-[15px] sm:grid-cols-2">
              {[['Appointment', `${result.date_label} at ${result.time_label}`], ['Device', `${f.brand} ${f.model}`], ['Repair', result.repairs],
                ['Estimate', result.estimate.low != null ? `${range(result.estimate.low, result.estimate.high)}${result.needs_diagnosis ? ' + diagnosis' : ''}` : 'Quoted after diagnosis']].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200"><dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">{k}</dt><dd className="mt-1 font-semibold text-ink">{v}</dd></div>
              ))}
            </dl>
            <p className="mx-auto mt-6 flex max-w-xl items-start gap-2 text-left text-sm text-ink-500">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {result.email_status === 'sent' ? `A confirmation email is on its way to ${f.email}.` : `Your booking is saved. If you don’t receive a confirmation email at ${f.email}, it’s still confirmed — call us with your reference if anything changes.`}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={ics} download={`all-uplinks-${result.ref}.ics`} className="btn-primary"><Download className="h-4 w-4" aria-hidden="true" />Add to calendar</a>
              <a href={mapsDirections(business)} target="_blank" rel="noopener noreferrer" className="btn-outline"><MapPin className="h-4 w-4" aria-hidden="true" />Directions</a>
              <a href={telHref(business)} className="btn-outline"><Phone className="h-4 w-4" aria-hidden="true" />{business.phone_display}</a>
            </div>
            <p className="mt-8 text-sm text-ink-500">{business.legal_name} · {business.street}, {business.city}</p>
          </div>
          <p className="mt-8 text-center"><Link to="/" className="font-semibold text-brand-700 hover:underline">Back to home</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-brand-50/70 to-white">
      <div id="book-top" className="container-x scroll-mt-24 py-10 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow"><CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />Online booking</span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Book a repair</h1>
          <p className="lead mt-3">Tell us about your device, choose a time and we’ll have everything ready when you arrive.</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[1fr_340px]">
          <div className="card p-5 sm:p-8">
            <Stepper step={step} />
            {!catalog ? <div className="grid min-h-[300px] place-items-center"><Spinner /></div> : (
              <div className="mt-8 min-h-[320px] animate-fade-in" key={step}>
                {step === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold">Which device needs repair?</h2>
                    <div role="radiogroup" aria-label="Device type" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {catalog.categories.map((c) => (
                        <button key={c.slug} type="button" role="radio" aria-checked={f.category === c.slug} className="choice justify-center py-3 text-center text-sm font-semibold"
                          onClick={() => set({ category: c.slug, brand: c.brands.length === 1 ? c.brands[0].name : '', model: '', repairs: [] })}>{c.name}</button>
                      ))}
                    </div>
                    {errors.category && <p className="field-error">{errors.category}</p>}
                    {cat && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Brand" id="bk-brand" error={errors.brand} required>
                          <select id="bk-brand" className={cx('input', errors.brand && 'input-error')} value={f.brand} onChange={(e) => set({ brand: e.target.value, model: '', repairs: [] })}>
                            <option value="">Select brand</option>
                            {cat.brands.map((b) => <option key={b.id}>{b.name}</option>)}
                          </select>
                        </Field>
                        {brand && (freeModel ? (
                          <Field label="Model" id="bk-model" error={errors.model} hint="e.g. Motorola Edge 2024" required>
                            <input id="bk-model" className={cx('input', errors.model && 'input-error')} value={f.model} maxLength={100} onChange={(e) => set({ model: e.target.value })} />
                          </Field>
                        ) : (
                          <Field label="Model" id="bk-model" error={errors.model} required>
                            <select id="bk-model" className={cx('input', errors.model && 'input-error')} value={f.model} onChange={(e) => set({ model: e.target.value })}>
                              <option value="">Select model</option>
                              {brand.models.map((m) => <option key={m.id}>{m.name}</option>)}
                            </select>
                          </Field>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="text-xl font-bold">What needs fixing on your {f.model}?</h2>
                    <p className="mt-1 text-sm text-ink-500">Select all that apply.</p>
                    <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                      {repairTypes.map((r) => {
                        const p = model?.prices[r.key]; const on = f.repairs.includes(r.key);
                        return (
                          <button key={r.key} type="button" role="checkbox" aria-checked={on} className="choice"
                            onClick={() => set({ repairs: on ? f.repairs.filter((x) => x !== r.key) : [...f.repairs, r.key] })}>
                            <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 ring-inset transition', on ? 'bg-brand-600 ring-brand-600' : 'bg-white ring-mist-300')}>{on && <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />}</span>
                            <span className="flex-1"><span className="block text-[15px] font-semibold">{r.name}</span>
                              <span className="text-xs text-ink-400">{p != null ? (r.time ? `About ${r.time}` : '') : 'Diagnosed in store'}</span></span>
                            <span className="text-sm font-bold">{p != null ? range(p, p + variance) : 'Quote'}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.repairs && <p className="field-error">{errors.repairs}</p>}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-bold">Choose a date</h2>
                    {!days ? <div className="py-8"><Spinner /></div> : (
                      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar" role="radiogroup" aria-label="Appointment date">
                        {days.map((d) => {
                          const dt = new Date(d.date + 'T12:00:00Z');
                          return (
                            <button key={d.date} type="button" role="radio" aria-checked={f.date === d.date} disabled={!d.open}
                              aria-label={dt.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) + (d.open ? '' : ' — unavailable')}
                              onClick={() => set({ date: d.date, time: '' })}
                              className={cx('flex w-[68px] shrink-0 flex-col items-center rounded-xl py-3 ring-1 ring-inset transition',
                                f.date === d.date ? 'bg-ink text-white ring-ink' : d.open ? 'bg-white ring-mist-200 hover:ring-brand-300' : 'cursor-not-allowed bg-mist-50 text-ink-300 ring-mist-100')}>
                              <span className="text-[11px] font-semibold uppercase">{dt.toLocaleDateString('en-CA', { weekday: 'short', timeZone: 'UTC' })}</span>
                              <span className="font-display text-xl font-bold">{dt.getUTCDate()}</span>
                              <span className="text-[11px]">{dt.toLocaleDateString('en-CA', { month: 'short', timeZone: 'UTC' })}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {errors.date && <p className="field-error">{errors.date}</p>}
                    {f.date && (
                      <div className="mt-6">
                        <h3 className="text-base font-bold">Available times</h3>
                        {slots.loading ? <div className="py-6"><Spinner /></div> : slots.list.length ? (
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" role="radiogroup" aria-label="Appointment time">
                            {slots.list.map((s) => (
                              <button key={s.time} type="button" role="radio" aria-checked={f.time === s.time} disabled={!s.available} onClick={() => set({ time: s.time })}
                                className={cx('rounded-xl py-2.5 text-sm font-semibold ring-1 ring-inset transition',
                                  f.time === s.time ? 'bg-brand-600 text-white ring-brand-600' : s.available ? 'bg-white ring-mist-200 hover:ring-brand-300' : 'cursor-not-allowed bg-mist-50 text-ink-300 line-through ring-mist-100')}>
                                {s.label}
                              </button>
                            ))}
                          </div>
                        ) : <p className="mt-3 text-sm text-ink-500">{slots.reason || 'No times available on this date.'}</p>}
                        {slots.list.length > 0 && !slots.list.some((s) => s.available) && <p className="mt-3 text-sm text-ink-500">This day is fully booked — please pick another date.</p>}
                        {errors.time && <p className="field-error">{errors.time}</p>}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">Your contact details</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" id="bk-name" error={errors.name} required><input id="bk-name" autoComplete="name" className={cx('input', errors.name && 'input-error')} value={f.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} /></Field>
                      <Field label="Phone" id="bk-phone" error={errors.phone} required><input id="bk-phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="905-555-0123" className={cx('input', errors.phone && 'input-error')} value={f.phone} maxLength={30} onChange={(e) => set({ phone: e.target.value })} /></Field>
                    </div>
                    <Field label="Email" id="bk-email" error={errors.email} hint="We’ll send your booking confirmation here." required><input id="bk-email" type="email" autoComplete="email" className={cx('input', errors.email && 'input-error')} value={f.email} maxLength={160} onChange={(e) => set({ email: e.target.value })} /></Field>
                    <Field label="Repair details" id="bk-details" hint="What happened? Any other issues we should know about?"><textarea id="bk-details" rows={4} className="input" value={f.details} maxLength={2000} onChange={(e) => set({ details: e.target.value })} /></Field>
                    <div>
                      <span className="label">Device photos <span className="font-normal text-ink-400">(optional, up to 5)</span></span>
                      <div className="flex flex-wrap gap-3">
                        {photos.map((p, i) => (
                          <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-mist-200">
                            <img src={p.url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                            <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                        {photos.length < 5 && (
                          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-mist-300 text-ink-400 transition hover:border-brand-400 hover:text-brand-600">
                            <ImagePlus className="h-6 w-6" aria-hidden="true" /><span className="sr-only">Add photos</span>
                            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                          </label>
                        )}
                      </div>
                      <p className="mt-1.5 text-xs text-ink-400">JPG, PNG or HEIC, max 8 MB each.</p>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div>
                    <h2 className="text-xl font-bold">Review your booking</h2>
                    <dl className="mt-5 divide-y divide-mist-200 rounded-2xl ring-1 ring-mist-200">
                      {[['Device', `${f.brand} ${f.model}`, 0], ['Repairs', f.repairs.map((k) => repairTypes.find((r) => r.key === k)?.name).join(', '), 1],
                        ['Appointment', `${new Date(f.date + 'T12:00:00Z').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })} at ${slots.list.find((s) => s.time === f.time)?.label || f.time}`, 2],
                        ['Contact', `${f.name} · ${f.phone} · ${f.email}`, 3], ['Photos', photos.length ? `${photos.length} attached` : 'None', 3]].map(([k, v, s]) => (
                        <div key={k} className="flex items-start justify-between gap-4 p-4">
                          <div><dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">{k}</dt><dd className="mt-1 text-[15px] font-medium">{v}</dd></div>
                          <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => setStep(s)}>Edit<span className="sr-only"> {k}</span></button>
                        </div>
                      ))}
                    </dl>
                    <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-600">
                      <input type="checkbox" checked={f.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-5 w-5 rounded border-mist-300 text-brand-600 focus:ring-brand-500" />
                      <span>I understand the estimate may change after inspection, and that All Uplinks will confirm the final price with me before starting the repair. I agree to the <Link to="/privacy" className="font-semibold text-brand-700 hover:underline" target="_blank">privacy policy</Link>.</span>
                    </label>
                    {errors.consent && <p className="field-error">{errors.consent}</p>}
                    {submit.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">{submit.error}</p>}
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-mist-200 pt-6">
              {step > 0 ? <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" />Back</button> : <span />}
              {step < 4 ? <button type="button" className="btn-primary" onClick={next} disabled={!catalog}>Continue<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                : <button type="button" className="btn-primary btn-lg" onClick={onSubmit} disabled={submit.status === 'sending'}>{submit.status === 'sending' ? <><Spinner label="Submitting" />Booking…</> : <><CalendarCheck className="h-5 w-5" aria-hidden="true" />Confirm booking</>}</button>}
            </div>
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-24" aria-label="Booking summary">
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Estimate</p>
              <p className="mt-2 font-display text-3xl font-extrabold">{estimate.n ? range(estimate.lo, estimate.hi) : f.repairs.length ? 'In-store quote' : '—'}</p>
              {estimate.n > 0 && estimate.diag && <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500"><Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />+ diagnosis for the rest</p>}
              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-ink-500">Device</dt><dd className="text-right font-semibold">{f.model ? `${f.brand} ${f.model}` : '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-500">Repairs</dt><dd className="text-right font-semibold">{f.repairs.length || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-500">When</dt><dd className="text-right font-semibold">{f.date && f.time ? `${new Date(f.date + 'T12:00:00Z').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}, ${slots.list.find((s) => s.time === f.time)?.label || ''}` : '—'}</dd></div>
              </dl>
              {estimate.n > 0 && <p className="mt-5 flex gap-2 border-t border-mist-200 pt-4 text-xs leading-relaxed text-ink-500"><Info className="h-4 w-4 shrink-0" aria-hidden="true" />{catalog?.pricing?.note}</p>}
            </div>
            <div className="card flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50"><Clock className="h-5 w-5 text-brand-600" aria-hidden="true" /></span>
              <p className="text-sm text-ink-600">Prefer to talk? Call <a href={telHref(business)} className="font-semibold text-ink hover:text-brand-700">{business.phone_display}</a></p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
