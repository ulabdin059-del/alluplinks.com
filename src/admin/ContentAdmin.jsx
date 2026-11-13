import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { adminApi } from '../lib/api.js';
import { imgSrc } from '../lib/utils.js';
import Spinner from '../components/Spinner.jsx';
import { PageTitle, ResourceEditor, useAdminList, toast, Badge, FieldInput } from './kit.jsx';
import { SHOP_CATEGORIES, DAYS } from '../../shared/constants.js';

export function ServicesAdmin() {
  return <ResourceEditor table="services" title="Services" singular="service" searchKeys={['name', 'slug']}
    description="Each service has its own page at /services/slug. Prices are pulled live from the repair price table using the price source."
    fields={[{ name: 'name', label: 'Service name', required: true }, { name: 'slug', label: 'URL slug', required: true }, { name: 'short', label: 'Short summary', type: 'textarea', rows: 2, full: true },
      { name: 'description', label: 'Description', type: 'textarea', rows: 5, full: true }, { name: 'benefits', label: 'Repair benefits', type: 'list', full: true },
      { name: 'image', label: 'Image', type: 'image' }, { name: 'image_alt', label: 'Image alt text' },
      { name: 'price_source', label: 'Price source', type: 'json', full: true, hint: 'e.g. {"categories":["iphone"],"repairs":["screen"]} — leave {} for diagnosis-based services.' },
      { name: 'price_note', label: 'Pricing note (diagnosis services)', type: 'textarea', rows: 2, full: true }, { name: 'time_estimate', label: 'Estimated time' }, { name: 'warranty', label: 'Warranty text (optional)' },
      { name: 'faqs', label: 'Service FAQs', type: 'pairs', labels: ['Question', 'Answer'], objKeys: ['q', 'a'], full: true },
      { name: 'meta_title', label: 'SEO title', full: true }, { name: 'meta_description', label: 'SEO description', type: 'textarea', rows: 2, full: true },
      { name: 'featured', label: 'Featured on homepage', type: 'bool' }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Published', type: 'bool' }]}
    defaults={{ active: 1, sort: 99, benefits: [], faqs: [], price_source: {} }}
    columns={[{ key: 'name', label: 'Service', render: (r) => <span className="flex items-center gap-3"><img src={imgSrc(r.image, 640)} alt="" className="h-9 w-9 rounded-lg object-cover" />{r.name}</span> }, { key: 'slug', label: 'Slug' },
      { key: 'featured', label: 'Featured', render: (r) => (r.featured ? <Badge tone="blue">Yes</Badge> : '') }, { key: 'active', label: 'Status', render: (r) => (r.active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>) }]} />;
}

export function ProductsAdmin() {
  return <ResourceEditor table="products" title="Products" singular="product" searchKeys={['name', 'brand', 'category']}
    description="Leave price empty to show “Call for current price”. Product images can be uploaded here."
    fields={[{ name: 'name', label: 'Product name', required: true }, { name: 'slug', label: 'URL slug', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: SHOP_CATEGORIES.map((c) => [c.slug, c.name]) },
      { name: 'brand', label: 'Brand' }, { name: 'condition', label: 'Condition', type: 'select', required: true, options: [['new', 'New'], ['pre-owned', 'Pre-owned']] },
      { name: 'price', label: 'Price (CAD)', type: 'number', step: '0.01' }, { name: 'compare_at', label: 'Compare-at price (optional)', type: 'number', step: '0.01' },
      { name: 'images', label: 'Images', type: 'images', full: true }, { name: 'short', label: 'Short description', type: 'textarea', rows: 2, full: true },
      { name: 'description', label: 'Full description', type: 'textarea', rows: 5, full: true }, { name: 'specs', label: 'Specifications', type: 'pairs', labels: ['Spec', 'Value'], full: true },
      { name: 'featured', label: 'Featured', type: 'bool' }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Published', type: 'bool' }]}
    defaults={{ active: 1, sort: 99, condition: 'new', category: 'cases', images: [], specs: [] }}
    columns={[{ key: 'name', label: 'Product', render: (r) => <span className="flex items-center gap-3"><img src={imgSrc(r.images[0], 640)} alt="" className="h-9 w-9 rounded-lg object-cover" />{r.name}</span> },
      { key: 'category', label: 'Category' }, { key: 'price', label: 'Price', render: (r) => (r.price != null ? '$' + r.price : <span className="text-ink-400">Call</span>) }, { key: 'active', label: 'Status', render: (r) => (r.active ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>) }]} />;
}

export function FaqsAdmin() {
  return <ResourceEditor table="faqs" title="FAQs" singular="FAQ" searchKeys={['question', 'answer']} description="FAQs with page “general” appear on the homepage and the FAQ page, and in FAQ structured data."
    fields={[{ name: 'question', label: 'Question', required: true, full: true }, { name: 'answer', label: 'Answer', type: 'textarea', required: true, full: true }, { name: 'page', label: 'Page', placeholder: 'general' }, { name: 'sort', label: 'Sort order', type: 'number' }, { name: 'active', label: 'Published', type: 'bool' }]}
    defaults={{ page: 'general', active: 1, sort: 99 }} columns={[{ key: 'question', label: 'Question' }, { key: 'page', label: 'Page' }, { key: 'active', label: 'Status', render: (r) => (r.active ? 'Live' : 'Hidden') }]} />;
}

export function ReviewsAdmin() {
  const { data, reload } = useAdminList('/t/reviews');
  const setApproved = async (r, v) => { await adminApi(`/t/reviews/${r.id}`, { method: 'PUT', body: { approved: v } }); toast(v ? 'Review published' : 'Review hidden'); reload(); };
  const pending = (data || []).filter((r) => !r.approved);
  return (
    <div>
      <PageTitle title="Reviews">Only publish genuine customer reviews. Google reviews appear first on the website, with Google branding and a “View on Google” link. Website submissions are held here for approval.</PageTitle>
      {pending.length > 0 && (
        <div className="mb-8 space-y-3">
          <h2 className="font-bold">Awaiting approval ({pending.length})</h2>
          {pending.map((r) => (
            <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="font-semibold">{r.name} · {'★'.repeat(r.rating)}<span className="text-mist-300">{'★'.repeat(5 - r.rating)}</span></p>{r.device && <p className="text-xs text-ink-400">{r.device}</p>}<p className="mt-1 text-sm text-ink-600">{r.text}</p></div>
              <div className="flex shrink-0 gap-2"><button className="btn-primary btn-sm" onClick={() => setApproved(r, 1)}><CheckCircle2 className="h-3.5 w-3.5" />Approve</button><button className="btn-outline btn-sm" onClick={async () => { if (window.confirm('Delete this review?')) { await adminApi(`/t/reviews/${r.id}`, { method: 'DELETE' }); reload(); } }}><XCircle className="h-3.5 w-3.5" />Delete</button></div>
            </div>
          ))}
        </div>
      )}
      <ResourceEditor table="reviews" singular="review" searchKeys={['name', 'text']}
        fields={[{ name: 'name', label: 'Customer name', required: true }, { name: 'rating', label: 'Rating', type: 'select', options: [[5, '5'], [4, '4'], [3, '3'], [2, '2'], [1, '1']], numeric: true, required: true },
          { name: 'text', label: 'Review', type: 'textarea', required: true, full: true, hint: 'Copy the text exactly as it appears on Google.' },
          { name: 'source', label: 'Source', type: 'select', required: true, options: [['Google', 'Google'], ['website', 'Website'], ['in store', 'In store']] },
          { name: 'review_date', label: 'Date shown on Google', placeholder: 'e.g. 3 weeks ago or October 2026' },
          { name: 'link', label: 'Google review link', placeholder: 'https://maps.app.goo.gl/…', full: true, hint: 'Google → your business → Reviews → the review’s ⋮ menu → Share review → Copy link.' },
          { name: 'device', label: 'Device / repair (optional)' }, { name: 'sort', label: 'Display order', type: 'number', hint: 'Lower numbers appear first.' }, { name: 'approved', label: 'Published', type: 'bool' }]}
        defaults={{ rating: 5, approved: 1, source: 'Google', sort: 0 }}
        columns={[{ key: 'name', label: 'Name' }, { key: 'rating', label: 'Rating', render: (r) => '★'.repeat(r.rating) }, { key: 'text', label: 'Review', render: (r) => <span className="line-clamp-2 max-w-md">{r.text}</span> }, { key: 'approved', label: 'Status', render: (r) => (r.approved ? <Badge tone="green">Live</Badge> : <Badge tone="amber">Pending</Badge>) }]} />
    </div>
  );
}

function SettingsCard({ title, description, fields, value, onSave }) {
  const [v, setV] = useState(value);
  return (
    <form className="card p-5 sm:p-6" onSubmit={async (e) => { e.preventDefault(); try { await onSave(v); toast(`${title} saved`); } catch (err) { toast(err.message, true); } }}>
      <h2 className="text-lg font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map((f) => <FieldInput key={f.name} field={f} value={v?.[f.name]} onChange={(x) => setV({ ...v, [f.name]: x })} />)}</div>
      <div className="mt-5 flex justify-end"><button className="btn-primary">Save</button></div>
    </form>
  );
}

function HoursCard({ value, onSave }) {
  const [h, setH] = useState(value?.length ? value : []);
  const enabled = h.length > 0;
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Store hours</h2>
      <p className="mt-1 text-sm text-ink-500">Shown on the website and in LocalBusiness structured data. While empty, the site says “Please call for current store hours” — only publish verified hours.</p>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 rounded" checked={enabled}
        onChange={(e) => setH(e.target.checked ? DAYS.map((day) => ({ day, open: '10:00', close: '18:00', closed: day === 'Sunday' })) : [])} />Publish store hours</label>
      {enabled && (
        <div className="mt-4 divide-y divide-mist-200">
          {h.map((d, i) => (
            <div key={d.day} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className="w-28 text-sm font-semibold">{d.day}</span>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded" checked={d.closed} onChange={(e) => setH(h.map((x, j) => (j === i ? { ...x, closed: e.target.checked } : x)))} />Closed</label>
              {!d.closed && <><input type="time" className="input w-32 py-1.5" value={d.open} aria-label={`${d.day} opens`} onChange={(e) => setH(h.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} /><span className="text-ink-400">to</span>
                <input type="time" className="input w-32 py-1.5" value={d.close} aria-label={`${d.day} closes`} onChange={(e) => setH(h.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} /></>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 flex justify-end"><button className="btn-primary" onClick={async () => { await onSave(h); toast('Hours saved'); }}>Save hours</button></div>
    </div>
  );
}

export function SettingsAdmin() {
  const { data } = useAdminList('/settings');
  if (!data) return <Spinner />;
  const put = (key) => (body) => adminApi(`/settings/${key}`, { method: 'PUT', body });
  return (
    <div className="space-y-6">
      <PageTitle title="Site settings" actions={<a href="/api/admin/backup" className="btn-outline" download>Download backup</a>}>Store information, website content and SEO defaults. Changes appear on the website immediately. Download a backup of all data (bookings, prices, settings) at any time.</PageTitle>
      <SettingsCard title="Store information" value={data.business} onSave={put('business')} description="Used in the header, footer, contact page, emails, Google Maps and structured data."
        fields={[{ name: 'name', label: 'Business name' }, { name: 'legal_name', label: 'Full store name' }, { name: 'street', label: 'Street address' }, { name: 'city', label: 'City' },
          { name: 'region', label: 'Province code' }, { name: 'region_name', label: 'Province' }, { name: 'postal_code', label: 'Postal code', hint: 'Optional — add once confirmed.' }, { name: 'country', label: 'Country code' },
          { name: 'phone_display', label: 'Phone (display)' }, { name: 'phone_tel', label: 'Phone (tel: link)', hint: 'E.164 format, e.g. +19055359503' }, { name: 'email', label: 'Public email (optional)', hint: 'Also receives admin notifications if ADMIN_NOTIFY_EMAIL isn’t set.' },
          { name: 'site_url', label: 'Website URL' }, { name: 'maps_query', label: 'Google Maps search text', full: true },
          { name: 'google_review_url', label: 'Google reviews page link (“Read All Google Reviews”)', full: true },
          { name: 'google_write_review_url', label: '“Leave Us a Google Review” link', full: true, hint: 'Google Business Profile → Ask for reviews → copy the share link (looks like https://g.page/r/…/review). Until set, the reviews page link is used.' }]} />
      <HoursCard value={data.hours} onSave={put('hours')} />
      <SettingsCard title="Website content" value={data.content} onSave={put('content')}
        fields={[{ name: 'announcement', label: 'Announcement bar', full: true, hint: 'Leave empty to hide.' }, { name: 'hero_eyebrow', label: 'Hero label' }, { name: 'hero_title', label: 'Hero headline' },
          { name: 'hero_subtitle', label: 'Hero description', type: 'textarea', full: true }, { name: 'about_title', label: 'About headline', full: true }, { name: 'about_body', label: 'About text', type: 'textarea', full: true },
          { name: 'cta_title', label: 'Final CTA headline', full: true }, { name: 'cta_body', label: 'Final CTA text', type: 'textarea', rows: 2, full: true }]} />
      <SettingsCard title="Warranty" value={data.warranty} onSave={put('warranty')} description="Optional. When filled in, this statement appears on the calculator result and service pages. Only enter terms you offer."
        fields={[{ name: 'text', label: 'Warranty statement', type: 'textarea', rows: 2, full: true, placeholder: 'e.g. Repairs include a X-day warranty on parts and labour.' }]} />
      <SettingsCard title="SEO defaults" value={data.seo} onSave={put('seo')}
        fields={[{ name: 'default_title', label: 'Homepage title', full: true }, { name: 'default_description', label: 'Homepage meta description', type: 'textarea', rows: 2, full: true }, { name: 'og_image', label: 'Default social image', type: 'image' }]} />
    </div>
  );
}

export function EmailLog() {
  const { data } = useAdminList('/email-log');
  return (
    <div>
      <PageTitle title="Email log">Every confirmation and notification email the site attempted to send.</PageTitle>
      {!data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-mist-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-mist-50 text-xs uppercase tracking-wider text-ink-400"><tr><th className="px-4 py-3">Time (UTC)</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-mist-200">{data.map((e) => <tr key={e.id}><td className="px-4 py-3">{e.created_at}</td><td className="px-4 py-3">{e.recipient}</td><td className="px-4 py-3">{e.subject}</td>
              <td className="px-4 py-3"><Badge tone={e.status === 'sent' ? 'green' : e.status === 'failed' ? 'red' : 'amber'}>{e.status}</Badge>{e.error && <span className="mt-1 block text-xs text-ink-400">{e.error}</span>}</td></tr>)}
              {!data.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-400">No emails yet.</td></tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Account() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [em, setEm] = useState({ email: '', current: '' });
  const { data: me, reload } = useAdminList('/me');
  return (
    <div className="max-w-md space-y-6">
      <PageTitle title="Account">Your admin sign-in details.</PageTitle>
      <form className="card space-y-4 p-6" onSubmit={async (e) => {
        e.preventDefault();
        try { const r = await adminApi('/email', { method: 'POST', body: em }); toast('Sign-in email changed to ' + r.email); setEm({ email: '', current: '' }); reload(); } catch (err) { toast(err.message, true); }
      }}>
        <h2 className="text-lg font-bold">Sign-in email</h2>
        <p className="text-sm text-ink-500">Currently: <strong className="text-ink">{me?.email || '…'}</strong></p>
        <div><label className="label" htmlFor="em-new">New sign-in email</label><input id="em-new" type="email" autoComplete="username" className="input" value={em.email} onChange={(e) => setEm({ ...em, email: e.target.value })} required /></div>
        <div><label className="label" htmlFor="em-pw">Current password</label><input id="em-pw" type="password" autoComplete="current-password" className="input" value={em.current} onChange={(e) => setEm({ ...em, current: e.target.value })} required /></div>
        <button className="btn-outline">Change sign-in email</button>
      </form>
      <h2 className="sr-only">Password</h2>
      <form className="card space-y-4 p-6" onSubmit={async (e) => {
        e.preventDefault();
        if (f.next !== f.confirm) return toast('New passwords do not match', true);
        try { await adminApi('/password', { method: 'POST', body: f }); toast('Password updated'); setF({ current: '', next: '', confirm: '' }); } catch (err) { toast(err.message, true); }
      }}>
        {[['current', 'Current password', 'current-password'], ['next', 'New password (min. 10 characters)', 'new-password'], ['confirm', 'Confirm new password', 'new-password']].map(([k, l, ac]) => (
          <div key={k}><label className="label" htmlFor={'pw-' + k}>{l}</label><input id={'pw-' + k} type="password" autoComplete={ac} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>
        ))}
        <button className="btn-primary">Update password</button>
      </form>
    </div>
  );
}
