import { useId } from "react";

type Props = { name: readonly [string, string]; kg?: number; className?: string };

const PURPLE = "#3a0f63";
const LIME = "#c5f33a";
const INK = "#16101c";

/** One golden wheat ear lying along the x-axis, starting at the origin. */
function Ear({ gold }: { gold: string }) {
  return (
    <g>
      <path d="M-14 0 H52" stroke="#b9772a" strokeWidth="1.2" />
      {[0, 7, 14, 21, 28, 35, 42].map((x, i) => (
        <g key={x}>
          <ellipse cx={x + 3} cy={-2.6} rx="4.2" ry="2.2" transform={`rotate(-28 ${x + 3} -2.6)`} fill={gold} />
          <ellipse cx={x + 3} cy={2.6} rx="4.2" ry="2.2" transform={`rotate(28 ${x + 3} 2.6)`} fill={gold} />
          {i % 2 === 0 && <path d={`M${x + 6} -4 l9 -7 M${x + 6} 4 l9 7`} stroke="#d99a45" strokeWidth=".5" />}
        </g>
      ))}
      <ellipse cx="48" cy="0" rx="4" ry="2" fill={gold} />
    </g>
  );
}

/**
 * FLAZZO pack artwork, drawn after the printed 4x6 label:
 * silver foil, purple frame and swoosh, lime italic wordmark, name badge,
 * "Freshly milled" seal, benefit icons and net weight. Pure SVG, no images.
 */
export function FlourBag({ name, kg, className }: Props) {
  const uid = "fb" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = (s: string) => `url(#${uid}-${s})`;
  const fit = (s: string) => (s.length >= 8 ? 64 : undefined);

  return (
    <svg className={className} viewBox="0 0 220 320" role="img" aria-label={`FLAZZO ${name.join(" ")} atta pack${kg ? `, ${kg} KG` : ""}`}>
      <defs>
        <linearGradient id={`${uid}-foil`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fcfcfe" />
          <stop offset=".3" stopColor="#d6d6de" />
          <stop offset=".52" stopColor="#f8f8fb" />
          <stop offset=".76" stopColor="#cdcdd6" />
          <stop offset="1" stopColor="#efeff4" />
        </linearGradient>
        <linearGradient id={`${uid}-band`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2e0b4f" />
          <stop offset=".55" stopColor="#5b1b8e" />
          <stop offset="1" stopColor="#2e0b4f" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7b955" />
          <stop offset="1" stopColor="#cf7a1e" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect x="20" y="16" width="180" height="278" rx="17" />
        </clipPath>
      </defs>

      {/* shadow, frame, foil */}
      <ellipse cx="110" cy="311" rx="86" ry="6" fill="#14091d" opacity=".2" />
      <rect x="12" y="8" width="196" height="294" rx="24" fill={PURPLE} />
      <rect x="20" y="16" width="180" height="278" rx="17" fill={ref("foil")} />

      <g clipPath={ref("clip")}>
        {/* foil sheen */}
        <path d="M118 16 H150 L58 294 H26 Z" fill="#fff" opacity=".38" />
        <path d="M168 16 H178 L86 294 H76 Z" fill="#fff" opacity=".3" />

        {/* swoosh band with silver edges */}
        <path d="M20 160 C70 142 140 112 200 96" stroke="#fff" strokeWidth="5" fill="none" opacity=".9" />
        <path d="M20 168 C70 150 140 120 200 104 V176 C140 190 70 214 20 236 Z" fill={ref("band")} />
        <path d="M20 243 C70 221 140 197 200 183" stroke="#fff" strokeWidth="5" fill="none" opacity=".9" />

        {/* golden wheat + flour dust */}
        <g transform="translate(30 266) rotate(-24)">
          <Ear gold={ref("gold")} />
        </g>
        <g transform="translate(26 254) rotate(-34)">
          <Ear gold={ref("gold")} />
        </g>
        {[
          [94, 250],
          [104, 262],
          [86, 266],
          [112, 247],
        ].map(([x, y]) => (
          <ellipse key={`${x}${y}`} cx={x} cy={y} rx="3.4" ry="2" transform={`rotate(-30 ${x} ${y})`} fill={ref("gold")} />
        ))}

        {/* care strip */}
        <rect x="24" y="270" width="108" height="20" rx="6" fill={PURPLE} />
        <path d="M31 276 h9 v9 h-9 z M30 276 h11" stroke={LIME} strokeWidth="1" fill="none" />
        <text x="45" y="279" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="4.8" fill={LIME}>
          TRANSFER TO YOUR CONTAINER
        </text>
        <text x="45" y="285.5" fontFamily="var(--font-body), sans-serif" fontWeight="600" fontSize="3.7" fill="#fff">
          for freshness &amp; longer shelf life
        </text>
      </g>

      {/* name badge */}
      <path d="M30 16 H104 V80 L67 97 L30 80 Z" fill="#fff" stroke={PURPLE} strokeWidth="1.5" />
      {name.map((line, i) => (
        <text
          key={line}
          x="67"
          y={37 + i * 15}
          textAnchor="middle"
          fontFamily="var(--font-display), sans-serif"
          fontWeight="800"
          fontSize="13"
          letterSpacing="-.3"
          fill={INK}
          textLength={fit(line)}
          lengthAdjust="spacingAndGlyphs"
        >
          {line}
        </text>
      ))}
      <g transform="translate(67 84)" stroke="#b9772a" strokeWidth=".9" fill={ref("gold")}>
        <path d="M0 0 V-22" fill="none" />
        {[-6, -12, -18].map((y) => (
          <g key={y}>
            <ellipse cx="-3" cy={y} rx="3" ry="1.5" transform={`rotate(-35 -3 ${y})`} strokeWidth="0" />
            <ellipse cx="3" cy={y} rx="3" ry="1.5" transform={`rotate(35 3 ${y})`} strokeWidth="0" />
          </g>
        ))}
      </g>
      <text x="67" y="110" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="5.6" letterSpacing=".4" fill="#2b1640">
        PURE GRAINS
      </text>
      <text x="67" y="117" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="5.6" letterSpacing=".4" fill="#2b1640">
        FOR A HEALTHIER YOU
      </text>

      {/* freshly milled seal */}
      <g transform="translate(160 54)">
        <circle r="27" fill="#fff" fillOpacity=".85" stroke={PURPLE} strokeWidth="1.6" />
        <circle r="23" fill="none" stroke={PURPLE} strokeWidth=".6" />
        <path d="M0 -20 V-12 M0 -15 l-3 -3 M0 -15 l3 -3 M0 -12 l-3 -3 M0 -12 l3 -3" stroke={PURPLE} strokeWidth="1" />
        <text y="-1" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="8.6" fill={PURPLE}>
          FRESHLY
        </text>
        <text y="8.5" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="8.6" fill={PURPLE}>
          MILLED
        </text>
        <text y="15.5" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="4" letterSpacing=".3" fill={PURPLE}>
          FOR BETTER TASTE
        </text>
      </g>

      {/* wordmark on the swoosh */}
      <g transform="translate(112 172) rotate(-15)">
        <text
          x="-2"
          y="6"
          textAnchor="middle"
          transform="skewX(-12)"
          fontFamily="var(--font-display), sans-serif"
          fontWeight="800"
          fontSize="46"
          letterSpacing="-1"
          fill={LIME}
          textLength="150"
          lengthAdjust="spacingAndGlyphs"
        >
          FLAZZO
        </text>
        <text x="79" y="-24" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="6" fill={LIME}>
          ™
        </text>
        <text x="0" y="22" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="8.4" letterSpacing="2.4" fill="#fff">
          FRESH ATTA YOUR WAY
        </text>
        <path d="M-30 29 Q10 26 50 24" stroke={LIME} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>

      {/* benefits */}
      {[
        { x: 126, a: "100%", b: "NATURAL", icon: "M-3 3 C-3 -3 1 -5 4 -5 C4 -1 2 3 -3 3 Z M-3 3 L1 -1" },
        { x: 153, a: "RICH IN", b: "NUTRITION", icon: "M0 5 V-5 M0 -1 l-3 -3 M0 -1 l3 -3 M0 3 l-3 -3 M0 3 l3 -3" },
        { x: 180, a: "HIGH", b: "FIBRE", icon: "M-4 1 l3 3 l5 -7" },
      ].map((f, i) => (
        <g key={f.b} transform={`translate(${f.x} 210)`}>
          {i > 0 && <path d="M-13.5 -8 V20" stroke={PURPLE} strokeWidth=".6" opacity=".5" />}
          <circle r="8.5" fill="#fff" stroke={PURPLE} strokeWidth="1.1" />
          <path d={f.icon} stroke={PURPLE} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text y="16" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="4.3" fill={PURPLE}>
            {f.a}
          </text>
          <text y="21" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="4.3" fill={PURPLE}>
            {f.b}
          </text>
        </g>
      ))}

      {/* net weight */}
      {kg !== undefined && (
        <g>
          <text x="192" y="250" textAnchor="end" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="7" fill={INK}>
            NET WT.
          </text>
          <path d="M150 253 H192" stroke={INK} strokeWidth=".8" />
          <text x="193" y="282" textAnchor="end" fontFamily="var(--font-display), sans-serif" fontWeight="800" fontSize="31" letterSpacing="-1.2" fill={INK}>
            {kg}KG
          </text>
        </g>
      )}
    </svg>
  );
}
