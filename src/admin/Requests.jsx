import { useState } from 'react';
import { Search, Trash2, Plus, X } from 'lucide-react';
import { adminApi } from '../lib/api.js';
import { cx, fmtTime, money } from '../lib/utils.js';
import Spinner from '../components/Spinner.jsx';
import { PageTitle, Badge, STATUS_TONE, useAdminList, toast, Modal } from './kit.jsx';
import { DAYS } from '../../shared/constants.js';

const fileUrl = (p) => `/api/admin/files/${p}`;

function Photos({ list }) {
  if (!list?.length) return <span className="text-ink-400">None</span>;
  return <div className="flex flex-wrap gap-2">{list.map((p) => <a key={p} href={fileUrl(p)} target="_blank" rel="noopener noreferrer"><img src={fileUrl(p)} alt="Customer upload" className="h-20 w-20 rounded-lg object-cover ring-1 ring-mist-200" /></a>)}</div>;
}

function RequestList({ path, title, description, columns, detail, extraFilters }) {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const qs = new URLSearchParams({ ...(status && { status }), ...(q && { q }), ...(from && { from }) }).toString();
  const { data, reload } = useAdminList(`/${path}${qs ? '?' + qs : ''}`, [qs]);
  const [open, setOpen] = useState(null);
  const patch = async (id, body) => { try { await adminApi(`/${path}/${id}`, { method: 'PATCH', body }); toast('Updated'); reload(); return true; } catch (e) { toast(e.message, true); return false; } };
  const del = async (r) => { if (!window.confirm(`Delete ${r.ref}? This cannot be undone.`)) return; await adminApi(`/${path}/${r.id}`, { method: 'DELETE' }); toast('Deleted'); setOpen(null); reload(); };
  const row = open && data?.rows.find((r) => r.id === open);
  return (
    <div>
      <PageTitle title={title}>{description}</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" /><input className="input w-64 pl-9" placeholder="Search name, ref, phone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>
        <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="">All statuses</option>{data?.statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
        {extraFilters && <input type="date" className="input w-44" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" title="From date" />}
      </div>
      {!data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-mist-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-mist-50 text-xs uppercase tracking-wider text-ink-400"><tr>{columns.map(([l]) => <th key={l} className="px-4 py-3 font-semibold">{l}</th>)}<th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-mist-200">
              {data.rows.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-brand-50/40" onClick={() => setOpen(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(r.id)}>
                  {columns.map(([l, fn]) => <td key={l} className="px-4 py-3">{fn(r)}</td>)}
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[r.status]}>{r.status.replace('_', ' ')}</Badge></td>
                </tr>
              ))}
              {!data.rows.length && <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-400">No records found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {row && (
        <Modal title={`${row.ref}`} onClose={() => setOpen(null)} wide>
          {detail(row, patch)}
          <div className="mt-6 grid gap-4 border-t border-mist-200 pt-6 sm:grid-cols-2">
            <div><label className="label" htmlFor="st">Status</label>
              <select id="st" className="input" value={row.status} onChange={(e) => patch(row.id, { status: e.target.value })}>{data.statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="nt">Internal notes</label>
              <textarea id="nt" rows={3} className="input" defaultValue={row.admin_notes || ''} onBlur={(e) => e.target.value !== (row.admin_notes || '') && patch(row.id, { admin_notes: e.target.value })} /></div>
          </div>
          <div className="mt-6 flex justify-between"><button className="btn-ghost text-red-600 hover:bg-red-50" onClick={() => del(row)}><Trash2 className="h-4 w-4" />Delete</button><button className="btn-primary" onClick={() => setOpen(null)}>Done</button></div>
        </Modal>
      )}
    </div>
  );
}

const DL = ({ items }) => <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">{items.filter(Boolean).map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">{k}</dt><dd className="mt-0.5 font-medium text-ink">{v}</dd></div>)}</dl>;

export function Bookings() {
  return (
    <RequestList path="bookings" title="Bookings" description="All online repair bookings. Click a booking to view details, reschedule or update its status." extraFilters
      columns={[['When', (r) => <span className="font-semibold">{r.date} · {fmtTime(r.time)}</span>], ['Ref', (r) => <span className="font-mono text-xs">{r.ref}</span>], ['Customer', (r) => <>{r.name}<span className="block text-xs text-ink-400">{r.phone}</span></>],
        ['Device', (r) => `${r.brand} ${r.model}`], ['Estimate', (r) => r.est_low != null ? `${money(r.est_low)}–${money(r.est_high)}${r.needs_diagnosis ? ' +diag' : ''}` : 'Diagnosis']]}
      detail={(r, patch) => <BookingDetail r={r} patch={patch} />} />
  );
}
function BookingDetail({ r, patch }) {
  const [d, setD] = useState(r.date); const [t, setT] = useState(r.time);
  return (
    <div className="space-y-6">
      <DL items={[['Customer', r.name], ['Phone', <a key="p" href={`tel:${r.phone}`} className="text-brand-700">{r.phone}</a>], ['Email', <a key="e" href={`mailto:${r.email}`} className="text-brand-700">{r.email}</a>],
        ['Device', `${r.category} · ${r.brand} ${r.model}`], ['Repairs', r.repairs.join(', ')], ['Estimate', r.est_low != null ? `${money(r.est_low)} – ${money(r.est_high)}${r.needs_diagnosis ? ' + diagnosis' : ''}` : 'Diagnosis'],
        ['Booked', `${r.created_at} UTC`], ['Details', r.details || '—']]} />
      <div><p className="label">Photos</p><Photos list={r.photos} /></div>
      <div className="rounded-xl bg-mist-50 p-4 ring-1 ring-mist-200">
        <p className="text-sm font-semibold">Reschedule</p>
        <div className="mt-2 flex flex-wrap gap-2"><input type="date" className="input w-44" value={d} onChange={(e) => setD(e.target.value)} aria-label="Date" /><input type="time" step="1800" className="input w-36" value={t} onChange={(e) => setT(e.target.value)} aria-label="Time" />
          <button className="btn-outline" onClick={() => patch(r.id, { date: d, time: t })} disabled={d === r.date && t === r.time}>Save new time</button></div>
      </div>
    </div>
  );
}

export function TradeIns() {
  const C = { likeNew: 'Like new', good: 'Good', fair: 'Fair', broken: 'Damaged' };
  const yn = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');
  return (
    <RequestList path="tradeins" title="Trade-in requests" description="Online trade-in submissions with the estimate shown to the customer."
      columns={[['Received', (r) => r.created_at.slice(0, 16)], ['Ref', (r) => <span className="font-mono text-xs">{r.ref}</span>], ['Customer', (r) => <>{r.name}<span className="block text-xs text-ink-400">{r.phone}</span></>],
        ['Device', (r) => `${r.model} · ${r.storage}`], ['Estimate', (r) => `${money(r.est_low)}–${money(r.est_high)}`]]}
      detail={(r, patch) => (
        <div className="space-y-6">
          <DL items={[['Customer', r.name], ['Phone', r.phone], ['Email', r.email], ['Device', `${r.brand} ${r.model} · ${r.storage}`], ['Screen', C[r.answers.screen]], ['Body', C[r.answers.body]],
            ['Battery', r.answers.battery || '—'], ['Powers on', yn(r.answers.powers)], ['Face ID / fingerprint', yn(r.answers.bio)], ['Unlocked', yn(r.answers.unlocked)], ['Account removed', yn(r.answers.account_removed)],
            ['Estimate (cash)', `${money(r.est_low)} – ${money(r.est_high)}`], ['Store credit (up to)', money(r.est_credit)], ['Notes', r.notes || '—']]} />
          <div><p className="label">Photos</p><Photos list={r.photos} /></div>
          <div className="flex items-end gap-2"><div><label className="label" htmlFor="offer">Final offer (CAD)</label><input id="offer" type="number" className="input w-40" defaultValue={r.offer_amount ?? ''} onBlur={(e) => patch(r.id, { offer_amount: e.target.value === '' ? null : Number(e.target.value) })} /></div></div>
        </div>
      )} />
  );
}

export function Inquiries() {
  return (
    <RequestList path="inquiries" title="Customer inquiries" description="Messages from the contact form and product pages."
      columns={[['Received', (r) => r.created_at.slice(0, 16)], ['Topic', (r) => r.topic], ['Customer', (r) => <>{r.name}<span className="block text-xs text-ink-400">{r.email}</span></>], ['Message', (r) => <span className="line-clamp-1 max-w-xs">{r.message}</span>]]}
      detail={(r) => (
        <div className="space-y-6">
          <DL items={[['Name', r.name], ['Email', <a key="e" className="text-brand-700" href={`mailto:${r.email}?subject=${encodeURIComponent('Re: your message to All Uplinks (' + r.ref + ')')}`}>{r.email}</a>], ['Phone', r.phone || '—'], ['Topic', r.topic], r.product && ['Product', r.product]]} />
          <div><p className="label">Message</p><p className="whitespace-pre-wrap rounded-xl bg-mist-50 p-4 text-sm ring-1 ring-mist-200">{r.message}</p></div>
          <div><p className="label">Photos</p><Photos list={r.photos} /></div>
        </div>
      )} />
  );
}

export function Schedule() {
  const { data, reload } = useAdminList('/settings');
  const blocked = useAdminList('/t/blocked_dates');
  const [cfg, setCfg] = useState(null);
  const [nb, setNb] = useState({ date: '', reason: '' });
  if (!data) return <Spinner />;
  const c = cfg || data.booking;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const save = async () => { try { await adminApi('/settings/booking', { method: 'PUT', body: c }); toast('Schedule saved'); setCfg(null); reload(); } catch (e) { toast(e.message, true); } };
  const setDay = (d, v) => setCfg({ ...c, weekly: { ...c.weekly, [d]: v } });
  return (
    <div>
      <PageTitle title="Appointment schedule" actions={<button className="btn-primary" onClick={save} disabled={!cfg}>Save changes</button>}>Controls which online booking slots customers can choose. This is separate from the public store hours (Site settings → Hours).</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <h2 className="font-bold">Weekly booking windows</h2>
          <div className="mt-4 divide-y divide-mist-200">
            {order.map((d) => { const w = c.weekly[d]; return (
              <div key={d} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-28 text-sm font-semibold">{DAYS[(d + 6) % 7]}</span>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded" checked={!!w} onChange={(e) => setDay(d, e.target.checked ? { open: '10:00', close: '18:00' } : null)} />Open for bookings</label>
                {w && <><input type="time" className="input w-32 py-1.5" value={w.open} onChange={(e) => setDay(d, { ...w, open: e.target.value })} aria-label="Opens" /><span className="text-ink-400">to</span><input type="time" className="input w-32 py-1.5" value={w.close} onChange={(e) => setDay(d, { ...w, close: e.target.value })} aria-label="Closes" /></>}
              </div>); })}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card grid gap-4 p-5 sm:grid-cols-2">
            {[['slot_minutes', 'Slot length (minutes)'], ['capacity', 'Bookings per slot'], ['days_ahead', 'Days bookable ahead'], ['min_lead_minutes', 'Minimum notice (minutes)']].map(([k, l]) => (
              <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} type="number" min="1" className="input" value={c[k]} onChange={(e) => setCfg({ ...c, [k]: Math.max(k === 'min_lead_minutes' ? 0 : 1, Number(e.target.value)) })} /></div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="font-bold">Closed dates</h2>
            <p className="mt-1 text-sm text-ink-500">Holidays or days off — no bookings will be offered.</p>
            <form className="mt-4 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); try { await adminApi('/t/blocked_dates', { method: 'POST', body: nb }); setNb({ date: '', reason: '' }); blocked.reload(); toast('Date blocked'); } catch (err) { toast(err.message, true); } }}>
              <input type="date" className="input w-40" required value={nb.date} onChange={(e) => setNb({ ...nb, date: e.target.value })} aria-label="Date" />
              <input className="input flex-1" placeholder="Reason (optional)" value={nb.reason} onChange={(e) => setNb({ ...nb, reason: e.target.value })} aria-label="Reason" />
              <button className="btn-outline"><Plus className="h-4 w-4" />Add</button>
            </form>
            <ul className="mt-4 divide-y divide-mist-200 text-sm">
              {(blocked.data || []).map((b) => <li key={b.id} className="flex items-center justify-between py-2"><span><strong>{b.date}</strong> {b.reason && <span className="text-ink-500">· {b.reason}</span>}</span>
                <button className="btn-ghost btn-sm" aria-label={`Remove ${b.date}`} onClick={async () => { await adminApi(`/t/blocked_dates/${b.id}`, { method: 'DELETE' }); blocked.reload(); }}><X className="h-4 w-4" /></button></li>)}
              {blocked.data && !blocked.data.length && <li className="py-3 text-ink-400">No closed dates.</li>}
            </ul>
          </div>
        </div>
      </div>
      <p className={cx('mt-4 text-xs text-ink-400')}>Changes apply immediately to the booking calendar on the website.</p>
    </div>
  );
}
