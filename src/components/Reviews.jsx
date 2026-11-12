import { useState } from 'react';
import { Star, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useSite } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { Field, Stars } from './ui.jsx';
import { cx } from '../lib/utils.js';

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>
);

export function ReviewForm() {
  const [f, setF] = useState({ name: '', rating: 0, text: '', device: '' });
  const [state, setState] = useState({ status: 'idle', errors: {}, error: '' });
  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'sending', errors: {}, error: '' });
    try { await api('/reviews', { method: 'POST', body: f }); setState({ status: 'done', errors: {}, error: '' }); }
    catch (err) { setState({ status: 'idle', errors: err.errors, error: err.message }); }
  };
  if (state.status === 'done') return (
    <div className="card flex items-start gap-3 p-6"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
      <div><p className="font-semibold">Thank you for your feedback!</p><p className="mt-1 text-sm text-ink-500">Your review will appear on the site once it has been approved.</p></div></div>
  );
  return (
    <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
      <h3 className="text-lg font-bold">Share your experience</h3>
      <Field label="Your rating" error={state.errors?.rating} id="rv-rating" required>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={f.rating === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => setF({ ...f, rating: i })}
              className="rounded-md p-1 transition hover:scale-110">
              <Star className={cx('h-7 w-7', i <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-mist-300')} aria-hidden="true" />
            </button>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="rv-name" error={state.errors?.name} required><input id="rv-name" className={cx('input', state.errors?.name && 'input-error')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} autoComplete="name" /></Field>
        <Field label="Device repaired" id="rv-device"><input id="rv-device" className="input" value={f.device} onChange={(e) => setF({ ...f, device: e.target.value })} placeholder="e.g. iPhone 14 screen" maxLength={80} /></Field>
      </div>
      <Field label="Your review" id="rv-text" error={state.errors?.text} required><textarea id="rv-text" rows={4} className={cx('input', state.errors?.text && 'input-error')} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} maxLength={1500} /></Field>
      {state.error && !Object.keys(state.errors || {}).length && <p className="field-error">{state.error}</p>}
      <button className="btn-primary" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Sending…' : 'Submit review'}</button>
    </form>
  );
}

function GoogleWordmark({ className = 'h-5' }) {
  return (
    <svg viewBox="0 0 272 92" className={className} role="img" aria-label="Google">
      <path fill="#EA4335" d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
      <path fill="#FBBC05" d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z"/>
      <path fill="#4285F4" d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.72 0-12.35 5.71-12.35 13.52 0 7.73 5.63 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z"/>
      <path fill="#34A853" d="M225 3v65h-9.5V3h9.5z"/>
      <path fill="#EA4335" d="M262.02 54.48l7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98l19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z"/>
      <path fill="#4285F4" d="M35.29 41.41V32H67c.31 1.64.47 3.58.47 5.68 0 7.06-1.93 15.79-8.15 22.01-6.05 6.3-13.78 9.66-24.02 9.66C16.32 69.35.36 53.89.36 34.91.36 15.93 16.32.47 35.3.47c10.5 0 17.98 4.12 23.6 9.49l-6.64 6.64c-4.03-3.78-9.49-6.72-16.97-6.72-13.86 0-24.7 11.17-24.7 25.03 0 13.86 10.84 25.03 24.7 25.03 8.99 0 14.11-3.61 17.39-6.89 2.66-2.66 4.41-6.46 5.1-11.65l-22.49.01z"/>
    </svg>
  );
}

// One review card. Long reviews are clamped with a "Read more" toggle so cards stay even.
function ReviewCard({ r }) {
  const [open, setOpen] = useState(false);
  const google = String(r.source || '').toLowerCase() === 'google';
  const long = r.text.length > 260;
  return (
    <figure className="card flex h-full w-full min-w-0 flex-col p-6" data-review={google ? 'google' : 'website'}>
      <figcaption className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-lg font-bold text-white" aria-hidden="true">{r.name.trim().charAt(0).toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{r.name}</span>
          <span className="block text-xs text-ink-400">{r.review_date || (google ? 'Google review' : 'Website review')}</span>
        </span>
        {google && <GoogleG />}
      </figcaption>
      <div className="mt-4"><Stars value={r.rating} /></div>
      <blockquote className={cx('mt-3 flex-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-600', !open && long && 'line-clamp-6')}>{r.text}</blockquote>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-mist-200 pt-3 text-sm">
        {long ? <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Show less' : 'Read more'}</button> : <span />}
        {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink-500 hover:text-brand-700">View on Google<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></a>}
      </div>
    </figure>
  );
}

export default function ReviewsSection({ limit = 6, showForm = false }) {
  const { reviews, business } = useSite();
  const all = reviews || [];
  const list = all.slice(0, limit);
  const google = all.filter((r) => String(r.source || '').toLowerCase() === 'google');
  const rated = google.length ? google : all;
  const avg = rated.length ? rated.reduce((a, r) => a + r.rating, 0) / rated.length : 0;
  const readUrl = business.google_review_url;
  const writeUrl = business.google_write_review_url || business.google_review_url;
  return (
    <div>
      {/* Summary bar with Google branding and both buttons */}
      <div className="reveal flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-card ring-1 ring-mist-200 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mist-50 ring-1 ring-mist-200"><GoogleG /></span>
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-bold"><GoogleWordmark className="h-5 w-auto" /><span>Reviews</span></p>
            {rated.length > 0 ? (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-600"><span className="text-xl font-extrabold text-ink">{avg.toFixed(1)}</span><Stars value={Math.round(avg)} />
                <span>· {rated.length} {google.length ? 'Google review' : 'review'}{rated.length > 1 ? 's' : ''} shown</span></p>
            ) : <p className="mt-1 text-sm text-ink-500">See what customers say about All Uplinks on Google.</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
          {readUrl && <a href={readUrl} target="_blank" rel="noopener noreferrer" className="btn-dark"><GoogleG />Read All Google Reviews</a>}
          {writeUrl && <a href={writeUrl} target="_blank" rel="noopener noreferrer" className="btn-outline"><Star className="h-4 w-4 text-amber-500" aria-hidden="true" />Leave Us a Google Review</a>}
        </div>
      </div>

      {list.length > 0 && (
        <>
          {/* Swipe row on phones, grid from tablet up */}
          <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3" aria-label="Customer reviews" role="list">
            {list.map((r) => <div key={r.id} role="listitem" className="reveal flex w-[85%] shrink-0 snap-start md:w-auto">{<ReviewCard r={r} />}</div>)}
          </div>
          {list.length > 1 && <p className="mt-2 text-center text-xs text-ink-400 md:hidden">Swipe to read more reviews →</p>}
        </>
      )}
      {showForm && <div id="write" className="mt-10 max-w-2xl scroll-mt-28"><ReviewForm /></div>}
    </div>
  );
}
