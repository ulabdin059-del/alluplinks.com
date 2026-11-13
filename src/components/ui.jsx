import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Clock, MapPin, Phone, Navigation, ShieldCheck, Mail } from 'lucide-react';
import { cx, imgSrc, imgSet, telHref, mapsDirections, mapsEmbed, mapsSearch } from '../lib/utils.js';
import { useSite } from '../lib/site.jsx';
import { DAYS } from '../../shared/constants.js';

export function Img({ k, alt, className, sizes = '(min-width: 1024px) 50vw, 100vw', priority = false, ...rest }) {
  return (
    <img src={imgSrc(k)} srcSet={imgSet(k)} sizes={imgSet(k) ? sizes : undefined} alt={alt || ''}
      loading={priority ? 'eager' : 'lazy'} decoding="async" fetchpriority={priority ? 'high' : undefined}
      className={cx('object-cover', className)} {...rest} />
  );
}

export function SectionHeading({ eyebrow, title, children, center = false, className }) {
  return (
    <div className={cx('reveal max-w-2xl', center && 'mx-auto text-center', className)}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="h-section mt-4">{title}</h2>
      {children && <p className="lead mt-4">{children}</p>}
    </div>
  );
}

export function PageHero({ eyebrow, title, children, image, imageAlt, crumbs = [], actions }) {
  return (
    <section className="relative overflow-hidden border-b border-mist-200 bg-gradient-to-b from-brand-50/70 to-white">
      <div className="bg-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="container-x relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_.85fr] lg:py-20">
        <div>
          {crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-5 text-sm text-ink-500">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link to="/" className="hover:text-brand-700">Home</Link></li>
                {crumbs.map(([label, to]) => (
                  <li key={label} className="flex items-center gap-1.5"><span aria-hidden="true">/</span>
                    {to ? <Link to={to} className="hover:text-brand-700">{label}</Link> : <span className="text-ink-700" aria-current="page">{label}</span>}</li>
                ))}
              </ol>
            </nav>
          )}
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] sm:text-5xl">{title}</h1>
          {children && <div className="lead mt-5 max-w-xl">{children}</div>}
          {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {image && (
          <div className="relative hidden lg:block">
            <div className="overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200">
              <Img k={image} alt={imageAlt} priority className="aspect-[4/3] w-full" sizes="40vw" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <div className="divide-y divide-mist-200 rounded-2xl bg-white ring-1 ring-mist-200">
      {items.map((it, i) => (
        <div key={i}>
          <h3>
            <button type="button" aria-expanded={open === i} aria-controls={`${id}-${i}`} onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-ink transition hover:text-brand-700 sm:px-6">
              {it.q}
              <ChevronDown className={cx('h-5 w-5 shrink-0 text-ink-400 transition-transform duration-300', open === i && 'rotate-180 text-brand-600')} aria-hidden="true" />
            </button>
          </h3>
          <div id={`${id}-${i}`} role="region" hidden={open !== i} className="px-5 pb-5 text-[15px] leading-relaxed text-ink-500 sm:px-6">{it.a}</div>
        </div>
      ))}
    </div>
  );
}

export function Hours({ compact = false }) {
  const { hours, business } = useSite();
  if (!hours?.length) {
    return (
      <p className={cx('text-ink-500', compact ? 'text-sm' : 'text-[15px]')}>
        Please call <a href={telHref(business)} className="font-semibold text-brand-700 hover:underline">{business.phone_display}</a> for current store hours.
      </p>
    );
  }
  const today = DAYS[(new Date().getDay() + 6) % 7];
  return (
    <dl className={cx('grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5', compact ? 'text-sm' : 'text-[15px]')}>
      {hours.map((h) => (
        <div key={h.day} className={cx('contents', h.day === today && 'font-semibold text-ink')}>
          <dt className={h.day === today ? 'text-ink' : 'text-ink-500'}>{h.day}</dt>
          <dd className={h.day === today ? 'text-ink' : 'text-ink-600'}>{h.closed ? 'Closed' : `${fmt(h.open)} – ${fmt(h.close)}`}</dd>
        </div>
      ))}
    </dl>
  );
}
const fmt = (hm) => { const [h, m] = hm.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'a.m.' : 'p.m.'}`; };

export function LocationCard({ withMap = true }) {
  const { business: b } = useSite();
  return (
    <div className="grid overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-mist-200 lg:grid-cols-[1fr_1.2fr]">
      <div className="p-6 sm:p-8 lg:p-10">
        <h3 className="text-2xl font-bold">{b.legal_name}</h3>
        <ul className="mt-6 space-y-5 text-[15px]">
          <li className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <a href={mapsSearch(b)} target="_blank" rel="noopener noreferrer" className="text-ink-600 hover:text-brand-700">{b.street}<br />{b.city}, {b.region_name}{b.postal_code ? ' ' + b.postal_code : ''}, Canada</a></li>
          <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <a href={telHref(b)} className="font-semibold text-ink hover:text-brand-700">{b.phone_display}</a></li>
          {b.email && <li className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <a href={`mailto:${b.email}`} className="break-all text-ink-600 hover:text-brand-700">{b.email}</a></li>}
          <li className="flex gap-3"><Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" /><div className="flex-1"><Hours compact /></div></li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={mapsDirections(b)} target="_blank" rel="noopener noreferrer" className="btn-primary"><Navigation className="h-4 w-4" aria-hidden="true" />Get directions</a>
          <a href={telHref(b)} className="btn-outline"><Phone className="h-4 w-4" aria-hidden="true" />Call {b.phone_display}</a>
        </div>
      </div>
      {withMap && (
        <div className="relative min-h-[320px] bg-mist-100">
          <a href={mapsSearch(b)} target="_blank" rel="noopener noreferrer" className="bg-grid absolute inset-0 grid place-items-center text-center" tabIndex={-1} aria-hidden="true">
            <span><MapPin className="mx-auto h-10 w-10 text-brand-600" /><span className="mt-2 block font-semibold text-ink">{b.street}, {b.city}</span><span className="text-sm text-brand-700">Open in Google Maps</span></span>
          </a>
          <iframe title={`Map showing ${b.legal_name} at ${b.street}, ${b.city}`} src={mapsEmbed(b)} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0" allowFullScreen />
        </div>
      )}
    </div>
  );
}

export function WarrantyNote({ className }) {
  const { warranty } = useSite();
  if (!warranty?.text) return null;
  return <p className={cx('flex items-start gap-2 text-sm text-ink-600', className)}><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{warranty.text}</p>;
}

export function Field({ label, error, hint, children, id, required }) {
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}{required && <span className="text-red-500" aria-hidden="true"> *</span>}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>}
      {error && <p className="field-error" id={id + '-err'} role="alert">{error}</p>}
    </div>
  );
}

export function Stars({ value, size = 'h-4 w-4' }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={cx(size, i <= value ? 'text-amber-400' : 'text-mist-300')} fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}
