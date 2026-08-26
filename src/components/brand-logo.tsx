export function BrandLogo({ size = 38 }: { size?: number }) {
  return (
    <svg
      className="brand-symbol"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Underwrite"
    >
      <rect className="brand-symbol-bg" x="1" y="1" width="38" height="38" rx="10" />
      <path className="brand-symbol-u" d="M9 9h5v15h11V9h5v16.5c0 2-1.5 3.5-3.5 3.5h-14C10.5 29 9 27.5 9 25.5V9Z" />
      <path className="brand-symbol-signal" d="m23.5 18.5 4-4 3 3 4.5-5" />
      <path className="brand-symbol-tick" d="M35 12.5v4.5" />
    </svg>
  );
}

