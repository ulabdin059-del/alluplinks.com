import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const SiteCtx = createContext(null);
const CatalogCtx = createContext(null);

// Fallback values match the seeded settings so the shell renders instantly before /api/site responds.
const FALLBACK = {
  business: { name: 'All Uplinks', legal_name: 'All Uplinks - Phone Repair Keswick', street: '443 The Queensway South', city: 'Keswick', region: 'ON', region_name: 'Ontario', country: 'CA', phone_display: '905-535-9503', phone_tel: '+19055359503', email: '', site_url: 'https://alluplinks.com', maps_query: 'All Uplinks - Phone Repair Keswick, 443 The Queensway South, Keswick, Ontario, Canada' },
  hours: [], content: {}, pricing: { variance: 60, note: '' }, warranty: { text: '' }, faqs: [], reviews: [], services: [], loading: true
};

export function SiteProvider({ children }) {
  const [site, setSite] = useState(FALLBACK);
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    api('/site').then((s) => setSite({ ...s, loading: false })).catch(() => setSite((s) => ({ ...s, loading: false })));
  }, []);
  const loadCatalog = () => {
    if (catalog) return Promise.resolve(catalog);
    return api('/catalog').then((c) => { setCatalog(c); return c; });
  };
  return (
    <SiteCtx.Provider value={site}>
      <CatalogCtx.Provider value={{ catalog, loadCatalog }}>{children}</CatalogCtx.Provider>
    </SiteCtx.Provider>
  );
}
export const useSite = () => useContext(SiteCtx);
export function useCatalog() {
  const { catalog, loadCatalog } = useContext(CatalogCtx);
  const [error, setError] = useState(null);
  useEffect(() => { loadCatalog().catch(setError); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { catalog, error };
}

// Keeps <title>, description and canonical in sync during client-side navigation.
// The server renders the same tags for the first request, so crawlers get them without JavaScript.
export function useSeo(title, description, path) {
  useEffect(() => {
    if (title) document.title = title;
    const set = (sel, attr, val, create) => {
      let el = document.head.querySelector(sel);
      if (!el && create) { el = create(); document.head.appendChild(el); }
      if (el && val) el.setAttribute(attr, val);
    };
    set('meta[name="description"]', 'content', description, () => Object.assign(document.createElement('meta'), { name: 'description' }));
    set('meta[property="og:title"]', 'content', title);
    set('meta[property="og:description"]', 'content', description);
    if (path != null) {
      const url = 'https://alluplinks.com' + path;
      set('link[rel="canonical"]', 'href', url, () => Object.assign(document.createElement('link'), { rel: 'canonical' }));
      set('meta[property="og:url"]', 'content', url);
    }
  }, [title, description, path]);
}
