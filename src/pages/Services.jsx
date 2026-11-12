import { Link } from 'react-router-dom';
import { CalendarCheck, Calculator } from 'lucide-react';
import { useCatalog, useSeo } from '../lib/site.jsx';
import { useFetch, useReveal } from '../lib/utils.js';
import { api } from '../lib/api.js';
import { PageHero } from '../components/ui.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { FinalCta } from './Home.jsx';

const GROUPS = [
  ['Phone repairs', ['iphone-screen-replacement', 'iphone-battery-replacement', 'samsung-screen-replacement', 'samsung-battery-replacement', 'charging-port-repair', 'back-glass-replacement', 'camera-repair', 'speaker-microphone-repair']],
  ['Advanced & board-level', ['water-damage-repair', 'motherboard-repair', 'micro-soldering', 'data-recovery', 'software-troubleshooting']],
  ['Tablets, computers & consoles', ['ipad-repair', 'tablet-repair', 'laptop-repair', 'macbook-repair', 'gaming-console-repair']]
];

export default function Services() {
  useSeo('Phone, Tablet & Laptop Repair Services in Keswick, ON | All Uplinks',
    'All repair services at All Uplinks in Keswick, Ontario: iPhone and Samsung screens and batteries, charging ports, back glass, water damage, micro soldering, data recovery, iPad, laptop, MacBook and console repair.', '/services');
  const { data } = useFetch(() => api('/services'), []);
  const { catalog } = useCatalog();
  const ref = useReveal();
  const all = data || [];
  const grouped = GROUPS.map(([t, slugs]) => [t, all.filter((s) => slugs.includes(s.slug))]);
  const extra = all.filter((s) => !GROUPS.some(([, sl]) => sl.includes(s.slug)));
  if (extra.length) grouped.push(['More services', extra]);
  return (
    <div ref={ref}>
      <PageHero eyebrow="Repair services" title="Every repair, clearly priced" image="tools-bench" imageAlt="Precision repair tools on a technician's bench" crumbs={[['Services']]}
        actions={<><Link to="/repair-prices" className="btn-primary btn-lg"><Calculator className="h-5 w-5" aria-hidden="true" />Check your price</Link><Link to="/book" className="btn-outline btn-lg"><CalendarCheck className="h-5 w-5" aria-hidden="true" />Book a repair</Link></>}>
        From a cracked iPhone screen to a PS5 HDMI port, here’s everything we repair at our Keswick store. Tap any service for details, model-by-model prices and estimated repair times.
      </PageHero>
      <nav aria-label="Service categories" className="sticky top-[72px] z-20 border-b border-mist-200 bg-white/90 backdrop-blur">
        <div className="container-x flex gap-2 overflow-x-auto py-3 no-scrollbar">
          {grouped.filter(([, l]) => l.length).map(([title]) => (
            <a key={title} href={`#${title.replace(/[^a-z]+/gi, '-').toLowerCase()}`} className="shrink-0 rounded-full bg-mist-100 px-4 py-2 text-sm font-semibold text-ink-600 transition hover:bg-brand-50 hover:text-brand-700">{title}</a>
          ))}
          <Link to="/repair-prices" className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Price calculator</Link>
        </div>
      </nav>
      <div className="container-x space-y-16 py-16">
        {!data && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 animate-pulse bg-mist-100" />)}</div>}
        {grouped.filter(([, l]) => l.length).map(([title, list]) => (
          <section key={title} id={title.replace(/[^a-z]+/gi, '-').toLowerCase()} className="scroll-mt-40" aria-label={title}>
            <h2 className="reveal flex items-center gap-3 text-2xl font-extrabold"><span className="h-6 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />{title}<span className="text-base font-semibold text-ink-400">{list.length}</span></h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((s) => <ServiceCard key={s.slug} s={s} catalog={catalog} />)}</div>
          </section>
        ))}
      </div>
      <FinalCta />
    </div>
  );
}
