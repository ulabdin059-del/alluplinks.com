export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 40 40" className="h-9 w-9" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill="#0f1d3a" />
        <path d="M12.5 28V19.5a7.5 7.5 0 0 1 15 0V28" fill="none" stroke="#5aa2f0" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M20 13v6.5M16.8 16.2 20 13l3.2 3.2" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-none">
        <span className="block font-display text-[19px] font-extrabold tracking-tight text-ink">All Uplinks</span>
        <span className="mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Phone Repair · Keswick</span>
      </span>
    </span>
  );
}
