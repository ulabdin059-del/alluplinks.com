import { Link } from 'react-router-dom';
import { BadgeDollarSign, MessageSquareText, Wrench, MapPin } from 'lucide-react';
import { useSeo, useSite } from '../lib/site.jsx';
import { useReveal } from '../lib/utils.js';
import { Img, PageHero, LocationCard } from '../components/ui.jsx';
import { FinalCta } from './Home.jsx';

export default function About() {
  const { content, business } = useSite();
  useSeo('About All Uplinks — Phone Repair in Keswick, ON', (content.about_body || '').slice(0, 155), '/about');
  const ref = useReveal();
  return (
    <div ref={ref}>
      <PageHero eyebrow="About us" title={content.about_title || 'About All Uplinks'} crumbs={[['About']]} image="store-counter" imageAlt="Customer being helped at the counter of a phone store">
        {content.about_body}
      </PageHero>
      <section className="container-x grid gap-12 py-16 lg:grid-cols-2 lg:items-center">
        <div className="reveal overflow-hidden rounded-3xl shadow-lift ring-1 ring-mist-200"><Img k="hero-technician" alt="Technician working on an opened smartphone" className="aspect-[4/3] w-full" /></div>
        <div className="reveal">
          <h2 className="h-section">What we stand for</h2>
          <div className="mt-8 space-y-6">
            {[[BadgeDollarSign, 'Prices you can see before you visit', 'Model-specific pricing for every common repair, published online and confirmed with you in store.'],
              [MessageSquareText, 'Plain-language explanations', 'We tell you what’s wrong, what your options are and what it costs — no jargon, no pressure.'],
              [Wrench, 'Repairs done carefully', 'Each device is tested function by function after the repair, before it goes back to you.'],
              [MapPin, 'Local to Keswick', `Find us at ${business.street}, serving Keswick, Georgina and nearby York Region communities.`]].map(([I, t, d]) => (
              <div key={t} className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 ring-1 ring-brand-100"><I className="h-5 w-5 text-brand-600" aria-hidden="true" /></span>
                <div><h3 className="font-bold">{t}</h3><p className="mt-1 text-[15px] text-ink-500">{d}</p></div></div>
            ))}
          </div>
          <div className="mt-8 flex gap-3"><Link to="/services" className="btn-primary">Our services</Link><Link to="/contact" className="btn-outline">Contact us</Link></div>
        </div>
      </section>
      <section className="container-x pb-8"><div className="reveal"><LocationCard /></div></section>
      <FinalCta />
    </div>
  );
}
