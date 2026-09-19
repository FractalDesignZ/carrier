export function sieve(limit: number): Uint8Array {
  const is = new Uint8Array(limit + 1);
  is.fill(1);
  if (limit >= 0) is[0] = 0;
  if (limit >= 1) is[1] = 0;
  for (let p = 2; p * p <= limit; p++) {
    if (!is[p]) continue;
    for (let q = p * p; q <= limit; q += p) is[q] = 0;
  }
  return is;
}

/** Ulam square spiral: n=1 at origin, east then north (CCW). */
export function ulamCoord(n: number): { x: number; y: number } {
  if (n <= 1) return { x: 0, y: 0 };
  const k = Math.ceil((Math.sqrt(n) - 1) / 2);
  const t = 2 * k;
  const m = n - (2 * k - 1) ** 2;
  if (m <= t) return { x: k, y: -k + m };
  if (m <= 2 * t) return { x: k - (m - t), y: k };
  if (m <= 3 * t) return { x: -k, y: k - (m - 2 * t) };
  return { x: -k + (m - 3 * t), y: -k };
}

/** Sacks Archimedean spiral: perfect squares on a ray. */
export function sacksCoord(n: number): { x: number; y: number } {
  const r = Math.sqrt(n);
  const theta = 2 * Math.PI * r;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}
