// Google rating shown in the homepage hero. Only shown when the owner has entered a rating (1–5) in admin.
export function googleRating(b) {
  const r = Number(b?.google_rating);
  if (!b?.google_rating || !(r >= 1 && r <= 5)) return null;
  const n = Number.parseInt(b.google_review_count, 10);
  return { value: r.toFixed(1), stars: Math.round(r), count: n > 0 ? `${n.toLocaleString('en-CA')} Google review${n === 1 ? '' : 's'}` : 'Google reviews', url: b.google_review_url || '' };
}
// Shared markup pieces (used by both the React hero and the server-rendered first view).
export const RATING_CLASS = 'mt-5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-white px-3.5 py-1.5 text-sm shadow-sm ring-1 ring-mist-200';
export const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z';
export const G_PATHS = [['#4285F4', 'M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z'], ['#34A853', 'M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z'], ['#FBBC05', 'M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z'], ['#EA4335', 'M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z']];
