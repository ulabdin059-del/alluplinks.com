import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Phone, ChevronDown, CalendarCheck, MapPin, ArrowRight } from 'lucide-react';
import Logo, { MapleLeaf } from './Logo.jsx';
import { useSite } from '../lib/site.jsx';
import { cx, telHref, mapsDirections, imgSrc, storeStatus } from '../lib/utils.js';
import { Hours } from './ui.jsx';
import { SHOP_CATEGORIES } from '../../shared/constants.js';

const NAV = [
  { label: 'Repairs', to: '/services', mega: true },
  { label: 'Prices', to: '/repair-prices' },
  { label: 'Sell / Trade-in', to: '/sell' },
  { label: 'Shop', to: '/shop' },
  { label: 'Contact', to: '/contact' }
];

function Announcement() {
  const { content, hours, business } = useSite();
  const status = storeStatus(hours);
  return (
    <div className="bg-ink text-white">
      <div className="container-x flex items-center justify-between gap-4 py-2 text-[13px] font-medium">
        <p className="flex min-w-0 items-center gap-2">
          <MapleLeaf className="h-3.5 w-3.5 shrink-0 text-brand-400" />
          <span className="truncate">{content?.announcement || 'Model-specific repair prices in CAD — book online.'}</span>
          <Link to="/repair-prices" className="ml-1 hidden shrink-0 items-center gap-1 font-semibold text-brand-300 hover:text-white md:inline-flex">Check your price <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
        </p>
        <div className="hidden shrink-0 items-center gap-5 lg:flex">
          {status && <span className="inline-flex items-center gap-2"><span className={cx('h-2 w-2 rounded-full', status.open ? 'bg-emerald-400' : 'bg-white/40')} aria-hidden="true" />{status.label}</span>}
          <a href={mapsDirections(business)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{business.street}, {business.city}</a>
        </div>
      </div>
    </div>
  );
}

function MegaMenu({ onNavigate }) {
  const { services } = useSite();
  return (
    <div className="grid w-[min(880px,92vw)] grid-cols-[1fr_260px] gap-0 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-mist-200">
      <div className="grid grid-cols-2 gap-1 p-4">
        {services.map((s) => (
          <Link key={s.slug} to={`/services/${s.slug}`} onClick={onNavigate}
            className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-brand-50">
            <img src={imgSrc(s.image, 640)} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-mist-200" loading="lazy" />
            <span className="text-sm font-medium text-ink-700 group-hover:text-brand-700">{s.name}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-col justify-between bg-mist-100 p-6">
        <div>
          <p className="font-display text-lg font-bold">Know your price first</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">Model-specific prices for 120+ device models, with estimated repair times.</p>
        </div>
        <div className="mt-6 space-y-2">
          <Link to="/repair-prices" onClick={onNavigate} className="btn-primary w-full">Open price calculator</Link>
          <Link to="/services" onClick={onNavigate} className="btn-outline w-full">All services</Link>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { business, hours, services } = useSite();
  const mobileStatus = storeStatus(hours);
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  const megaTimer = useRef();
  useEffect(() => { setOpen(false); setMega(false); }, [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; }, [open]);

  return (
    <header className={cx('sticky top-0 z-40 border-b bg-white/90 backdrop-blur-lg transition-shadow', scrolled ? 'border-mist-200 shadow-[0_6px_24px_-16px_rgba(15,29,58,.25)]' : 'border-transparent')}>
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link to="/" aria-label="All Uplinks home"><Logo /></Link>
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => n.mega ? (
            <div key={n.label} className="relative" onMouseEnter={() => { clearTimeout(megaTimer.current); setMega(true); }}
              onMouseLeave={() => { megaTimer.current = setTimeout(() => setMega(false), 120); }}>
              <button type="button" aria-expanded={mega} aria-haspopup="true" onClick={() => setMega((m) => !m)}
                className={cx('inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[15px] font-medium transition hover:bg-mist-100 hover:text-ink', loc.pathname.startsWith('/services') ? 'text-brand-700' : 'text-ink-600')}>
                {n.label}<ChevronDown className={cx('h-4 w-4 transition', mega && 'rotate-180')} aria-hidden="true" />
              </button>
              {mega && <div className="absolute left-1/2 top-full -translate-x-1/3 pt-3 animate-fade-in"><MegaMenu onNavigate={() => setMega(false)} /></div>}
            </div>
          ) : (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('rounded-lg px-3.5 py-2 text-[15px] font-medium transition hover:bg-mist-100 hover:text-ink', isActive ? 'text-brand-700' : 'text-ink-600')}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={telHref(business)} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[15px] font-semibold text-ink hover:text-brand-700 xl:inline-flex">
            <Phone className="h-4 w-4 text-brand-600" aria-hidden="true" />{business.phone_display}
          </a>
          <Link to="/book" className="btn-primary hidden sm:inline-flex"><CalendarCheck className="h-4 w-4" aria-hidden="true" />Book a Repair</Link>
          <a href={telHref(business)} className="btn-outline px-3 sm:hidden" aria-label={`Call ${business.phone_display}`}><Phone className="h-5 w-5" aria-hidden="true" /></a>
          <button type="button" className="btn-ghost px-2.5 lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {/* Rendered into <body>: the header's backdrop blur would otherwise trap a fixed-position panel inside it. */}
      {open && createPortal(
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 overflow-y-auto bg-white animate-fade-in lg:hidden">
          <div className="container-x flex h-[72px] items-center justify-between border-b border-mist-200">
            <Link to="/" aria-label="All Uplinks home" onClick={() => setOpen(false)}><Logo /></Link>
            <button type="button" className="btn-ghost px-2.5" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-6 w-6" /></button>
          </div>
          <nav aria-label="Mobile" className="container-x flex flex-col gap-1 py-6">
            {mobileStatus && <p className="mb-3 inline-flex items-center gap-2 self-start rounded-full bg-mist-100 px-3 py-1.5 text-sm font-semibold text-ink-600"><span className={cx('h-2 w-2 rounded-full', mobileStatus.open ? 'bg-emerald-500' : 'bg-ink-300')} aria-hidden="true" />{mobileStatus.label}</p>}
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('rounded-xl px-4 py-3.5 text-lg font-semibold', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-mist-100')}>{n.label === 'Repairs' ? 'Repair services' : n.label}</NavLink>
            ))}
            <NavLink to="/faq" className="rounded-xl px-4 py-3.5 text-lg font-semibold text-ink hover:bg-mist-100">FAQ</NavLink>
            <p className="mt-5 px-4 text-xs font-semibold uppercase tracking-wider text-ink-400">Popular repairs</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {services.filter((x) => x.featured).slice(0, 6).map((x) => (
                <Link key={x.slug} to={`/services/${x.slug}`} className="flex items-center gap-2.5 rounded-xl p-2 ring-1 ring-mist-200 hover:ring-brand-200">
                  <img src={imgSrc(x.image, 640)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <span className="text-[13px] font-medium leading-tight text-ink-700">{x.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 grid gap-3">
              <Link to="/book" className="btn-primary btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
              <a href={telHref(business)} className="btn-outline btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />Call {business.phone_display}</a>
              <a href={mapsDirections(business)} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-lg"><MapPin className="h-5 w-5" aria-hidden="true" />Directions</a>
            </div>
          </nav>
        </div>,
        document.body
      )}
    </header>
  );
}

function Footer() {
  const { business: b, services } = useSite();
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-mist-200 bg-mist-50">
      <div className="container-x grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-500">Phone, tablet, laptop and console repair in Keswick, Ontario — with model-specific pricing in Canadian dollars.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/book" className="btn-primary btn-sm">Book a repair</Link>
            <a href={telHref(b)} className="btn-outline btn-sm">Call us</a>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">Popular repairs</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.slice(0, 8).map((s) => <li key={s.slug}><Link to={`/services/${s.slug}`} className="text-ink-600 hover:text-brand-700">{s.name}</Link></li>)}
            <li><Link to="/services" className="font-semibold text-brand-700 hover:underline">All services →</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">All Uplinks</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[['Repair price calculator', '/repair-prices'], ['Book a repair', '/book'], ['Sell / Trade-in', '/sell'], ['Shop', '/shop'],
              ...SHOP_CATEGORIES.slice(0, 2).map((c) => [c.name, '/shop/' + c.slug]), ['About us', '/about'], ['Reviews', '/reviews'], ['FAQ', '/faq'], ['Contact', '/contact']]
              .map(([l, to]) => <li key={to}><Link to={to} className="text-ink-600 hover:text-brand-700">{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-400">Visit the store</h2>
          <address className="mt-4 space-y-3 text-sm not-italic text-ink-600">
            <p className="font-semibold text-ink">{b.legal_name}</p>
            <p><a href={mapsDirections(b)} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700">{b.street}<br />{b.city}, {b.region_name}, Canada</a></p>
            <p><a href={telHref(b)} className="text-base font-semibold text-ink hover:text-brand-700">{b.phone_display}</a></p>
            {b.email && <p><a href={`mailto:${b.email}`} className="hover:text-brand-700">{b.email}</a></p>}
          </address>
          <div className="mt-5"><Hours compact /></div>
        </div>
      </div>
      <div className="border-t border-mist-200">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><MapleLeaf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /><span>© {year} All Uplinks · Proudly serving Keswick, Georgina and York Region, Ontario. All prices in Canadian dollars (CAD). Product names and trademarks belong to their respective owners.</span></p>
          <div className="flex gap-5"><Link to="/privacy" className="hover:text-ink">Privacy</Link><Link to="/terms" className="hover:text-ink">Terms</Link><a href="/sitemap.xml" className="hover:text-ink">Sitemap</a></div>
        </div>
      </div>
    </footer>
  );
}

function MobileBar() {
  const { business } = useSite();
  const { pathname } = useLocation();
  if (pathname === '/book') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mist-200 bg-white/95 p-3 backdrop-blur sm:hidden" style={{ paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))' }}>
      <div className="grid grid-cols-2 gap-2">
        <a href={telHref(business)} className="btn-outline"><Phone className="h-4 w-4" aria-hidden="true" />Call now</a>
        <Link to="/book" className="btn-primary"><CalendarCheck className="h-4 w-4" aria-hidden="true" />Book repair</Link>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Announcement />
      <Header />
      <main id="main" className="flex-1 pb-20 sm:pb-0"><Outlet /></main>
      <Footer />
      <MobileBar />
    </div>
  );
}

export { Hours };
