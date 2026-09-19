/** Smith-chart identities and the stereographic chart S² → ℂ. Physics, not analogy. */

export type C = { re: number; im: number };

export function c(re: number, im = 0): C {
  return { re, im };
}

export function cadd(a: C, b: C): C {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function csub(a: C, b: C): C {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function cmul(a: C, b: C): C {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function cdiv(a: C, b: C): C {
  const d = b.re * b.re + b.im * b.im || 1e-18;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

export function cconj(a: C): C {
  return { re: a.re, im: -a.im };
}

export function cabs(a: C): number {
  return Math.hypot(a.re, a.im);
}

export function cabs2(a: C): number {
  return a.re * a.re + a.im * a.im;
}

export type Mat2 = { a: C; b: C; c: C; d: C };

export function matMul(A: Mat2, B: Mat2): Mat2 {
  return {
    a: cadd(cmul(A.a, B.a), cmul(A.b, B.c)),
    b: cadd(cmul(A.a, B.b), cmul(A.b, B.d)),
    c: cadd(cmul(A.c, B.a), cmul(A.d, B.c)),
    d: cadd(cmul(A.c, B.b), cmul(A.d, B.d)),
  };
}

export function matVec(A: Mat2, z: C, w: C): [C, C] {
  return [cadd(cmul(A.a, z), cmul(A.b, w)), cadd(cmul(A.c, z), cmul(A.d, w))];
}

export function matEye(): Mat2 {
  return { a: c(1), b: c(0), c: c(0), d: c(1) };
}

export function matInv(A: Mat2): Mat2 {
  const det = csub(cmul(A.a, A.d), cmul(A.b, A.c));
  const idet = cdiv(c(1), det);
  return {
    a: cmul(A.d, idet),
    b: cmul(c(-A.b.re, -A.b.im), idet),
    c: cmul(c(-A.c.re, -A.c.im), idet),
    d: cmul(A.a, idet),
  };
}

export function matFrob(A: Mat2): number {
  return Math.sqrt(cabs2(A.a) + cabs2(A.b) + cabs2(A.c) + cabs2(A.d));
}

/** Γ = (z − 1) / (z + 1). */
export function gammaFromZ(z: C): C {
  return cdiv(csub(z, c(1)), cadd(z, c(1)));
}

/** z = (1 + Γ) / (1 − Γ). */
export function zFromGamma(g: C): C {
  return cdiv(cadd(c(1), g), csub(c(1), g));
}

/** A(Γ) = |dz/dΓ| = 2 / |1 − Γ|². Singular at the open-circuit point Γ = 1. */
export function amplification(g: C): number {
  const d = cabs2(csub(c(1), g));
  return 2 / Math.max(d, 1e-18);
}

/** Constant-r circles: centre (r/(r+1), 0), radius 1/(r+1). */
export function resistanceCircle(r: number): { cx: number; cy: number; radius: number } {
  return { cx: r / (r + 1), cy: 0, radius: 1 / (r + 1) };
}

/** Constant-x circles: centre (1, 1/x), radius |1/x|. */
export function reactanceCircle(x: number): { cx: number; cy: number; radius: number } {
  return { cx: 1, cy: 1 / x, radius: Math.abs(1 / x) };
}

export const SMITH_R = [0.2, 0.5, 1, 2, 4];
export const SMITH_X = [0.2, 0.5, 1, 2, 4];

/** North-pole stereographic: ζ = (x + iy) / (1 − z). Equator → |ζ| = 1. */
export function stereoFromSphere(x: number, y: number, z: number): C {
  const den = 1 - z;
  if (Math.abs(den) < 1e-12) return c(x >= 0 ? 1e6 : -1e6, y);
  return c(x / den, y / den);
}

export function sphereFromStereo(g: C): [number, number, number] {
  const n = cabs2(g);
  const d = n + 1;
  return [(2 * g.re) / d, (2 * g.im) / d, (n - 1) / d];
}
