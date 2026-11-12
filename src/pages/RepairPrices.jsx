import { Link } from 'react-router-dom';
import { useSeo } from '../lib/site.jsx';
import { useReveal } from '../lib/utils.js';
import PriceCalculator from '../components/PriceCalculator.jsx';
import { Accordion } from '../components/ui.jsx';

export default function RepairPrices() {
  useSeo('Phone Repair Prices in Keswick, ON — Instant Quote | All Uplinks',
    'Get the exact repair price for your iPhone, Samsung, Pixel, iPad, laptop, MacBook or game console in CAD. Choose your model and repair to see your price and repair time.', '/repair-prices');
  const ref = useReveal();
  return (
    <div ref={ref} className="bg-gradient-to-b from-brand-50/70 via-white to-white">
      <div className="container-x py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">Instant quote</span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Repair price calculator</h1>
          <p className="lead mt-4">Select your device, model and repair to see your price in Canadian dollars and the estimated repair time.</p>
        </div>
        <div className="mx-auto mt-10 max-w-6xl"><PriceCalculator syncUrl headingLevel="h2" /></div>
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="reveal text-2xl font-extrabold">About our prices</h2>
          <div className="reveal mt-6">
            <Accordion items={[
              { q: 'Why is a price range shown?', a: 'Each repair has an advertised price for your exact model. Depending on part availability, the part quality you choose and your device’s condition, the final price can be slightly higher — we always confirm it with you before starting.' },
              { q: 'Are taxes included?', a: 'Prices are shown in Canadian dollars before applicable taxes.' },
              { q: 'What if my repair says “Quoted after diagnosis”?', a: 'Repairs like water damage, motherboard faults and data recovery depend on what we find inside the device. We inspect it, explain the problem and confirm a price with you before any work begins.' },
              { q: 'My model isn’t listed. Can you still help?', a: <>Very likely. <Link to="/book" className="font-semibold text-brand-700 hover:underline">Book an assessment</Link> or call us and we’ll check parts availability and pricing for your device.</> }
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}
