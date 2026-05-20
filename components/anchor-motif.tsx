// Inline SVG topographic motif — organic, quiet, ink-wash inspired
export function AnchorMotif({
  className,
  size = 200,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* Outermost ring */}
      <ellipse cx="100" cy="108" rx="82" ry="74" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.18" filter="url(#ink)" />
      <ellipse cx="100" cy="108" rx="72" ry="64" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.22" filter="url(#ink)" />
      <ellipse cx="100" cy="107" rx="60" ry="53" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.28" filter="url(#ink)" />
      <ellipse cx="100" cy="106" rx="48" ry="42" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.32" filter="url(#ink)" />
      <ellipse cx="100" cy="106" rx="36" ry="31" stroke="currentColor" strokeWidth="1" strokeOpacity="0.38" filter="url(#ink)" />
      <ellipse cx="100" cy="105" rx="24" ry="20" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.45" filter="url(#ink)" />
      <ellipse cx="100" cy="105" rx="13" ry="10" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.55" filter="url(#ink)" />
      {/* Anchor vertical line */}
      <line x1="100" y1="24" x2="100" y2="100" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.5" strokeLinecap="round" />
      {/* Anchor crossbar */}
      <line x1="78" y1="38" x2="122" y2="38" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
      {/* Anchor ring at top */}
      <circle cx="100" cy="26" r="5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
    </svg>
  )
}
