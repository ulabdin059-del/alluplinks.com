// Page code is split per route. Loaders are shared so a page can be preloaded before it is shown
// (the landing page before the app first renders; every other page in the background once idle).
export const loaders = {
  services: () => import('./pages/Services.jsx'),
  serviceDetail: () => import('./pages/ServiceDetail.jsx'),
  repairPrices: () => import('./pages/RepairPrices.jsx'),
  book: () => import('./pages/Book.jsx'),
  sell: () => import('./pages/Sell.jsx'),
  shop: () => import('./pages/Shop.jsx'),
  product: () => import('./pages/Product.jsx'),
  contact: () => import('./pages/Contact.jsx'),
  faq: () => import('./pages/Faq.jsx'),
  about: () => import('./pages/About.jsx'),
  reviews: () => import('./pages/Reviews.jsx'),
  legal: () => import('./pages/Legal.jsx'),
  notFound: () => import('./pages/NotFound.jsx'),
  admin: () => import('./admin/AdminApp.jsx')
};

const exact = { '/services': 'services', '/repair-prices': 'repairPrices', '/book': 'book', '/sell': 'sell', '/shop': 'shop', '/contact': 'contact',
  '/faq': 'faq', '/about': 'about', '/reviews': 'reviews', '/privacy': 'legal', '/terms': 'legal' };

export function loaderFor(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return null;
  if (exact[p]) return loaders[exact[p]];
  if (p.startsWith('/admin')) return loaders.admin;
  if (p.startsWith('/services/')) return loaders.serviceDetail;
  if (p.startsWith('/shop/product/')) return loaders.product;
  if (p.startsWith('/shop/')) return loaders.shop;
  return loaders.notFound;
}

export function prefetchAll() {
  const run = () => Object.entries(loaders).forEach(([k, l]) => { if (k !== 'admin') l().catch(() => {}); });
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 3000 }); else setTimeout(run, 1500);
}
