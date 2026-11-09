import { Link } from 'react-router-dom';
import { useSeo, useSite } from '../lib/site.jsx';
import { telHref, useReveal } from '../lib/utils.js';
import { Accordion, PageHero } from '../components/ui.jsx';
import { FinalCta } from './Home.jsx';

export default function Faq() {
  const { faqs, business } = useSite();
  useSeo('Phone Repair FAQ | All Uplinks Keswick', 'Answers to common questions about phone repair prices, repair times, data, water damage and trade-ins at All Uplinks in Keswick.', '/faq');
  const ref = useReveal();
  return (
    <div ref={ref}>
      <PageHero eyebrow="FAQ" title="Frequently asked questions" crumbs={[['FAQ']]}>
        Quick answers about prices, repair times, your data and trade-ins. Still unsure? Call <a href={telHref(business)} className="font-semibold text-brand-700">{business.phone_display}</a>.
      </PageHero>
      <div className="container-x max-w-3xl py-14">
        <div className="reveal"><Accordion items={faqs.map((f) => ({ q: f.question, a: f.answer }))} /></div>
        <p className="reveal mt-8 text-center text-ink-500">Looking for a price? <Link to="/repair-prices" className="font-semibold text-brand-700 hover:underline">Open the repair price calculator</Link>.</p>
      </div>
      <FinalCta />
    </div>
  );
}
