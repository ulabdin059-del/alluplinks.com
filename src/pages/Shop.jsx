import { Link, NavLink, useParams } from 'react-router-dom';
import { useSeo } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { cx, money, useFetch, useReveal } from '../lib/utils.js';
import { Img, PageHero } from '../components/ui.jsx';
import { SHOP_CATEGORIES, SHOP_BRANDS } from '../../shared/constants.js';
import NotFound from './NotFound.jsx';

export function ProductCard({ p }) {
  return (
    <Link to={`/shop/product/${p.slug}`} className="reveal card card-hover group flex flex-col overflow-hidden">
      <div className="relative overflow-hidden bg-mist-100">
        <Img k={p.images[0]} alt={p.name} className="aspect-square w-full transition duration-700 group-hover:scale-[1.04]" sizes="(min-width:1024px) 25vw, 50vw" />
        <span className={cx('absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm', p.condition === 'pre-owned' ? 'bg-amber-50 text-amber-800' : 'bg-white text-ink')}>{p.condition === 'pre-owned' ? 'Pre-owned' : 'New'}</span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {p.brand && p.brand !== 'Assorted' && <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{p.brand}</p>}
        <h3 className="mt-1 text-base font-bold leading-snug">{p.name}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink-500">{p.short}</p>
        <p className="mt-4 flex items-baseline gap-2">
          {p.price != null ? <><span className="font-display text-xl font-extrabold">{money(p.price)}</span>{p.compare_at > p.price && <span className="text-sm text-ink-400 line-through">{money(p.compare_at)}</span>}</>
            : <span className="text-sm font-semibold text-brand-700">Call for current price</span>}
        </p>
      </div>
    </Link>
  );
}

export default function Shop() {
  const { category } = useParams();
  const cat = SHOP_CATEGORIES.find((c) => c.slug === category);
  const brandFilter = SHOP_BRANDS.find((b) => b.slug === category);
  const { data } = useFetch(() => api('/products' + (cat ? '?category=' + cat.slug : '')), [category]);
  const ref = useReveal();
  const title = cat?.name || brandFilter?.name || 'Shop phones & accessories';
  useSeo(`${cat?.name || brandFilter?.name || 'Phones & Accessories'} in Keswick, ON | All Uplinks`,
    cat?.blurb ? `${cat.name} at All Uplinks, 443 The Queensway South, Keswick. ${cat.blurb}` : 'New and pre-owned iPhone and Samsung phones, cases, screen protectors, chargers, cables and wireless accessories at All Uplinks in Keswick, Ontario.',
    category ? `/shop/${category}` : '/shop');
  if (category && !cat && !brandFilter) return <NotFound />;
  let list = data || [];
  if (brandFilter) list = list.filter((p) => p.brand === brandFilter.brand && brandFilter.categories.includes(p.category));

  return (
    <div ref={ref}>
      <PageHero eyebrow="Shop" title={title} image={cat?.image || 'shop-hero'} imageAlt={title} crumbs={category ? [['Shop', '/shop'], [title]] : [['Shop']]}>
        {cat?.blurb || 'New and pre-owned smartphones plus the cases, screen protectors, chargers and accessories to go with them. Prices shown where confirmed — call or send an inquiry for current pricing and availability.'}
      </PageHero>
      <div className="container-x py-10">
        <nav aria-label="Shop categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 no-scrollbar">
          {[{ slug: '', name: 'All products' }, ...SHOP_BRANDS, ...SHOP_CATEGORIES].map((c) => (
            <NavLink key={c.slug || 'all'} to={c.slug ? `/shop/${c.slug}` : '/shop'} end
              className={({ isActive }) => cx('shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition', isActive ? 'bg-ink text-white ring-ink' : 'bg-white text-ink-600 ring-mist-300 hover:ring-brand-300')}>{c.name}</NavLink>
          ))}
        </nav>
        {!category && (
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
            {SHOP_CATEGORIES.map((c) => (
              <Link key={c.slug} to={`/shop/${c.slug}`} className="reveal group overflow-hidden rounded-2xl bg-white ring-1 ring-mist-200 transition hover:-translate-y-0.5 hover:shadow-card">
                <Img k={c.image} alt={c.name} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-105" sizes="200px" />
                <p className="p-3 text-sm font-semibold">{c.name}</p>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {!data ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="card aspect-[3/4] animate-pulse bg-mist-100" />) : list.map((p) => <ProductCard key={p.slug} p={p} />)}
        </div>
        {data && !list.length && <p className="py-16 text-center text-ink-500">No products in this category yet. <Link to="/contact" className="font-semibold text-brand-700">Ask us</Link> — we may be able to order it for you.</p>}
      </div>
    </div>
  );
}
