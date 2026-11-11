import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CalendarClock, HandCoins, Inbox, Tags, Layers, Wrench, ShoppingBag, HelpCircle, Star, Settings, Mail, KeyRound, LogOut, Menu, X, ExternalLink, Bell, AlertTriangle } from 'lucide-react';
import { api, adminApi } from '../lib/api.js';
import { cx, fmtTime, money } from '../lib/utils.js';
import Logo from '../components/Logo.jsx';
import Spinner from '../components/Spinner.jsx';
import { ToastHost, PageTitle, Badge, STATUS_TONE, useAdminList } from './kit.jsx';
import { Bookings, Schedule, TradeIns, Inquiries } from './Requests.jsx';
import { Pricing, Catalogue, TradeInValues } from './CatalogAdmin.jsx';
import { ServicesAdmin, ProductsAdmin, FaqsAdmin, ReviewsAdmin, SettingsAdmin, EmailLog, Account } from './ContentAdmin.jsx';

const NAV = [
  ['Dashboard', '', LayoutDashboard], ['Bookings', 'bookings', CalendarDays], ['Schedule', 'schedule', CalendarClock], ['Trade-ins', 'tradeins', HandCoins],
  ['Inquiries', 'inquiries', Inbox], null, ['Repair prices', 'pricing', Tags], ['Devices & repairs', 'catalogue', Layers], ['Trade-in values', 'tradein-values', HandCoins],
  ['Services', 'services', Wrench], ['Products', 'products', ShoppingBag], ['FAQs', 'faqs', HelpCircle], ['Reviews', 'reviews', Star], null,
  ['Site settings', 'settings', Settings], ['Email log', 'email-log', Mail], ['Account', 'account', KeyRound]
];

function Login({ onLogin }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [s, setS] = useState({ busy: false, error: '' });
  useEffect(() => { document.title = 'Admin sign in | All Uplinks'; }, []);
  return (
    <div className="grid min-h-screen place-items-center bg-mist-100 p-4">
      <form className="card w-full max-w-sm p-8" onSubmit={async (e) => {
        e.preventDefault(); setS({ busy: true, error: '' });
        try { await api('/admin/login', { method: 'POST', body: f }); onLogin(); } catch (err) { setS({ busy: false, error: err.message }); }
      }}>
        <Logo />
        <h1 className="mt-8 text-xl font-bold">Admin sign in</h1>
        <label htmlFor="ad-email" className="label mt-6">Email</label>
        <input id="ad-email" type="email" autoComplete="username" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <label htmlFor="ad-pass" className="label mt-4">Password</label>
        <input id="ad-pass" type="password" autoComplete="current-password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        {s.error && <p className="field-error" role="alert">{s.error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={s.busy}>{s.busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="mt-4 block text-center text-sm text-ink-500 hover:text-brand-700">← Back to website</Link>
      </form>
    </div>
  );
}

function Dashboard() {
  const { data, reload } = useAdminList('/stats');
  if (!data) return <Spinner />;
  const cards = [['Bookings today', data.bookings_today, 'bookings'], ['Upcoming bookings', data.bookings_upcoming, 'bookings'], ['Awaiting confirmation', data.bookings_pending, 'bookings'],
    ['New trade-ins', data.tradeins_new, 'tradeins'], ['New inquiries', data.inquiries_new, 'inquiries'], ['Reviews to approve', data.reviews_pending, 'reviews']];
  return (
    <div>
      <PageTitle title="Dashboard">Overview for {new Date(data.today + 'T12:00:00Z').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}</PageTitle>
      {!data.smtp && <div className="mb-6 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" /><p><strong>Email is not configured.</strong> Bookings and requests are saved and appear here, but confirmation emails won’t be sent until BREVO_API_KEY and MAIL_FROM are set on the server (see README). Every attempt is recorded in the <Link to="/admin/email-log" className="font-semibold underline">email log</Link>.</p></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([l, n, to]) => <Link key={l} to={`/admin/${to}`} className="card card-hover p-5"><p className="text-sm text-ink-500">{l}</p><p className="mt-1 font-display text-3xl font-extrabold">{n}</p></Link>)}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-bold">Upcoming appointments</h2>
          <ul className="mt-4 divide-y divide-mist-200">
            {data.upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div><p className="font-semibold">{b.name} · {b.brand} {b.model}</p><p className="text-ink-500">{b.date} at {fmtTime(b.time)} · {b.ref}{b.est_low != null ? ` · ${money(b.est_low)}–${money(b.est_high)}` : ''}</p></div>
                <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
              </li>
            ))}
            {!data.upcoming.length && <li className="py-6 text-center text-sm text-ink-400">No upcoming appointments.</li>}
          </ul>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><Bell className="h-4 w-4" aria-hidden="true" />Notifications {data.unread > 0 && <Badge tone="blue">{data.unread} new</Badge>}</h2>
            {data.unread > 0 && <button className="btn-ghost btn-sm" onClick={() => adminApi('/notifications/read', { method: 'POST' }).then(reload)}>Mark all read</button>}</div>
          <ul className="mt-4 space-y-3">
            {data.notifications.map((n) => (
              <li key={n.id}><Link to={n.link || '/admin'} className={cx('block rounded-xl p-3 text-sm ring-1 transition hover:ring-brand-200', n.read ? 'ring-mist-200' : 'bg-brand-50/50 ring-brand-100')}>
                <p className="font-semibold">{n.title}</p><p className="mt-0.5 line-clamp-2 text-ink-500">{n.body}</p><p className="mt-1 text-xs text-ink-400">{n.created_at} UTC</p></Link></li>
            ))}
            {!data.notifications.length && <li className="py-6 text-center text-sm text-ink-400">No notifications yet.</li>}
          </ul>
        </div>
      </div>
      <p className="mt-8 text-sm text-ink-400">Catalogue: {data.models} device models · {data.price_points} repair prices · {data.products} products</p>
      <p className="mt-1 text-sm text-ink-400">System: database <strong>{data.database}</strong> · photo storage <strong>{data.storage}</strong> · email <strong>{data.email}</strong></p>
    </div>
  );
}

export default function AdminApp() {
  const [me, setMe] = useState(undefined);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const check = () => api('/admin/session').then((r) => setMe(r.user)).catch(() => setMe(null));
  useEffect(() => { check(); }, []);
  useEffect(() => {
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.appendChild(robots);
    document.title = 'Admin | All Uplinks';
    return () => robots.remove();
  }, []);
  if (me === undefined) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  if (!me) return <Login onLogin={check} />;
  const logout = async () => { await api('/admin/logout', { method: 'POST' }); setMe(null); nav('/admin'); };
  const side = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {NAV.map((n, i) => n ? (
        <NavLink key={n[1]} to={`/admin${n[1] ? '/' + n[1] : ''}`} end onClick={() => setOpen(false)}
          className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-mist-100')}>
          {(() => { const I = n[2]; return <I className="h-4 w-4" aria-hidden="true" />; })()}{n[0]}
        </NavLink>
      ) : <hr key={'sep' + i} className="my-2 border-mist-200" />)}
    </nav>
  );
  return (
    <div className="min-h-screen bg-mist-50">
      <ToastHost />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-mist-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button className="btn-ghost px-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <Link to="/admin"><Logo /></Link><span className="hidden rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white sm:inline">Admin</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href="/" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm hidden sm:inline-flex"><ExternalLink className="h-3.5 w-3.5" />View site</a>
          <span className="hidden text-ink-500 md:inline">{me.email}</span>
          <button className="btn-outline btn-sm" onClick={logout}><LogOut className="h-3.5 w-3.5" />Sign out</button>
        </div>
      </header>
      <div className="flex">
        <aside className={cx('fixed inset-y-16 left-0 z-20 w-64 overflow-y-auto border-r border-mist-200 bg-white transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>{side}</aside>
        <main className="min-w-0 flex-1 p-4 sm:p-8">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="tradeins" element={<TradeIns />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="tradein-values" element={<TradeInValues />} />
            <Route path="services" element={<ServicesAdmin />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="faqs" element={<FaqsAdmin />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
            <Route path="email-log" element={<EmailLog />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<p>Not found. <Link to="/admin" className="text-brand-700">Dashboard</Link></p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
