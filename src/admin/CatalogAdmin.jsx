import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../lib/api.js';
import { cx } from '../lib/utils.js';
import Spinner from '../components/Spinner.jsx';
import { PageTitle, ResourceEditor, useAdminList, toast, Badge } from './kit.jsx';

const DEVICE_TYPES = ['Phone', 'Tablet', 'Laptop', 'Console', 'Other'];

export function Pricing() {
  const cats = useAdminList('/t/categories');
  const [catId, setCatId] = useState('');
  const [grid, setGrid] = useState(null);
  const [q, setQ] = useState('');
  const [pricing, setPricing] = useState(null);
  useEffect(() => { if (!catId && cats.data?.length) setCatId(String(cats.data[0].id)); }, [cats.data, catId]);
  useEffect(() => { if (catId) { setGrid(null); adminApi('/prices?category_id=' + catId).then(setGrid).catch((e) => toast(e.message, true)); } }, [catId]);
  useEffect(() => { adminApi('/settings').then((s) => setPricing(s.pricing)); }, []);
  const cellOf = (m, r) => grid.prices.find((p) => p.model_id === m && p.repair_type_id === r);
  const priceOf = (m, r) => cellOf(m, r)?.price;
  // Saves one cell. "from" empty = no price (quoted in store). "to" empty = automatic range (from + variance).
  const save = async (model_id, repair_type_id, rawFrom, rawTo) => {
    const cur = cellOf(model_id, repair_type_id);
    const price = rawFrom === '' ? null : Number(rawFrom);
    const price_high = rawTo === '' || price == null ? null : Number(rawTo);
    if (price === (cur?.price ?? null) && price_high === (cur?.price_high ?? null)) return;
    if (price != null && !(price >= 0)) return toast('Enter a valid price', true);
    if (price_high != null && !(price_high >= price)) return toast('"To" must be equal to or higher than the price', true);
    try {
      await adminApi('/prices', { method: 'PUT', body: { model_id, repair_type_id, price, price_high } });
      setGrid((g) => ({ ...g, prices: [...g.prices.filter((p) => !(p.model_id === model_id && p.repair_type_id === repair_type_id)), ...(price == null ? [] : [{ model_id, repair_type_id, price, price_high }])] }));
      toast('Price saved');
    } catch (e) { toast(e.message, true); }
  };
  const brandName = (id) => grid.brands.find((b) => b.id === id)?.name;
  const models = grid ? grid.models.filter((m) => m.name.toLowerCase().includes(q.toLowerCase())) : [];
  const rts = grid ? grid.repairTypes.filter((r) => r.active) : [];
  return (
    <div>
      <PageTitle title="Repair prices">Prices in CAD by model and repair, shown to customers as a range (“$100 – $155”). Enter the price, and optionally the “to” price; if “to” is empty the range is the price + the variance below. Leave the price empty for “Quote in store”. Changes go live instantly.</PageTitle>
      {pricing && (
        <form className="card mb-6 grid gap-4 p-5 md:grid-cols-[160px_1fr_auto]" onSubmit={async (e) => { e.preventDefault(); await adminApi('/settings/pricing', { method: 'PUT', body: pricing }); toast('Pricing note saved'); }}>
          <div><label className="label" htmlFor="var">Price variance ($)</label><input id="var" type="number" min="0" className="input" value={pricing.variance} onChange={(e) => setPricing({ ...pricing, variance: Number(e.target.value) })} /><p className="mt-1 text-xs text-ink-400">Shown as “$price – $price+variance”. Use 0 for a single price.</p></div>
          <div><label className="label" htmlFor="pnote">Price note shown to customers</label><textarea id="pnote" rows={2} className="input" value={pricing.note} onChange={(e) => setPricing({ ...pricing, note: e.target.value })} /></div>
          <div className="flex items-end"><button className="btn-outline">Save</button></div>
        </form>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(cats.data || []).map((c) => <button key={c.id} role="tab" aria-selected={String(c.id) === catId} onClick={() => setCatId(String(c.id))}
            className={cx('rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 ring-inset', String(c.id) === catId ? 'bg-ink text-white ring-ink' : 'bg-white ring-mist-300 hover:ring-brand-300')}>{c.name}</button>)}
        </div>
        <div className="relative ml-auto"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" /><input className="input w-56 pl-9" placeholder="Filter models" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter models" /></div>
      </div>
      {!grid ? <Spinner /> : (
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-white ring-1 ring-mist-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-mist-50 text-xs uppercase tracking-wider text-ink-400"><tr><th className="sticky left-0 bg-mist-50 px-4 py-3">Model</th>{rts.map((r) => <th key={r.id} className="whitespace-nowrap px-3 py-3">{r.name}{r.diagnose_only ? <span className="block normal-case text-ink-300">diagnosis</span> : null}</th>)}</tr></thead>
            <tbody className="divide-y divide-mist-200">
              {models.map((m) => (
                <tr key={m.id} className={cx(!m.active && 'opacity-50')}>
                  <th className="sticky left-0 whitespace-nowrap bg-white px-4 py-2 font-semibold">{m.name}{grid.brands.length > 1 && <span className="ml-1 font-normal text-ink-400">· {brandName(m.brand_id)}</span>}</th>
                  {rts.map((r) => (
                    <td key={r.id} className="px-2 py-1.5">
                      {(() => { const c = cellOf(m.id, r.id); const k = `${m.id}-${r.id}`;
                        const commit = (e) => { const row = e.currentTarget.closest('[data-cell]'); save(m.id, r.id, row.querySelector('[data-from]').value, row.querySelector('[data-to]').value); };
                        return (
                          <div className="flex items-center gap-1" data-cell="">
                            <div className="relative"><span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                              <input key={k + 'f'} data-from="" type="number" min="0" inputMode="numeric" aria-label={`${m.name} ${r.name} price`} defaultValue={c?.price ?? ''}
                                onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                className="w-20 rounded-lg border-0 py-1.5 pl-6 pr-1 text-sm ring-1 ring-inset ring-mist-200 focus:ring-2 focus:ring-brand-500" /></div>
                            <span className="text-xs text-ink-400">to</span>
                            <input key={k + 't'} data-to="" type="number" min="0" inputMode="numeric" aria-label={`${m.name} ${r.name} price to`} defaultValue={c?.price_high ?? ''}
                              placeholder={c ? String(c.price + (pricing?.variance || 0)) : ''} disabled={!c}
                              onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              className="w-16 rounded-lg border-0 px-2 py-1.5 text-sm ring-1 ring-inset ring-mist-200 placeholder:text-ink-300 focus:ring-2 focus:ring-brand-500 disabled:bg-mist-50" />
                          </div>
                        ); })()}
                    </td>
                  ))}
                </tr>
              ))}
              {!models.length && <tr><td colSpan={rts.length + 1} className="px-4 py-10 text-center text-ink-400">No models. Add some under “Devices & repairs”.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Catalogue() {
  const cats = useAdminList('/t/categories');
  const [tab, setTab] = useState('categories');
  const [catId, setCatId] = useState('');
  const [brandId, setBrandId] = useState('');
  const brands = useAdminList(`/t/brands${catId ? '?category_id=' + catId : ''}`, [catId]);
  useEffect(() => { setBrandId(''); }, [catId]);
  const catOpts = (cats.data || []).map((c) => [c.id, c.name]);
  return (
    <div>
      <PageTitle title="Devices & repairs">Manage device categories (calculator step 1), brands, models and repair types.</PageTitle>
      <div className="mb-6 flex gap-1.5 border-b border-mist-200">
        {[['categories', 'Categories'], ['brands', 'Brands'], ['models', 'Models'], ['repairs', 'Repair types']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold', tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink')}>{l}</button>))}
      </div>
      {tab === 'categories' && <ResourceEditor table="categories" singular="category"
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'slug', label: 'URL slug', required: true }, { name: 'device_type', label: 'Device type', type: 'select', options: DEVICE_TYPES, required: true, hint: 'Determines which repair types apply.' },
          { name: 'blurb', label: 'Short description' }, { name: 'image', label: 'Image', type: 'image' }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Visible', type: 'bool' }]}
        defaults={{ active: 1, sort: 99, device_type: 'Phone' }}
        columns={[{ key: 'name', label: 'Name' }, { key: 'device_type', label: 'Type' }, { key: 'slug', label: 'Slug' }, { key: 'active', label: 'Visible', render: (r) => r.active ? <Badge tone="green">Yes</Badge> : <Badge>No</Badge> }]} />}
      {(tab === 'brands' || tab === 'models') && (
        <div className="mb-4 flex flex-wrap gap-2">
          <select className="input w-56" value={catId} onChange={(e) => setCatId(e.target.value)} aria-label="Category"><option value="">Choose a category</option>{catOpts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
          {tab === 'models' && catId && <select className="input w-56" value={brandId} onChange={(e) => setBrandId(e.target.value)} aria-label="Brand"><option value="">Choose a brand</option>{(brands.data || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
        </div>
      )}
      {tab === 'brands' && catId && <ResourceEditor table="brands" singular="brand" query={`?category_id=${catId}`}
        fields={[{ name: 'name', label: 'Brand name', required: true }, { name: 'category_id', label: 'Category', type: 'select', options: catOpts, numeric: true, required: true }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Visible', type: 'bool' }]}
        defaults={{ category_id: Number(catId), active: 1, sort: 99 }} columns={[{ key: 'name', label: 'Brand' }, { key: 'sort', label: 'Sort' }, { key: 'active', label: 'Visible', render: (r) => (r.active ? 'Yes' : 'No') }]} />}
      {tab === 'models' && brandId && <ResourceEditor table="models" singular="model" query={`?brand_id=${brandId}`} searchKeys={['name']}
        fields={[{ name: 'name', label: 'Model name', required: true }, { name: 'brand_id', label: 'Brand', type: 'select', options: (brands.data || []).map((b) => [b.id, b.name]), numeric: true, required: true }, { name: 'sort', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' }, { name: 'active', label: 'Visible', type: 'bool' }]}
        defaults={{ brand_id: Number(brandId), active: 1, sort: 0 }} columns={[{ key: 'name', label: 'Model' }, { key: 'sort', label: 'Sort' }, { key: 'active', label: 'Visible', render: (r) => (r.active ? 'Yes' : 'No') }]} />}
      {(tab === 'brands' || tab === 'models') && !(tab === 'brands' ? catId : brandId) && <p className="text-sm text-ink-500">Select {tab === 'brands' ? 'a category' : 'a category and brand'} to manage {tab}.</p>}
      {tab === 'repairs' && <ResourceEditor table="repair_types" singular="repair type"
        fields={[{ name: 'name', label: 'Display name', required: true }, { name: 'key', label: 'Key', required: true, hint: 'Short identifier, e.g. screen. Must be unique per device type.' }, { name: 'device_type', label: 'Device type', type: 'select', options: DEVICE_TYPES, required: true },
          { name: 'time_estimate', label: 'Estimated time', placeholder: 'e.g. 30–60 min' }, { name: 'diagnose_only', label: 'Diagnosis required', type: 'bool', checkLabel: 'Always quoted after diagnosis' }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Visible', type: 'bool' }]}
        defaults={{ device_type: 'Phone', active: 1, sort: 50 }}
        columns={[{ key: 'device_type', label: 'Type' }, { key: 'name', label: 'Repair' }, { key: 'time_estimate', label: 'Time' }, { key: 'diagnose_only', label: 'Diagnosis', render: (r) => (r.diagnose_only ? 'Yes' : '') }]} />}
    </div>
  );
}

export function TradeInValues() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { adminApi('/settings').then((s) => setCfg(s.tradein_config)); }, []);
  const num = (path, v) => { const c = structuredClone(cfg); let o = c; for (const k of path.slice(0, -1)) o = o[k]; o[path.at(-1)] = Number(v); setCfg(c); };
  return (
    <div>
      <PageTitle title="Trade-in values">Base values (cash, top condition) and the multipliers used for the instant online estimate. Estimate = (base + storage bonus) × condition × battery × penalties.</PageTitle>
      {cfg && (
        <form className="card mb-8 space-y-5 p-5" onSubmit={async (e) => { e.preventDefault(); await adminApi('/settings/tradein_config', { method: 'PUT', body: cfg }); toast('Valuation settings saved'); }}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="label">Store credit bonus</label><input type="number" step="0.01" className="input" value={cfg.creditBonus} onChange={(e) => num(['creditBonus'], e.target.value)} /><p className="mt-1 text-xs text-ink-400">0.20 = 20% more as credit</p></div>
            <div><label className="label">Range low factor</label><input type="number" step="0.01" className="input" value={cfg.rangeLow} onChange={(e) => num(['rangeLow'], e.target.value)} /></div>
          </div>
          {[['condition', 'Condition multipliers'], ['battery', 'Battery health multipliers'], ['noPenalty', 'Multiplier when answer is “No”'], ['storageBonus', 'Storage bonus ($)']].map(([k, l]) => (
            <fieldset key={k}><legend className="text-sm font-bold">{l}</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(cfg[k] || {}).map(([kk, v]) => <div key={kk}><label className="label text-xs">{kk}</label><input type="number" step="0.01" className="input" value={v} onChange={(e) => num([k, kk], e.target.value)} /></div>)}</div>
            </fieldset>
          ))}
          <button className="btn-primary">Save valuation settings</button>
        </form>
      )}
      <ResourceEditor table="tradein_devices" singular="device" searchKeys={['model', 'brand']}
        fields={[{ name: 'device_type', label: 'Device type', type: 'select', options: ['Phone', 'Tablet'], required: true }, { name: 'brand', label: 'Brand', required: true }, { name: 'model', label: 'Model', required: true },
          { name: 'base_value', label: 'Base value (CAD)', type: 'number', required: true }, { name: 'storages', label: 'Storage options', type: 'list', placeholder: 'e.g. 256GB', full: true }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Visible', type: 'bool' }]}
        defaults={{ device_type: 'Phone', active: 1, sort: 0, storages: ['128GB', '256GB'] }}
        columns={[{ key: 'brand', label: 'Brand' }, { key: 'model', label: 'Model' }, { key: 'base_value', label: 'Base value', render: (r) => '$' + r.base_value }, { key: 'storages', label: 'Storage', render: (r) => r.storages.join(', ') }]} />
    </div>
  );
}
