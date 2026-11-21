type Props = { variant: number; label: string; kg?: number | string; className?: string };

const palettes = [
  { bag: "#ece3f2", band: "#48166b", ink: "#291047", accent: "#c5f33a" },
  { bag: "#f3edd9", band: "#5b2d78", ink: "#2b1640", accent: "#c5f33a" },
  { bag: "#291047", band: "#c5f33a", ink: "#f6f1fa", accent: "#c5f33a" },
];

/** Illustrated flour sack used as product artwork. Pure SVG, no external images. */
export function FlourBag({ variant, label, kg, className }: Props) {
  const p = palettes[variant % palettes.length];
  const id = `bag${variant}`;
  return (
    <svg className={className} viewBox="0 0 220 280" role="img" aria-label={`FLAZZO ${label} atta pack`}>
      <defs>
        <linearGradient id={`${id}-shade`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".14" />
          <stop offset=".22" stopColor="#000" stopOpacity="0" />
          <stop offset=".8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".18" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="268" rx="86" ry="9" fill="#14091d" opacity=".18" />
      {/* folded top */}
      <path d="M38 34 L58 16 L80 30 L110 14 L140 30 L162 16 L182 34 Z" fill={p.bag} stroke={p.ink} strokeOpacity=".2" />
      {/* body */}
      <path d="M36 34 H184 L194 252 Q110 266 26 252 Z" fill={p.bag} />
      <path d="M36 34 H184 L194 252 Q110 266 26 252 Z" fill={`url(#${id}-shade)`} />
      {/* stitch */}
      <path d="M40 44 H180" stroke={p.ink} strokeOpacity=".35" strokeDasharray="5 5" strokeWidth="2" />
      {/* band */}
      <path d="M31 120 H189 L192 186 H28 Z" fill={p.band} />
      <text x="110" y="100" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="30" letterSpacing="-1" fill={p.ink}>
        FLAZZO
      </text>
      <text x="110" y="149" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="700" fontSize="19" fill={variant === 2 ? "#291047" : "#f6f1fa"}>
        {label.toUpperCase()}
      </text>
      <text x="110" y="172" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="600" fontSize="10" letterSpacing="3" fill={variant === 2 ? "#291047" : p.accent}>
        FRESH CHAKKI ATTA
      </text>
      {/* wheat sprig */}
      <g transform="translate(110 222)" stroke={p.ink} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".75">
        <path d="M0 22 V-22" />
        {[-14, -4, 6].map((y) => (
          <g key={y}>
            <path d={`M0 ${y} q-10 -4 -12 -14 q10 2 12 14`} fill={p.ink} fillOpacity=".15" />
            <path d={`M0 ${y} q10 -4 12 -14 q-10 2 -12 14`} fill={p.ink} fillOpacity=".15" />
          </g>
        ))}
      </g>
      {kg !== undefined && (
        <g transform="translate(160 214) rotate(-12)">
          <circle r="24" fill={p.accent} />
          <text y="2" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="15" fill="#291047">
            {kg}
          </text>
          <text y="14" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="7" letterSpacing="1" fill="#291047">
            KG
          </text>
        </g>
      )}
    </svg>
  );
}
