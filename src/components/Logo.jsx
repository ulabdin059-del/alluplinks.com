export const LEAF_PATH = 'M50 4 57 18 66 13 63 35 77 22 80 30 92 27 86 42 95 47 75 62 78 70 55 66 54 90 52 90 52 98 48 98 48 90 46 90 45 66 22 70 25 62 5 47 14 42 8 27 20 30 23 22 37 35 34 13 43 18Z';

export function MapleLeaf({ className = 'h-4 w-4', title }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={LEAF_PATH} />
    </svg>
  );
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#c8102e" />
        <g transform="translate(7.2 6.4) scale(.256)"><path d={LEAF_PATH} fill="#fff" /></g>
      </svg>
      <span className="whitespace-nowrap leading-none">
        <span className="block font-display text-[19px] font-extrabold tracking-tight text-ink">All Uplinks</span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400 min-[380px]:text-[10.5px] min-[380px]:tracking-[0.14em]">Phone Repair · Keswick</span>
      </span>
    </span>
  );
}
