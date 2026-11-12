import { useEffect, useRef, useState } from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const money = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-CA', { maximumFractionDigits: 2 }));
export const range = (lo, hi) => (lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`);

// Image keys refer to optimized local WebP files (`/images/<key>-640.webp` and `-1280.webp`). Uploaded images are full URLs.
export const imgSrc = (key, w = 1280) => (!key ? '' : key.startsWith('/') || key.startsWith('http') ? key : `/images/${key}-${w}.webp`);
export const imgSet = (key) => (!key || key.startsWith('/') || key.startsWith('http') ? undefined : `/images/${key}-640.webp 640w, /images/${key}-1280.webp 1280w`);

export const telHref = (b) => `tel:${b?.phone_tel || '+19055359503'}`;
export const mapsSearch = (b) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b?.maps_query || '');
export const mapsDirections = (b) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(b?.maps_query || '');
export const mapsEmbed = (b) => 'https://www.google.com/maps?q=' + encodeURIComponent(b?.maps_query || '') + '&output=embed';

export function fmtTime(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

// Scroll-reveal: one IntersectionObserver for the whole app, plus a MutationObserver so elements
// rendered later (after data loads or route changes) are picked up automatically.
let revealStarted = false;
export function startReveal() {
  if (revealStarted || typeof window === 'undefined') return;
  revealStarted = true;
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const showAll = () => document.querySelectorAll('.reveal:not(.in)').forEach((n) => n.classList.add('in'));
    showAll(); new MutationObserver(showAll).observe(document.body, { childList: true, subtree: true }); return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  const scan = () => document.querySelectorAll('.reveal:not(.in):not([data-rv])').forEach((n) => { n.setAttribute('data-rv', ''); io.observe(n); });
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
// Kept for page components: returns a ref (no-op) and ensures the global observer is running.
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => { startReveal(); }, []);
  return ref;
}

export function useFetch(fn, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    set((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && set({ data, error: null, loading: false }))
      .catch((error) => alive && set({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const fileList = (files, max = 5) => Array.from(files || []).filter((f) => /^image\//.test(f.type)).slice(0, max);

export { storeStatus } from '../../shared/hours.js';
