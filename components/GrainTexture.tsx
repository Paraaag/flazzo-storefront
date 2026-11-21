import type { Grind } from "@/lib/products";

// Deterministic pseudo-random so server and client render identically.
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const spec: Record<Grind, { count: number; min: number; max: number; seed: number }> = {
  Fine: { count: 420, min: 0.6, max: 1.3, seed: 11 },
  Medium: { count: 170, min: 1.4, max: 2.6, seed: 23 },
  Coarse: { count: 60, min: 2.8, max: 5.2, seed: 37 },
};

/** A circle of "flour" whose particle size shows the grind fineness. */
export function GrainTexture({ grind }: { grind: Grind }) {
  const { count, min, max, seed } = spec[grind];
  const r = rand(seed);
  const dots = Array.from({ length: count }, () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 72;
    return { x: 80 + Math.cos(a) * d, y: 80 + Math.sin(a) * d, size: min + r() * (max - min), o: 0.45 + r() * 0.55 };
  });
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" className="grainTex">
      <circle cx="80" cy="80" r="78" fill="#f4ecd8" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.size.toFixed(2)} fill="#a9824a" opacity={d.o.toFixed(2)} />
      ))}
    </svg>
  );
}
