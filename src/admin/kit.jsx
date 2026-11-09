import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Upload, Search, GripVertical } from 'lucide-react';
import { adminApi } from '../lib/api.js';
import { cx, imgSrc } from '../lib/utils.js';
import Spinner from '../components/Spinner.jsx';

export function useAdminList(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null });
  const reload = useCallback(() => adminApi(path).then((data) => setState({ data, error: null })).catch((error) => setState({ data: null, error })), [path]); // eslint-disable-line
  useEffect(() => { reload(); }, [reload, ...deps]); // eslint-disable-line
  return { ...state, reload };
}

export function PageTitle({ title, children, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-extrabold">{title}</h1>{children && <p className="mt-1 text-sm text-ink-500">{children}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => { if (msg) { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); } }, [msg, onDone]);
  if (!msg) return null;
  return <div role="status" className={cx('fixed bottom-6 right-6 z-[60] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lift animate-fade-up', msg.error ? 'bg-red-600' : 'bg-ink')}>{msg.text}</div>;
}
let toastSetter = null;
export const toast = (text, error = false) => toastSetter && toastSetter({ text, error });
export function ToastHost() { const [m, setM] = useState(null); toastSetter = setM; return <Toast msg={m} onDone={() => setM(null)} />; }

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('my-8 w-full rounded-2xl bg-white shadow-lift ring-1 ring-mist-200', wide ? 'max-w-4xl' : 'max-w-2xl')}>
        <div className="flex items-center justify-between border-b border-mist-200 px-6 py-4"><h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label="Close"><X className="h-5 w-5" /></button></div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export async function uploadImage(file) {
  const fd = new FormData(); fd.append('file', file);
  const r = await adminApi('/upload', { method: 'POST', form: fd });
  return r.url;
}

function ImagesInput({ value = [], onChange, single }) {
  const list = single ? (value ? [value] : []) : value || [];
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState('');
  const add = (v) => onChange(single ? v : [...list, v]);
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {list.map((im, i) => (
          <div key={im + i} className="relative h-20 w-20 overflow-hidden rounded-xl bg-mist-100 ring-1 ring-mist-200">
            <img src={imgSrc(im, 640)} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove image" onClick={() => onChange(single ? '' : list.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        {(!single || !list.length) && (
          <label className={cx('grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-mist-300 text-ink-400 hover:border-brand-400', busy && 'opacity-50')}>
            {busy ? <Spinner /> : <Upload className="h-5 w-5" aria-hidden="true" />}<span className="sr-only">Upload image</span>
            <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusy(true);
              try { add(await uploadImage(f)); } catch (err) { toast(err.message, true); } finally { setBusy(false); }
            }} />
          </label>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input className="input py-1.5 text-sm" placeholder="…or library image key, e.g. svc-ipad" value={key} onChange={(e) => setKey(e.target.value)} />
        <button type="button" className="btn-outline btn-sm" onClick={() => { if (key.trim()) { add(key.trim()); setKey(''); } }}>Add</button>
      </div>
    </div>
  );
}

function ListInput({ value = [], onChange, placeholder }) {
  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex gap-2"><GripVertical className="mt-3 h-4 w-4 text-ink-300" aria-hidden="true" />
          <input className="input" value={v} placeholder={placeholder} onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" className="btn-ghost px-2" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button></div>
      ))}
      <button type="button" className="btn-outline btn-sm" onClick={() => onChange([...value, ''])}><Plus className="h-3.5 w-3.5" />Add</button>
    </div>
  );
}

function PairsInput({ value = [], onChange, labels = ['Label', 'Value'], objKeys }) {
  const rows = objKeys ? value.map((o) => [o[objKeys[0]], o[objKeys[1]]]) : value;
  const emit = (r) => onChange(objKeys ? r.map(([a, b]) => ({ [objKeys[0]]: a, [objKeys[1]]: b })) : r);
  return (
    <div className="space-y-2">
      {rows.map(([a, b], i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <input className="input" placeholder={labels[0]} value={a || ''} onChange={(e) => emit(rows.map((r, j) => (j === i ? [e.target.value, r[1]] : r)))} />
          {objKeys ? <textarea rows={2} className="input" placeholder={labels[1]} value={b || ''} onChange={(e) => emit(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />
            : <input className="input" placeholder={labels[1]} value={b || ''} onChange={(e) => emit(rows.map((r, j) => (j === i ? [r[0], e.target.value] : r)))} />}
          <button type="button" className="btn-ghost px-2" aria-label="Remove" onClick={() => emit(rows.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" className="btn-outline btn-sm" onClick={() => emit([...rows, ['', '']])}><Plus className="h-3.5 w-3.5" />Add row</button>
    </div>
  );
}

export function FieldInput({ field, value, onChange }) {
  const id = 'f-' + field.name;
  const t = field.type || 'text';
  let input;
  if (t === 'textarea') input = <textarea id={id} rows={field.rows || 4} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  else if (t === 'number') input = <input id={id} type="number" step={field.step || 'any'} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
  else if (t === 'bool') input = <label className="inline-flex items-center gap-2 text-sm"><input id={id} type="checkbox" className="h-5 w-5 rounded text-brand-600" checked={!!value} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />{field.checkLabel || 'Yes'}</label>;
  else if (t === 'select') input = <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(field.numeric ? Number(e.target.value) : e.target.value)}>{!field.required && <option value="">—</option>}{field.options.map((o) => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}</select>;
  else if (t === 'list') input = <ListInput value={value || []} onChange={onChange} placeholder={field.placeholder} />;
  else if (t === 'pairs') input = <PairsInput value={value || []} onChange={onChange} labels={field.labels} objKeys={field.objKeys} />;
  else if (t === 'images') input = <ImagesInput value={value || []} onChange={onChange} />;
  else if (t === 'image') input = <ImagesInput value={value || ''} onChange={onChange} single />;
  else if (t === 'json') input = <JsonInput id={id} value={value} onChange={onChange} />;
  else input = <input id={id} className="input" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
  return (
    <div className={field.full ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">{field.label}{field.required && <span className="text-red-500"> *</span>}</label>
      {input}
      {field.hint && <p className="mt-1 text-xs text-ink-400">{field.hint}</p>}
    </div>
  );
}
function JsonInput({ id, value, onChange }) {
  const [text, setText] = useState(JSON.stringify(value ?? {}, null, 2));
  const [err, setErr] = useState('');
  return <><textarea id={id} rows={4} className={cx('input font-mono text-xs', err && 'input-error')} value={text} onChange={(e) => { setText(e.target.value); try { onChange(JSON.parse(e.target.value)); setErr(''); } catch { setErr('Invalid JSON'); } }} />{err && <p className="field-error">{err}</p>}</>;
}

export function EditForm({ fields, initial, onSave, onCancel }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave(v); } finally { setBusy(false); } }} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">{fields.map((f) => <FieldInput key={f.name} field={f} value={v[f.name]} onChange={(x) => setV({ ...v, [f.name]: x })} />)}</div>
      <div className="flex justify-end gap-2 border-t border-mist-200 pt-4"><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
    </form>
  );
}

// Generic table + modal editor over /api/admin/t/:table
export function ResourceEditor({ table, title, fields, columns, defaults = {}, query = '', searchKeys = [], description, singular }) {
  const { data, error, reload } = useAdminList(`/t/${table}${query}`, [query]);
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const save = async (v) => {
    try {
      if (edit.id) await adminApi(`/t/${table}/${edit.id}`, { method: 'PUT', body: v });
      else await adminApi(`/t/${table}`, { method: 'POST', body: v });
      toast('Saved'); setEdit(null); reload();
    } catch (e) { toast(e.message, true); }
  };
  const del = async (row) => {
    if (!window.confirm(`Delete “${row[columns[0].key] ?? row.id}”? This cannot be undone.`)) return;
    try { await adminApi(`/t/${table}/${row.id}`, { method: 'DELETE' }); toast('Deleted'); reload(); } catch (e) { toast(e.message, true); }
  };
  const rows = (data || []).filter((r) => !q || searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      {title && <PageTitle title={title} actions={<button className="btn-primary" onClick={() => setEdit({ ...defaults })}><Plus className="h-4 w-4" />Add {singular || 'item'}</button>}>{description}</PageTitle>}
      {!title && <div className="mb-3 flex justify-end"><button className="btn-primary btn-sm" onClick={() => setEdit({ ...defaults })}><Plus className="h-3.5 w-3.5" />Add {singular || 'item'}</button></div>}
      {searchKeys.length > 0 && <div className="relative mb-4 max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" /><input className="input pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" /></div>}
      {error && <p className="text-red-600">{error.message}</p>}
      {!data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-mist-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-mist-50 text-xs uppercase tracking-wider text-ink-400"><tr>{columns.map((c) => <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>)}<th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-mist-200">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-mist-50/60">
                  {columns.map((c) => <td key={c.key} className="px-4 py-3 align-top">{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>)}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button className="btn-ghost btn-sm" onClick={() => setEdit(r)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" />Edit</button>
                    <button className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => del(r)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={columns.length + 1} className="px-4 py-10 text-center text-ink-400">Nothing here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {edit && <Modal title={edit.id ? `Edit ${singular || 'item'}` : `Add ${singular || 'item'}`} onClose={() => setEdit(null)} wide={fields.length > 6}><EditForm fields={fields} initial={edit} onSave={save} onCancel={() => setEdit(null)} /></Modal>}
    </div>
  );
}

export const Badge = ({ children, tone = 'gray' }) => {
  const tones = { gray: 'bg-mist-100 text-ink-600', blue: 'bg-brand-50 text-brand-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-800', red: 'bg-red-50 text-red-700' };
  return <span className={cx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
};
export const STATUS_TONE = { pending: 'amber', confirmed: 'blue', in_progress: 'blue', completed: 'green', cancelled: 'red', no_show: 'red', new: 'amber', contacted: 'blue', offer_made: 'blue', accepted: 'green', declined: 'red', replied: 'green', closed: 'gray' };
