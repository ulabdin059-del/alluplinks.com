import { Link } from 'react-router-dom';
import { Phone, CalendarCheck, ArrowRight, BadgeDollarSign, Timer, Wrench, ShieldCheck, MapPin, Smartphone, Cpu, Recycle, ClipboardCheck, PackageCheck, Search, Star } from 'lucide-react';
import { useSite, useCatalog, useSeo } from '../lib/site.jsx';
import { useReveal, useFetch, telHref, money, storeStatus, cx } from '../lib/utils.js';
import { googleRating, RATING_CLASS, STAR_PATH, G_PATHS } from '../../shared/rating.js';
import { api } from '../lib/api.js';
import { Img, SectionHeading, Accordion, LocationCard } from '../components/ui.jsx';
import PriceCalculator from '../components/PriceCalculator.jsx';
import { DevicesGrid, PopularPrices } from '../components/HomeSections.jsx';
import { MapleLeaf } from '../components/Logo.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import ReviewsSection from '../components/Reviews.jsx';

// Splits "Headline — highlighted part" so the part after the dash renders on its own line in red.
function heroLines(title) {
  const t = title || 'Phone repair in Keswick — fixed fast, priced upfront.';
  const i = t.indexOf(' — ');
  return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ''];
}

function Hero() {
  const { business: b, content, hours } = useSite();
  const status = storeStatus(hours);
  const { catalog } = useCatalog();
  const [lead, accent] = heroLines(content.hero_title);
  const rating = googleRating(b);
  const sample = (() => {
    const m = catalog?.categories.find((c) => c.slug === 'iphone')?.brands[0]?.models.find((x) => x.name === 'iPhone 15');
    return m ? { model: 'iPhone 15', screen: m.prices.screen, battery: m.prices.battery } : null;
  })();
  // No entrance animation here: the server already paints this hero, so it must not fade out and back in.
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white">
      <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="container-x relative grid items-center gap-8 pb-12 pt-8 sm:gap-10 sm:pb-16 sm:pt-12 lg:grid-cols-[1.2fr_.8fr] lg:gap-14 lg:pb-24 lg:pt-16">
        <div>
          <p className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-600 shadow-sm ring-1 ring-mist-200">
            <span className="inline-flex items-center gap-1.5 text-brand-700"><MapleLeaf className="h-3.5 w-3.5" />{content.hero_eyebrow || 'Keswick, Ontario'}</span>
            {status && <><span className="text-mist-300" aria-hidden="true">|</span><span className="inline-flex items-center gap-1.5"><span className={status.open ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-ink-300'} aria-hidden="true" />{status.label}</span></>}
          </p>
          <h1 className="mt-5 text-balance text-[2.3rem] font-extrabold leading-[1.06] tracking-tight min-[380px]:text-[2.55rem] sm:text-[3.25rem] lg:text-[3.45rem] xl:text-[3.9rem]">
            {lead}{accent && <span className="mt-1 block text-brand-600">{accent}</span>}
          </h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-500 sm:text-lg">{content.hero_subtitle}</p>
          {rating && (
            <a href={rating.url || undefined} target="_blank" rel="noopener noreferrer" className={cx(RATING_CLASS, 'transition hover:ring-brand-200')} data-testid="hero-rating"
              aria-label={`Rated ${rating.value} out of 5 on Google, ${rating.count}`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">{G_PATHS.map(([f, d]) => <path key={f} fill={f} d={d} />)}</svg>
              <span className="font-bold text-ink">{rating.value}</span>
              <span className="inline-flex gap-0.5" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <svg key={i} viewBox="0 0 20 20" className={i <= rating.stars ? 'h-4 w-4 text-amber-400' : 'h-4 w-4 text-mist-300'} fill="currentColor"><path d={STAR_PATH} /></svg>)}</span>
              <span className="text-ink-500">{rating.count}</span>
            </a>
          )}
          <div className="mt-7 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <Link to="/book" className="btn-primary btn-lg px-4 sm:px-7"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
            <a href={telHref(b)} className="btn-dark btn-lg px-4 sm:px-7"><Phone className="h-5 w-5" aria-hidden="true" />Call Now</a>
          </div>
          <Link to="/repair-prices" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">Or see your exact price in 30 seconds<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          <ul className="mt-7 flex flex-col gap-2 text-sm font-medium text-ink-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {[[BadgeDollarSign, 'Exact prices by model'], [Timer, 'Most repairs under an hour'], [CalendarCheck, 'Book online 24/7']].map(([I, t]) => (
              <li key={t} className="inline-flex items-center gap-1.5"><I className="h-4 w-4 text-brand-600" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 -z-10 hidden rounded-[2.5rem] bg-gradient-to-tr from-brand-100/70 to-transparent blur-2xl lg:block" aria-hidden="true" />
          <div className="overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200 lg:rounded-[2rem]">
            <Img k="hero-technician" alt="All Uplinks technician repairing an opened smartphone at the bench" priority className="aspect-[16/10] w-full lg:aspect-[4/4.4]" sizes="(min-width:1024px) 38vw, 100vw" />
          </div>
          <div className="absolute bottom-3 left-3 w-60 rounded-2xl bg-white/95 p-3.5 shadow-lift ring-1 ring-mist-200 backdrop-blur sm:bottom-4 sm:left-4 sm:w-64 lg:-bottom-6 lg:-left-8 lg:w-72 lg:p-4" aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Example · iPhone 15</p>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              <div><p className="text-xs text-ink-500">Screen</p><p className="font-display text-lg font-extrabold sm:text-xl">{sample ? money(sample.screen) : <span className="inline-block h-6 w-14 animate-pulse rounded bg-mist-200 align-middle" />}</p></div>
              <div><p className="text-xs text-ink-500">Battery</p><p className="font-display text-lg font-extrabold sm:text-xl">{sample ? money(sample.battery) : <span className="inline-block h-6 w-14 animate-pulse rounded bg-mist-200 align-middle" />}</p></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandStrip() {
  return (
    <section aria-label="Brands we repair" className="border-y border-mist-200 bg-mist-50">
      <div className="container-x flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm font-semibold uppercase tracking-[0.18em] text-ink-400">
        <span className="normal-case tracking-normal text-ink-500">We repair</span>
        {['Apple', 'Samsung', 'Google Pixel', 'PlayStation', 'Xbox', 'Nintendo', 'Dell', 'HP', 'Lenovo'].map((b) => <span key={b}>{b}</span>)}
      </div>
    </section>
  );
}

function PopularServices() {
  const { data } = useFetch(() => api('/services'), []);
  const { catalog } = useCatalog();
  const featured = (data || []).filter((s) => s.featured).slice(0, 8);
  return (
    <section id="services" className="section scroll-mt-20">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="Popular repairs" title="The repairs Keswick brings us most">Clear, model-specific pricing on every common repair — tap a service for full details and prices.</SectionHeading>
          <Link to="/services" className="btn-outline reveal shrink-0">All 18 services<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {/* Swipeable row on phones, grid from tablet up */}
        <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {featured.length ? featured.map((s) => <div key={s.slug} className="flex w-[78%] shrink-0 snap-start sm:w-auto"><ServiceCard s={s} catalog={catalog} /></div>)
            : Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 w-[78%] shrink-0 animate-pulse bg-mist-100 sm:w-auto" />)}
        </div>
        <p className="mt-2 text-center text-xs text-ink-400 sm:hidden">Swipe to see more repairs →</p>
      </div>
    </section>
  );
}

function CalculatorSection() {
  return (
    <section id="price-calculator" className="section scroll-mt-20 bg-mist-100/70">
      <div className="container-x">
        <SectionHeading eyebrow="Repair price calculator" title="See your exact price in four taps" center>Choose your device, model and repair. Your price in CAD and estimated repair time appear instantly — then book in one click.</SectionHeading>
        <div className="reveal mx-auto mt-12 max-w-6xl"><PriceCalculator headingLevel="h3" /></div>
      </div>
    </section>
  );
}

function WhyUs() {
  const items = [
    [BadgeDollarSign, 'Upfront, model-specific pricing', 'Every listed price is for your exact model and repair. No vague “starting from” guesswork — and the price is confirmed with you before work begins.'],
    [Timer, 'Most repairs in one visit', 'Screen, battery and charging port repairs typically take under an hour, so you can wait or grab a coffee nearby.'],
    [Cpu, 'Board-level capability', 'Micro soldering, motherboard and water damage diagnostics mean we can tackle faults beyond simple part swaps.'],
    [ShieldCheck, 'Your data stays private', 'Common repairs don’t require a reset. Your device stays on our bench, not in a mail-in queue.'],
    [Smartphone, 'Phones, tablets, laptops & consoles', 'iPhone, Samsung, Pixel, iPad, Windows laptops, MacBook, PlayStation, Xbox and Switch — all under one roof.'],
    [Recycle, 'Trade-in and accessories', 'Get an instant estimate for your old phone and pick up cases, screen protectors and chargers while you’re here.']
  ];
  return (
    <section className="section">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
        <div className="reveal relative">
          <div className="overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-mist-200"><Img k="svc-micro-soldering" alt="Close-up of a technician soldering a circuit board" className="aspect-[4/5] w-full" sizes="(min-width:1024px) 40vw, 100vw" /></div>
          <div className="absolute -bottom-6 -right-2 w-56 overflow-hidden rounded-2xl shadow-lift ring-4 ring-white sm:-right-6 sm:w-64"><Img k="tools-bench" alt="Precision repair tools organised on a workbench" className="aspect-[4/3] w-full" sizes="260px" /></div>
        </div>
        <div>
          <SectionHeading eyebrow="Why choose All Uplinks?" title="Repairs done properly, explained clearly">We built All Uplinks around the things people tell us they want from a repair shop: honest prices, quick turnarounds and someone who explains what’s wrong.</SectionHeading>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {items.map(([I, t, d]) => (
              <div key={t} className="reveal">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 ring-1 ring-brand-100"><I className="h-5 w-5 text-brand-600" aria-hidden="true" /></span>
                <h3 className="mt-4 text-base font-bold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Process() {
  const steps = [
    [Search, 'Check your price', 'Use the calculator to see your model-specific price and estimated repair time.'],
    [CalendarCheck, 'Book a time', 'Choose a date and time that suits you. You’ll get a booking reference straight away.'],
    [ClipboardCheck, 'Inspection & confirmation', 'We check your device with you and confirm the final price before any work begins.'],
    [PackageCheck, 'Repair & test', 'Your device is repaired, tested function by function, and handed back ready to go.']
  ];
  return (
    <section className="section relative overflow-hidden bg-gradient-to-b from-brand-50/60 via-white to-white">
      <MapleLeaf className="pointer-events-none absolute -right-24 -top-16 h-[420px] w-[420px] text-brand-100/60" />
      <div className="container-x relative">
        <SectionHeading eyebrow="How it works" title="How our repair process works" center>Four simple steps from cracked to fixed.</SectionHeading>
        <ol className="relative mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <span className="absolute left-[12%] right-[12%] top-[52px] hidden h-px border-t-2 border-dashed border-brand-200 lg:block" aria-hidden="true" />
          {steps.map(([I, t, d], i) => (
            <li key={t} className="reveal card relative p-6 text-center">
              <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lift ring-8 ring-white"><I className="h-6 w-6" aria-hidden="true" /></span>
              <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-brand-600">Step {i + 1}</span>
              <h3 className="mt-1 text-lg font-bold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{d}</p>
            </li>
          ))}
        </ol>
        <div className="reveal mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/book" className="btn-primary btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
          <Link to="/repair-prices" className="btn-outline btn-lg">Check prices</Link>
        </div>
      </div>
    </section>
  );
}

function SellShop() {
  return (
    <section className="section bg-mist-100/70">
      <div className="container-x grid gap-6 lg:grid-cols-2">
        {[
          { k: 'tradein-iphones', alt: 'Three iPhone 12 Pro handsets fanned out', eyebrow: 'Sell / Trade-in', t: 'Get an instant estimate for your old phone', d: 'iPhone, Samsung Galaxy, Pixel and tablets — even cracked or broken. Final offer after a quick in-store inspection.', to: '/sell', cta: 'Get my estimate' },
          { k: 'shop-hero', alt: 'Several smartphones on a light blue surface', eyebrow: 'Shop', t: 'Phones, cases, chargers & more', d: 'New and pre-owned smartphones plus the accessories that keep them protected and powered.', to: '/shop', cta: 'Browse the shop' }
        ].map((c) => (
          <Link key={c.to} to={c.to} className="reveal group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl p-8 shadow-card ring-1 ring-mist-200">
            <Img k={c.k} alt={c.alt} className="absolute inset-0 -z-10 h-full w-full transition duration-700 group-hover:scale-[1.04]" sizes="(min-width:1024px) 50vw, 100vw" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent" aria-hidden="true" />
            <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-inset ring-white/25 backdrop-blur">{c.eyebrow}</span>
            <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">{c.t}</h2>
            <p className="mt-2 max-w-md text-[15px] text-white/80">{c.d}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-white">{c.cta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const site = useSite();
  const ref = useReveal();
  useSeo('Phone Repair Keswick, ON | iPhone & Samsung Repair | All Uplinks',
    'Phone repair in Keswick, Ontario. iPhone, Samsung and Pixel screen, battery, charging port and back glass repair with model-specific prices in CAD. Book online at All Uplinks.', '/');
  return (
    <div ref={ref}>
      <Hero />
      <BrandStrip />
      <DevicesGrid />
      <PopularServices />
      <PopularPrices />
      <CalculatorSection />
      <WhyUs />
      <Process />
      <section className="section">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow={<><Star className="h-3.5 w-3.5" aria-hidden="true" />Customer reviews</>} title="What our customers say" />
            <Link to="/reviews" className="btn-outline reveal shrink-0">All reviews<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-10"><ReviewsSection limit={6} /></div>
        </div>
      </section>
      <SellShop />
      <section className="section" id="location">
        <div className="container-x">
          <SectionHeading eyebrow="Visit us" title="Find us on The Queensway South">Serving Keswick, Georgina, Sutton, Pefferlaw, Queensville and the surrounding York Region communities.</SectionHeading>
          <div className="reveal mt-10"><LocationCard /></div>
        </div>
      </section>
      <section className="section bg-mist-100/70">
        <div className="container-x grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions">Can’t find what you’re looking for? Call us at <a href={telHref(site.business)} className="font-semibold text-brand-700">{site.business.phone_display}</a>.</SectionHeading>
          <div className="reveal"><Accordion items={site.faqs.map((f) => ({ q: f.question, a: f.answer }))} /></div>
        </div>
      </section>
      <FinalCta />
    </div>
  );
}

export function FinalCta() {
  const { business: b, content } = useSite();
  return (
    <section className="py-16 sm:py-20">
      <div className="container-x">
        <div className="reveal relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-700 px-6 py-14 text-center shadow-lift sm:px-12">
          <div className="bg-grid absolute inset-0 opacity-20 [filter:invert(1)]" aria-hidden="true" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">{content.cta_title || 'Ready to get your device working again?'}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">{content.cta_body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/book" className="btn btn-lg bg-white text-brand-700 shadow-sm hover:bg-brand-50"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
              <a href={telHref(b)} className="btn btn-lg text-white ring-1 ring-inset ring-white/40 hover:bg-white/10"><Phone className="h-5 w-5" aria-hidden="true" />Call {b.phone_display}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
