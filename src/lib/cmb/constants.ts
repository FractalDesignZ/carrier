/** Planck / FIRAS / WMAP figures used by the engine. Status lives in the research brief. */

export const T_CMB_K = 2.72548;
export const T_RECOMB_K = 3000;
export const Z_STAR = 1090;
export const AGE_RECOMB_YR = 380_000;
export const AGE_UNIVERSE_GYR = 13.8;
export const ANISOTROPY_SCALE_UK = 300;
export const DISPLAY_LMAX = 16;
export const MAP_WIDTH = 384;
export const MAP_HEIGHT = 192;
export const OBSERVED_NSIDE = 64;
export const OBSERVED_LMAX = 48;

export const PLANCK_TT_EXTREMA = [
  { kind: "peak" as const, n: 1, ell: 220.6, D: 5733 },
  { kind: "trough" as const, n: 1, ell: 416.3, D: 1713 },
  { kind: "peak" as const, n: 2, ell: 538.1, D: 2586 },
  { kind: "trough" as const, n: 2, ell: 675.5, D: 1799 },
  { kind: "peak" as const, n: 3, ell: 809.8, D: 2518 },
  { kind: "trough" as const, n: 3, ell: 1001.1, D: 1049 },
  { kind: "peak" as const, n: 4, ell: 1147.8, D: 1227 },
  { kind: "trough" as const, n: 4, ell: 1290.0, D: 747 },
  { kind: "peak" as const, n: 5, ell: 1446.8, D: 799 },
  { kind: "trough" as const, n: 5, ell: 1623.8, D: 399 },
  { kind: "peak" as const, n: 6, ell: 1779, D: 378 },
  { kind: "trough" as const, n: 6, ell: 1919, D: 249 },
  { kind: "peak" as const, n: 7, ell: 2075, D: 227 },
  { kind: "trough" as const, n: 7, ell: 2241, D: 120 },
];

/** Low-ℓ Sachs–Wolfe anchors so the interpolant has a plateau (typical ΛCDM shape, not a Planck dump). */
export const SPECTRUM_ANCHORS = [
  { ell: 2, D: 280 },
  { ell: 8, D: 880 },
  { ell: 20, D: 1050 },
  { ell: 40, D: 1120 },
  { ell: 80, D: 2100 },
  { ell: 140, D: 4200 },
  ...PLANCK_TT_EXTREMA.map((e) => ({ ell: e.ell, D: e.D })),
  { ell: 2500, D: 40 },
];

export const CREDITS = {
  peaks: "Planck Collaboration 2020, A&A 641, A5 — COM_PowerSpect_CMB-TT (PR3)",
  theory: "Planck 2018 base-ΛCDM TT (plikHM+TTTEEE+lowl+lowE+lensing)",
  sky: "WMAP 9-year ILC — Bennett et al. 2013, ApJS 208, 20 (Nside=512 nested, downgraded to 64)",
  temperature: "Fixsen 2009, ApJ 707, 916 — T₀ = 2.72548 ± 0.00057 K",
  recombination: "z⋆ ≈ 1090, t ≈ 380 kyr — Planck 2018 cosmology",
};
