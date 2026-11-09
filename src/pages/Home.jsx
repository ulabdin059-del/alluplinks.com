import { Link } from 'react-router-dom';
import { Phone, CalendarCheck, ArrowRight, BadgeDollarSign, Timer, Wrench, ShieldCheck, MapPin, Smartphone, Cpu, Recycle, ClipboardCheck, PackageCheck, Search, Star } from 'lucide-react';
import { useSite, useCatalog, useSeo } from '../lib/site.jsx';
import { useReveal, useFetch, telHref, money } from '../lib/utils.js';
import { api } from '../lib/api.js';
import { Img, SectionHeading, Accordion, LocationCard } from '../components/ui.jsx';
import PriceCalculator from '../components/PriceCalculator.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import ReviewsSection from '../components/Reviews.jsx';

function Hero() {
  const { business: b, content } = useSite();
  const { catalog } = useCatalog();
  const sample = (() => {
    const m = catalog?.categories.find((c) => c.slug === 'iphone')?.brands[0]?.models.find((x) => x.name === 'iPhone 15');
    return m ? { model: 'iPhone 15', screen: m.prices.screen, battery: m.prices.battery } : null;
  })();
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white">
      <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="container-x relative grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <span className="eyebrow"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{content.hero_eyebrow || 'Keswick, Ontario'}</span>
          <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl lg:text-[4.1rem]">
            {(content.hero_title || 'Professional Phone Repair in Keswick, Ontario').replace(/ in Keswick, Ontario$/, '')}
            {/ in Keswick, Ontario$/.test(content.hero_title || 'Professional Phone Repair in Keswick, Ontario') && <span className="block text-brand-600"> in Keswick, Ontario</span>}
          </h1>
          <p className="lead mt-6 max-w-xl">{content.hero_subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={telHref(b)} className="btn-dark btn-lg"><Phone className="h-5 w-5" aria-hidden="true" />Call Now</a>
            <Link to="/book" className="btn-primary btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
            <a href="#services" className="btn-outline btn-lg">Explore Services<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </div>
          <ul className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm text-ink-600 sm:grid-cols-3">
            {[[BadgeDollarSign, 'Exact prices by model'], [Timer, 'Many repairs under an hour'], [CalendarCheck, 'Book online 24/7']].map(([I, t]) => (
              <li key={t} className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow-card ring-1 ring-mist-200"><I className="h-4 w-4 text-brand-600" aria-hidden="true" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="relative animate-fade-in">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-brand-100/70 to-transparent blur-2xl" aria-hidden="true" />
          <div className="overflow-hidden rounded-[2rem] shadow-lift ring-1 ring-mist-200">
            <Img k="hero-technician" alt="All Uplinks technician repairing an opened smartphone at the bench" priority className="aspect-[4/3.4] w-full" sizes="(min-width:1024px) 45vw, 100vw" />
          </div>
          {sample && (
            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl bg-white/95 p-4 shadow-lift ring-1 ring-mist-200 backdrop-blur sm:left-auto sm:right-[-12px] sm:w-72">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Example · {sample.model}</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div><p className="text-xs text-ink-500">Screen</p><p className="font-display text-xl font-extrabold">{money(sample.screen)}</p></div>
                <div><p className="text-xs text-ink-500">Battery</p><p className="font-display text-xl font-extrabold">{money(sample.battery)}</p></div>
              </div>
              <Link to="/repair-prices" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Find your model <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </div>
          )}
          <div className="absolute -left-4 top-6 hidden rounded-2xl bg-white/95 px-4 py-3 shadow-lift ring-1 ring-mist-200 backdrop-blur sm:flex sm:items-center sm:gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50"><Wrench className="h-5 w-5 text-emerald-600" aria-hidden="true" /></span>
            <span><span className="block text-sm font-bold">Phones · Tablets · Laptops</span><span className="block text-xs text-ink-500">and game consoles</span></span>
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
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.length ? featured.map((s) => <ServiceCard key={s.slug} s={s} catalog={catalog} />)
            : Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 animate-pulse bg-mist-100" />)}
        </div>
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
    <section className="section bg-ink text-white">
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-200 ring-1 ring-inset ring-white/15">How it works</span>
          <h2 className="h-section mt-4 text-white">How our repair process works</h2>
          <p className="mt-4 text-base leading-relaxed text-white/70 sm:text-lg">Four simple steps from cracked to fixed.</p>
        </div>
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([I, t, d], i) => (
            <li key={t} className="reveal relative rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.07]">
              <span className="font-display text-5xl font-extrabold text-white/10">0{i + 1}</span>
              <span className="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-brand-500/20 ring-1 ring-brand-400/30"><I className="h-5 w-5 text-brand-300" aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-bold text-white">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{d}</p>
            </li>
          ))}
        </ol>
        <div className="reveal mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/book" className="btn btn-lg bg-white text-ink hover:bg-brand-50"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a Repair</Link>
          <Link to="/repair-prices" className="btn btn-lg text-white ring-1 ring-inset ring-white/25 hover:bg-white/10">Check prices</Link>
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
      <PopularServices />
      <CalculatorSection />
      <WhyUs />
      <Process />
      <section className="section">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading eyebrow={<><Star className="h-3.5 w-3.5" aria-hidden="true" />Customer reviews</>} title="What our customers say" />
            <Link to="/reviews" className="btn-outline reveal shrink-0">All reviews<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="mt-10"><ReviewsSection limit={3} /></div>
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
