import { useId } from "react";
import type { Grind } from "@/lib/products";

// Deterministic pseudo-random so server and client render identically.
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Per grind:
 * - noise: frequency/relief of the lit powder surface (higher frequency = finer, smoother powder)
 * - granules: visible semolina-like grains
 * - bran: brown flecks of wheat bran, larger and more visible as the grind gets coarser
 */
const spec: Record<Grind, { freq: number; relief: number; granules: [number, number, number]; bran: [number, number, number]; seed: number }> = {
  Fine: { freq: 1.6, relief: 0.8, granules: [0, 0, 0], bran: [26, 0.25, 0.55], seed: 11 },
  Medium: { freq: 0.95, relief: 1.6, granules: [240, 0.8, 1.5], bran: [42, 0.45, 0.95], seed: 23 },
  Coarse: { freq: 0.55, relief: 2.6, granules: [320, 1.5, 3.0], bran: [58, 0.8, 1.7], seed: 37 },
};

/** Top-down view of a bowl of atta whose texture shows the grind fineness. */
export function GrainTexture({ grind }: { grind: Grind }) {
  const { freq, relief, granules, bran, seed } = spec[grind];
  const uid = "gt" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = rand(seed);
  const spot = (max: number) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * max;
    return { x: 80 + Math.cos(a) * d, y: 80 + Math.sin(a) * d };
  };

  const grains = Array.from({ length: granules[0] }, () => {
    const { x, y } = spot(68);
    const size = granules[1] + r() * (granules[2] - granules[1]);
    return { x, y, rx: size, ry: size * (0.65 + r() * 0.3), rot: r() * 180, tone: r() };
  });
  const flecks = Array.from({ length: bran[0] }, () => {
    const { x, y } = spot(70);
    const size = bran[1] + r() * (bran[2] - bran[1]);
    return { x, y, rx: size, ry: size * (0.35 + r() * 0.3), rot: r() * 180, dark: r() > 0.5 };
  });
  const f = (n: number) => n.toFixed(2);

  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" className="grainTex">
      <defs>
        <radialGradient id={`${uid}-base`} cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#f8f1e1" />
          <stop offset=".65" stopColor="#efe3c8" />
          <stop offset="1" stopColor="#dcc8a2" />
        </radialGradient>
        <radialGradient id={`${uid}-grain`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".55" stopColor="#ecdcb8" />
          <stop offset="1" stopColor="#c8aa74" />
        </radialGradient>
        <radialGradient id={`${uid}-grain2`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f6ead0" />
          <stop offset=".6" stopColor="#dcc394" />
          <stop offset="1" stopColor="#b58f57" />
        </radialGradient>
        <radialGradient id={`${uid}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset=".78" stopColor="#5a4020" stopOpacity="0" />
          <stop offset=".95" stopColor="#5a4020" stopOpacity=".28" />
          <stop offset="1" stopColor="#3b2a14" stopOpacity=".5" />
        </radialGradient>
        <radialGradient id={`${uid}-sheen`} cx="34%" cy="28%" r="45%">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* lit powder surface: noise used as a height map */}
        <filter id={`${uid}-powder`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves="3" seed={seed} result="noise" />
          <feDiffuseLighting in="noise" surfaceScale={relief} diffuseConstant="1.05" lightingColor="#fff7e8" result="light">
            <feDistantLight azimuth="235" elevation="58" />
          </feDiffuseLighting>
          <feComposite in="light" in2="SourceGraphic" operator="arithmetic" k1="0.85" k2="0" k3="0.22" k4="0" />
        </filter>
        <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation=".35" />
        </filter>
      </defs>

      <circle cx="80" cy="80" r="78" fill={`url(#${uid}-base)`} filter={`url(#${uid}-powder)`} />

      {/* granules with a soft contact shadow */}
      {grains.length > 0 && (
        <g>
          <g fill="#6e522b" opacity=".28" filter={`url(#${uid}-soft)`}>
            {grains.map((g, i) => (
              <ellipse key={i} cx={f(g.x + g.rx * 0.35)} cy={f(g.y + g.rx * 0.45)} rx={f(g.rx)} ry={f(g.ry)} transform={`rotate(${f(g.rot)} ${f(g.x)} ${f(g.y)})`} />
            ))}
          </g>
          {grains.map((g, i) => (
            <ellipse
              key={i}
              cx={f(g.x)}
              cy={f(g.y)}
              rx={f(g.rx)}
              ry={f(g.ry)}
              transform={`rotate(${f(g.rot)} ${f(g.x)} ${f(g.y)})`}
              fill={`url(#${uid}-${g.tone > 0.7 ? "grain2" : "grain"})`}
            />
          ))}
        </g>
      )}

      {/* bran flecks */}
      {flecks.map((b, i) => (
        <ellipse
          key={i}
          cx={f(b.x)}
          cy={f(b.y)}
          rx={f(b.rx)}
          ry={f(b.ry)}
          transform={`rotate(${f(b.rot)} ${f(b.x)} ${f(b.y)})`}
          fill={b.dark ? "#8a5a2b" : "#a87a45"}
          opacity=".8"
        />
      ))}

      <circle cx="80" cy="80" r="78" fill={`url(#${uid}-sheen)`} />
      <circle cx="80" cy="80" r="78" fill={`url(#${uid}-rim)`} />
    </svg>
  );
}
