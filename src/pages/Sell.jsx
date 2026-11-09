import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Tablet, ChevronRight, ChevronLeft, CheckCircle2, ImagePlus, X, Info, BadgeDollarSign, ScanSearch, HandCoins, ShieldAlert } from 'lucide-react';
import { useSeo, useSite } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { cx, money, useFetch, useReveal, fileList, telHref } from '../lib/utils.js';
import { Field, Img, Accordion } from '../components/ui.jsx';
import Spinner from '../components/Spinner.jsx';
import { estimateTradeIn } from '../../shared/tradein.js';

const COND = [['likeNew', 'Like new', 'No visible marks'], ['good', 'Good', 'Light wear, no cracks'], ['fair', 'Fair', 'Noticeable scratches or dents'], ['broken', 'Cracked / damaged', 'Cracks, chips or broken parts']];
const BATT = [['85plus', '85% or higher'], ['80to84', '80–84%'], ['below80', 'Below 80% / Service'], ['unknown', 'Not sure']];

function YesNo({ label, value, onChange, error, id }) {
  return (
    <div>
      <p className="label" id={id}>{label}</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby={id}>
        {[[true, 'Yes'], [false, 'No']].map(([v, l]) => (
          <button key={l} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className="choice justify-center py-2.5 text-sm font-semibold">{l}</button>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Options({ label, options, value, onChange, error, id }) {
  return (
    <div>
      <p className="label" id={id}>{label}</p>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby={id}>
        {options.map(([v, l, d]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className="choice py-3">
            <span><span className="block text-sm font-semibold">{l}</span>{d && <span className="text-xs text-ink-400">{d}</span>}</span>
          </button>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function Sell() {
  useSeo('Sell or Trade In Your Phone in Keswick | All Uplinks', 'Get an instant trade-in estimate for your iPhone, Samsung Galaxy, Google Pixel or tablet. Bring it to All Uplinks in Keswick for inspection and a final offer.', '/sell');
  const { business } = useSite();
  const { data, error } = useFetch(() => api('/tradein/catalog'), []);
  const ref = useReveal();
  const [step, setStep] = useState(0);
  const [type, setType] = useState('Phone');
  const [brand, setBrand] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [a, setA] = useState({ storage: '', screen: '', body: '', battery: '', powers: undefined, bio: undefined, unlocked: undefined, account_removed: false });
  const [c, setC] = useState({ name: '', email: '', phone: '', notes: '' });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submit, setSubmit] = useState({ status: 'idle', error: '' });
  const [result, setResult] = useState(null);

  const devices = data?.devices || [];
  const brands = [...new Set(devices.filter((d) => d.device_type === type).map((d) => d.brand))];
  const models = devices.filter((d) => d.device_type === type && d.brand === brand);
  const device = devices.find((d) => d.id === Number(deviceId));
  const est = useMemo(() => (device && a.storage && a.screen && a.body && a.powers !== undefined ? estimateTradeIn(device, a, data.config) : null), [device, a, data]);
  const setAns = (patch) => { setA((s) => ({ ...s, ...patch })); setErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); };

  const validate = (s) => {
    const e = {};
    if (s === 0) { if (!device) e.device = 'Choose your model'; else if (!a.storage) e.storage = 'Choose storage'; }
    if (s === 1) { if (!a.screen) e.screen = 'Choose screen condition'; if (!a.body) e.body = 'Choose body condition'; if (a.powers === undefined) e.powers = 'Please answer'; }
    if (s === 2) {
      if (c.name.trim().length < 2) e.name = 'Enter your full name';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) e.email = 'Enter a valid email address';
      const d = c.phone.replace(/\D/g, ''); if (!(d.length === 10 || (d.length === 11 && d[0] === '1'))) e.phone = 'Enter a valid 10-digit phone number';
    }
    setErrors(e); return !Object.keys(e).length;
  };

  const onSubmit = async () => {
    if (!validate(2)) return;
    setSubmit({ status: 'sending', error: '' });
    const fd = new FormData();
    fd.append('device_id', String(device.id)); fd.append('answers', JSON.stringify(a));
    for (const k of Object.keys(c)) fd.append(k, c[k].trim());
    photos.forEach((p) => fd.append('photos', p.file));
    try { const r = await api('/tradeins', { method: 'POST', form: fd }); setResult(r); setSubmit({ status: 'done', error: '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    catch (err) { setSubmit({ status: 'idle', error: err.message }); if (err.errors) setErrors(err.errors); }
  };

  if (result) return (
    <div className="container-x max-w-2xl py-16 sm:py-24">
      <div className="card animate-fade-up p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-extrabold">Trade-in request received</h1>
        <p className="mt-3 text-ink-500">Reference <strong className="font-mono text-ink">{result.ref}</strong></p>
        <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-mist-50 p-4 ring-1 ring-mist-200"><p className="text-xs font-semibold uppercase text-ink-400">Estimated cash</p><p className="mt-1 font-display text-2xl font-extrabold">{money(result.estimate.low)} – {money(result.estimate.high)}</p></div>
          <div className="rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100"><p className="text-xs font-semibold uppercase text-brand-700">Store credit up to</p><p className="mt-1 font-display text-2xl font-extrabold">{money(result.estimate.credit)}</p></div>
        </div>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ink-500">This is an estimate. Your final offer is confirmed after we inspect the device in store. Bring the device, its charger if you have it, and government-issued photo ID. Remember to sign out of iCloud or your Google account first.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><a href={telHref(business)} className="btn-primary">Call {business.phone_display}</a><Link to="/" className="btn-outline">Back to home</Link></div>
      </div>
    </div>
  );

  return (
    <div ref={ref}>
      <section className="relative overflow-hidden border-b border-mist-200 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-x grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div className="animate-fade-up">
            <span className="eyebrow"><HandCoins className="h-3.5 w-3.5" aria-hidden="true" />Sell / Trade-in</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-5xl">Sell or trade in your phone</h1>
            <p className="lead mt-5 max-w-xl">Answer a few quick questions for an instant estimate on your iPhone, Samsung Galaxy, Google Pixel or tablet — working, cracked or worn out. Choose cash or a higher store credit toward your next device or repair.</p>
            <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
              {[[BadgeDollarSign, 'Instant online estimate'], [ScanSearch, 'Quick in-store inspection'], [HandCoins, 'Cash or store credit']].map(([I, t]) => (
                <li key={t} className="flex items-center gap-2 font-medium text-ink-600"><I className="h-5 w-5 text-brand-600" aria-hidden="true" />{t}</li>))}
            </ul>
          </div>
          <div className="hidden overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200 lg:block"><Img k="tradein-iphones" alt="Three used iPhone Pro handsets ready for trade-in" priority className="aspect-[4/3] w-full" sizes="40vw" /></div>
        </div>
      </section>

      <section className="container-x grid gap-6 py-12 lg:grid-cols-[1fr_360px]">
        <div className="card p-5 sm:p-8">
          <ol className="grid grid-cols-3 gap-2" aria-label="Trade-in progress">
            {['Device', 'Condition', 'Your details'].map((s, i) => (
              <li key={s} aria-current={i === step ? 'step' : undefined}><div className={cx('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-mist-200')} /><p className={cx('mt-2 text-xs font-semibold', i === step ? 'text-ink' : 'text-ink-400')}>{i + 1}. {s}</p></li>
            ))}
          </ol>
          {error ? <p className="mt-8 text-ink-500">Trade-in pricing is unavailable right now. Please call {business.phone_display}.</p> : !data ? <div className="grid min-h-[280px] place-items-center"><Spinner /></div> : (
            <div className="mt-8 space-y-6 animate-fade-in" key={step}>
              {step === 0 && (<>
                <div>
                  <p className="label">Device type</p>
                  <div className="grid grid-cols-2 gap-2.5 sm:max-w-sm" role="radiogroup" aria-label="Device type">
                    {[['Phone', Smartphone], ['Tablet', Tablet]].map(([t, I]) => (
                      <button key={t} type="button" role="radio" aria-checked={type === t} className="choice justify-center py-3 font-semibold" onClick={() => { setType(t); setBrand(''); setDeviceId(''); setAns({ storage: '' }); }}><I className="h-5 w-5 text-brand-600" aria-hidden="true" />{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Brand" id="ti-brand" required>
                    <select id="ti-brand" className="input" value={brand} onChange={(e) => { setBrand(e.target.value); setDeviceId(''); setAns({ storage: '' }); }}>
                      <option value="">Select brand</option>{brands.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Model" id="ti-model" error={errors.device} required>
                    <select id="ti-model" className={cx('input', errors.device && 'input-error')} value={deviceId} disabled={!brand} onChange={(e) => { setDeviceId(e.target.value); setAns({ storage: '' }); setErrors({}); }}>
                      <option value="">{brand ? 'Select model' : 'Choose a brand first'}</option>{models.map((m) => <option key={m.id} value={m.id}>{m.model}</option>)}
                    </select>
                  </Field>
                </div>
                {device && (
                  <div>
                    <p className="label" id="ti-storage">Storage</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="ti-storage">
                      {device.storages.map((s) => <button key={s} type="button" role="radio" aria-checked={a.storage === s} onClick={() => setAns({ storage: s })} className="choice w-auto px-5 py-2.5 text-sm font-semibold">{s}</button>)}
                    </div>
                    {errors.storage && <p className="field-error">{errors.storage}</p>}
                  </div>
                )}
                <p className="text-sm text-ink-500">Don’t see your device? <Link to="/contact" className="font-semibold text-brand-700 hover:underline">Send us the details</Link> and we’ll make you an offer.</p>
              </>)}

              {step === 1 && (<>
                <Options id="ti-screen" label="Screen condition" options={COND} value={a.screen} onChange={(v) => setAns({ screen: v })} error={errors.screen} />
                <Options id="ti-body" label="Body / back condition" options={COND} value={a.body} onChange={(v) => setAns({ body: v })} error={errors.body} />
                {type === 'Phone' && <Options id="ti-batt" label="Battery health" options={BATT} value={a.battery} onChange={(v) => setAns({ battery: v })} />}
                <div className="grid gap-5 sm:grid-cols-2">
                  <YesNo id="ti-powers" label="Does it power on and work normally?" value={a.powers} onChange={(v) => setAns({ powers: v })} error={errors.powers} />
                  <YesNo id="ti-bio" label="Face ID / fingerprint working?" value={a.bio} onChange={(v) => setAns({ bio: v })} />
                  <YesNo id="ti-unlocked" label="Carrier unlocked?" value={a.unlocked} onChange={(v) => setAns({ unlocked: v })} />
                  <YesNo id="ti-account" label="Signed out of iCloud / Google account?" value={a.account_removed} onChange={(v) => setAns({ account_removed: v })} />
                </div>
              </>)}

              {step === 2 && (<>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" id="ti-name" error={errors.name} required><input id="ti-name" autoComplete="name" className={cx('input', errors.name && 'input-error')} value={c.name} maxLength={120} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
                  <Field label="Phone" id="ti-phone" error={errors.phone} required><input id="ti-phone" type="tel" autoComplete="tel" className={cx('input', errors.phone && 'input-error')} value={c.phone} maxLength={30} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
                </div>
                <Field label="Email" id="ti-email" error={errors.email} required><input id="ti-email" type="email" autoComplete="email" className={cx('input', errors.email && 'input-error')} value={c.email} maxLength={160} onChange={(e) => setC({ ...c, email: e.target.value })} /></Field>
                <Field label="Anything else we should know?" id="ti-notes"><textarea id="ti-notes" rows={3} className="input" value={c.notes} maxLength={2000} onChange={(e) => setC({ ...c, notes: e.target.value })} placeholder="Colour, accessories included, known issues…" /></Field>
                <div>
                  <span className="label">Device photos <span className="font-normal text-ink-400">(optional, up to 5)</span></span>
                  <div className="flex flex-wrap gap-3">
                    {photos.map((p, i) => (
                      <div key={p.url} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-mist-200"><img src={p.url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-white"><X className="h-3.5 w-3.5" /></button></div>
                    ))}
                    {photos.length < 5 && (
                      <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-mist-300 text-ink-400 hover:border-brand-400 hover:text-brand-600">
                        <ImagePlus className="h-6 w-6" aria-hidden="true" /><span className="sr-only">Add photos</span>
                        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { const l = fileList(e.target.files, 5 - photos.length).filter((x) => x.size <= 8e6); setPhotos([...photos, ...l.map((file) => ({ file, url: URL.createObjectURL(file) }))]); e.target.value = ''; }} />
                      </label>
                    )}
                  </div>
                </div>
                {submit.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 ring-1 ring-red-200" role="alert">{submit.error}</p>}
              </>)}
            </div>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-mist-200 pt-6">
            {step > 0 ? <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" aria-hidden="true" />Back</button> : <span />}
            {step < 2 ? <button type="button" className="btn-primary" disabled={!data} onClick={() => validate(step) && setStep(step + 1)}>{step === 1 ? 'See my estimate' : 'Continue'}<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              : <button type="button" className="btn-primary btn-lg" onClick={onSubmit} disabled={submit.status === 'sending'}>{submit.status === 'sending' ? 'Submitting…' : 'Submit trade-in request'}</button>}
          </div>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24" aria-label="Trade-in estimate" aria-live="polite">
          <div className="card overflow-hidden">
            <div className="bg-ink p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Estimated value</p>
              <p className="mt-2 font-display text-3xl font-extrabold">{est ? `${money(est.low)} – ${money(est.high)}` : '—'}</p>
              <p className="mt-1 text-sm text-white/70">{est ? 'Cash estimate' : device ? 'Answer the condition questions' : 'Choose your device'}</p>
            </div>
            {est && <div className="flex items-center justify-between bg-brand-50 px-6 py-4"><span className="text-sm font-semibold text-brand-700">Store credit up to</span><span className="font-display text-xl font-extrabold">{money(est.credit)}</span></div>}
            <div className="space-y-2 p-6 text-sm">
              <div className="flex justify-between gap-3"><span className="text-ink-500">Device</span><span className="text-right font-semibold">{device ? `${device.model}${a.storage ? ' · ' + a.storage : ''}` : '—'}</span></div>
            </div>
          </div>
          <p className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><span><strong>Final valuation requires physical inspection.</strong> Online estimates are based on your answers; the final offer is confirmed in store after we check the device.</span></p>
        </aside>
      </section>

      <section className="bg-mist-100/70 py-16">
        <div className="container-x grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <h2 className="reveal text-2xl font-extrabold sm:text-3xl">Trade-in questions</h2>
          <div className="reveal"><Accordion items={[
            { q: 'How is the final offer decided?', a: 'We inspect the screen, body, battery, cameras and buttons, confirm the device isn’t locked or reported lost, and check that your answers match. If everything matches your answers, your offer will typically fall within your estimated range.' },
            { q: 'What do I need to bring?', a: 'The device, its charger if you have it, and government-issued photo ID. Please back up your data and sign out of iCloud (Find My) or your Google account before you come in.' },
            { q: 'Do you accept broken phones?', a: 'Yes — choose “Cracked / damaged” or answer “No” to powering on and we’ll still give you an estimate.' },
            { q: 'Why is store credit worth more?', a: 'Store credit can go toward a new or pre-owned phone, accessories or a repair, so we’re able to offer more than cash.' }
          ]} /></div>
        </div>
      </section>
      <div className="container-x py-10 text-center"><p className="inline-flex items-center gap-2 text-sm text-ink-500"><Info className="h-4 w-4" aria-hidden="true" />Estimates in Canadian dollars. Offers are subject to inspection and may change.</p></div>
    </div>
  );
}
