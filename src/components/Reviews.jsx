import { useState } from 'react';
import { Quote, Star, CheckCircle2 } from 'lucide-react';
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

export default function ReviewsSection({ limit = 6, showForm = false }) {
  const { reviews, business } = useSite();
  const list = (reviews || []).slice(0, limit);
  const avg = reviews?.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) : 0;
  return (
    <div>
      {list.length > 0 ? (
        <>
          <div className="reveal mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Stars value={Math.round(avg)} size="h-5 w-5" />
              <p className="text-sm font-semibold text-ink-600">{avg.toFixed(1)} average from {reviews.length} review{reviews.length > 1 ? 's' : ''}</p>
            </div>
            {business.google_review_url && <a href={business.google_review_url} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm"><GoogleG />See all reviews on Google</a>}
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <figure key={r.id} className="reveal card flex flex-col p-6">
                <Quote className="h-7 w-7 text-brand-200" aria-hidden="true" />
                <Stars value={r.rating} />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-600">“{r.text}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-mist-200 pt-4">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{r.name.charAt(0)}</span>
                  <span><span className="block text-sm font-semibold">{r.name}</span>{r.device && <span className="block text-xs text-ink-400">{r.device}</span>}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <div className="reveal card grid items-center gap-6 p-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="font-display text-xl font-bold">See what Keswick customers say</p>
            <p className="mt-2 max-w-xl text-[15px] text-ink-500">Read our reviews on Google, or share your own experience — honest feedback helps neighbours in Keswick and Georgina choose the right repair shop.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {business.google_review_url && <a href={business.google_review_url} target="_blank" rel="noopener noreferrer" className="btn-dark"><GoogleG />Read our Google reviews</a>}
            <a href="/reviews#write" className="btn-outline">Write a review</a>
          </div>
        </div>
      )}
      {showForm && <div id="write" className="mt-10 max-w-2xl scroll-mt-28"><ReviewForm /></div>}
    </div>
  );
}
