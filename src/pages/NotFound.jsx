import { Link } from 'react-router-dom';
import { useSeo } from '../lib/site.jsx';

export default function NotFound() {
  useSeo('Page not found | All Uplinks', 'This page could not be found.');
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold text-brand-200">404</p>
        <h1 className="mt-4 text-3xl font-extrabold">We couldn’t find that page</h1>
        <p className="mt-3 text-ink-500">The page may have moved. Try one of these instead:</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/" className="btn-primary">Home</Link><Link to="/repair-prices" className="btn-outline">Repair prices</Link><Link to="/services" className="btn-outline">Services</Link></div>
      </div>
    </div>
  );
}
