export default function Spinner({ label = 'Loading' }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-500">
      <svg className="h-5 w-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
