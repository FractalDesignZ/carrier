/** Planck-like diverging scale, ±300 μK → RGBA 0–255. */

type Stop = { t: number; r: number; g: number; b: number };

const STOPS: Stop[] = [
  { t: 0.0, r: 2, g: 8, b: 72 },
  { t: 0.18, r: 12, g: 68, b: 168 },
  { t: 0.35, r: 64, g: 186, b: 214 },
  { t: 0.5, r: 245, g: 244, b: 236 },
  { t: 0.65, r: 232, g: 176, b: 72 },
  { t: 0.82, r: 196, g: 72, b: 32 },
  { t: 1.0, r: 84, g: 12, b: 8 },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function planckColor(muK: number, scale = 300): [number, number, number] {
  const u = Math.min(1, Math.max(0, (muK + scale) / (2 * scale)));
  let i = 0;
  while (i < STOPS.length - 1 && STOPS[i + 1].t < u) i += 1;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = (u - a.t) / Math.max(1e-6, b.t - a.t);
  return [
    Math.round(lerp(a.r, b.r, t)),
    Math.round(lerp(a.g, b.g, t)),
    Math.round(lerp(a.b, b.b, t)),
  ];
}

export function mapToRgba(field: Float32Array, scale = 300): Uint8Array {
  const rgba = new Uint8Array(field.length * 4);
  for (let i = 0; i < field.length; i++) {
    const [r, g, b] = planckColor(field[i], scale);
    const o = i * 4;
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = 255;
  }
  return rgba;
}
