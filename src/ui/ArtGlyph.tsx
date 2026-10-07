/** Engraved geometric vocabulary shared by the v2.5 interface. Decoration only. */
export function ArtGlyph({
  variant = 'seal',
  className = '',
}: {
  variant?: 'seal' | 'vital' | 'shift' | 'pulse' | 'well';
  className?: string;
}) {
  return (
    <svg
      className={`art-glyph ${className}`}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="43" stroke="currentColor" strokeWidth=".65" />
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke="currentColor"
        strokeWidth=".65"
        strokeDasharray="2 7"
      />
      <path d="M50 3v10M50 87v10M3 50h10M87 50h10" stroke="currentColor" />
      {variant === 'seal' && (
        <>
          <path
            d="M50 15 85 50 50 85 15 50Z M50 28 72 66H28Z M50 72 28 34h44Z"
            stroke="currentColor"
            strokeWidth=".8"
          />
          <circle cx="50" cy="50" r="14" stroke="currentColor" />
          <path d="M46 50h8M50 46v8" stroke="currentColor" />
        </>
      )}
      {variant === 'vital' && (
        <path
          d="m50 24 21 12v21L50 76 29 57V36Z M50 35v28M39 49h22"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
      {variant === 'shift' && (
        <path
          d="m53 24-25 28h20L37 76l35-35H51Z M21 37h15M64 65h15"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
      {variant === 'pulse' && (
        <>
          <path
            d="m50 23 7 20 20 7-20 7-7 20-7-20-20-7 20-7Z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="23"
            stroke="currentColor"
            strokeDasharray="18 12"
          />
        </>
      )}
      {variant === 'well' && (
        <>
          <ellipse
            cx="50"
            cy="50"
            rx="28"
            ry="12"
            transform="rotate(-35 50 50)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <ellipse
            cx="50"
            cy="50"
            rx="14"
            ry="27"
            transform="rotate(-35 50 50)"
            stroke="currentColor"
          />
          <circle cx="50" cy="50" r="5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
