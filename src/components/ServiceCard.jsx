import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Img } from './ui.jsx';
import { money } from '../lib/utils.js';

// "From" price is derived live from the catalogue so it always matches the calculator.
export function fromPrice(service, catalog) {
  const src = service?.price_source;
  if (!catalog || !src?.categories?.length) return null;
  let min = Infinity;
  for (const slug of src.categories) {
    const c = catalog.categories.find((x) => x.slug === slug);
    for (const b of c?.brands || []) for (const m of b.models) for (const r of src.repairs) if (m.prices[r] != null) min = Math.min(min, m.prices[r]);
  }
  return Number.isFinite(min) ? min : null;
}

export default function ServiceCard({ s, catalog }) {
  const from = fromPrice(s, catalog);
  return (
    <Link to={`/services/${s.slug}`} className="reveal card card-hover group flex w-full flex-col overflow-hidden">
      <div className="relative overflow-hidden">
        <Img k={s.image} alt={s.image_alt || s.name} className="aspect-[16/10] w-full transition duration-700 group-hover:scale-[1.04]" sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
          {from != null ? `From ${money(from)}` : 'Quoted after diagnosis'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="flex items-start justify-between gap-3 text-lg font-bold">{s.name}<ArrowUpRight className="h-5 w-5 shrink-0 text-ink-300 transition group-hover:text-brand-600" aria-hidden="true" /></h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{s.short}</p>
        {s.time_estimate && <p className="mt-4 text-xs font-semibold text-ink-400">Typical time · {s.time_estimate}</p>}
      </div>
    </Link>
  );
}
