import { ang2pix_nest } from "@hscmap/healpix";
import { MAP_HEIGHT, MAP_WIDTH } from "./constants";
import { normalizedLegendre } from "./harmonics";

export type SkyManifest = {
  product: string;
  citation: string;
  url: string;
  coordinate: string;
  ordering: string;
  nsideNative: number;
  nside: number;
  npix: number;
  units: string;
  monopoleSubtracted_uK: number;
  rms_uK: number;
  min_uK: number;
  max_uK: number;
  eq: { width: number; height: number; file: string };
  healpix: string;
  alm: string;
  lmax: number;
  beamNote: string;
};

export type SpectrumManifest = {
  product: string;
  citation: string;
  full: string;
  binned: string;
  theory: string;
  fullNote: string;
  D2_planck: { ell: number; D: number; errLo: number; errHi: number };
  D2_map: { ell: number; D: number; C: number };
};

export type CmbManifest = {
  sky: SkyManifest;
  spectrum: SpectrumManifest;
  claim: string;
  notIncluded: string;
};

export type Alm = {
  lmax: number;
  a0: number[];
  ac: number[][];
  as: number[][];
  Dl: { ell: number; D: number; C: number }[];
};

export type PlanckFull = { ell: number; D: number; errLo: number; errHi: number };
export type PlanckBinned = PlanckFull & { bestFit: number };
export type TheoryPt = { ell: number; D: number };

export type CmbAssets = {
  manifest: CmbManifest;
  field: Float32Array;
  healpix: Float32Array;
  alm: Alm;
  full: PlanckFull[];
  binned: PlanckBinned[];
  theory: TheoryPt[];
};

const BASE = "/data/cmb";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`CMB asset ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchF32(path: string): Promise<Float32Array> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`CMB asset ${path}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Float32Array(buf);
}

let pending: Promise<CmbAssets> | null = null;

export function loadCmbAssets(): Promise<CmbAssets> {
  if (!pending) pending = loadAll();
  return pending;
}

async function loadAll(): Promise<CmbAssets> {
  const manifest = await fetchJson<CmbManifest>("manifest.json");
  const [field, healpix, alm, full, binned, theory] = await Promise.all([
    fetchF32(manifest.sky.eq.file),
    fetchF32(manifest.sky.healpix),
    fetchJson<Alm>(manifest.sky.alm),
    fetchJson<PlanckFull[]>(manifest.spectrum.full),
    fetchJson<PlanckBinned[]>(manifest.spectrum.binned),
    fetchJson<TheoryPt[]>(manifest.spectrum.theory),
  ]);
  return { manifest, field, healpix, alm, full, binned, theory };
}

export function coeffOf(alm: Alm, l: number, m: number, kind: "c" | "s"): number {
  if (l < 0 || l > alm.lmax) return 0;
  if (m === 0) return alm.a0[l] ?? 0;
  if (kind === "s") return alm.as[l]?.[m] ?? 0;
  return alm.ac[l]?.[m] ?? 0;
}

/** Blend the observed map toward the measured a_ℓm Y_ℓm contribution (μK). */
export function blendObservedMode(
  field: Float32Array,
  width: number,
  height: number,
  isolate: { l: number; m: number; kind: "c" | "s" },
  mix: number,
  alm: Alm,
): Float32Array {
  if (mix <= 0.002) return field;
  const { l, m, kind } = isolate;
  if (l < 2 || l > alm.lmax) return field;
  const a = coeffOf(alm, l, m, kind);
  const out = new Float32Array(field.length);
  const sqrt2 = Math.SQRT2;
  const blend = Math.min(1, Math.max(0, mix));

  for (let iy = 0; iy < height; iy++) {
    const theta = (Math.PI * (iy + 0.5)) / height;
    const x = Math.cos(theta);
    const P = normalizedLegendre(l, x);
    const n = P[l][m];
    for (let ix = 0; ix < width; ix++) {
      const phi = (2 * Math.PI * (ix + 0.5)) / width;
      let y = n;
      if (m > 0) {
        const trig = kind === "s" ? Math.sin(m * phi) : Math.cos(m * phi);
        y = sqrt2 * n * trig;
      }
      const idx = iy * width + ix;
      out[idx] = field[idx] * (1 - blend) + a * y * blend;
    }
  }
  return out;
}

export function probeEquirect(field: Float32Array, theta: number, phi: number): number {
  const w = MAP_WIDTH;
  const h = MAP_HEIGHT;
  const u = ((phi / (2 * Math.PI)) % 1 + 1) % 1;
  const v = Math.min(0.999, Math.max(0, theta / Math.PI));
  const ix = Math.min(w - 1, Math.floor(u * w));
  const iy = Math.min(h - 1, Math.floor(v * h));
  return field[iy * w + ix] ?? 0;
}

export function probeHealpix(healpix: Float32Array, nside: number, theta: number, phi: number): number {
  const ipix = ang2pix_nest(nside, theta, phi);
  return healpix[ipix] ?? 0;
}
