import { DISPLAY_LMAX, MAP_HEIGHT, MAP_WIDTH } from "./constants";
import { gauss, mulberry32 } from "./rng";
import { normalizedLegendre } from "./harmonics";
import { ClFromDl } from "./spectrum";
import { sphereGrain } from "./noise";

export type Coeffs = {
  a0: number[][]; // [l][0]
  ac: number[][]; // [l][m]
  as: number[][]; // [l][m]
  lmax: number;
};

export function sampleCoeffs(lmax: number, seed: number, baryon: number): Coeffs {
  const rng = mulberry32(seed);
  const a0: number[][] = [];
  const ac: number[][] = [];
  const as: number[][] = [];
  for (let l = 0; l <= lmax; l++) {
    a0[l] = [0];
    ac[l] = new Array(l + 1).fill(0);
    as[l] = new Array(l + 1).fill(0);
    if (l < 2) continue;
    const s = Math.sqrt(Math.max(0, ClFromDl(l, baryon)));
    a0[l][0] = gauss(rng) * s;
    for (let m = 1; m <= l; m++) {
      ac[l][m] = gauss(rng) * s;
      as[l][m] = gauss(rng) * s;
    }
  }
  return { a0, ac, as, lmax };
}

export function synthesizeField(
  coeffs: Coeffs,
  width = MAP_WIDTH,
  height = MAP_HEIGHT,
  grain = 1,
  grainSeed = 1,
  isolate?: { l: number; m: number; kind: "c" | "s" } | null,
  isolateMix = 0,
): Float32Array {
  const { lmax } = coeffs;
  const field = new Float32Array(width * height);
  const sqrt2 = Math.SQRT2;

  for (let iy = 0; iy < height; iy++) {
    const theta = (Math.PI * (iy + 0.5)) / height;
    const x = Math.cos(theta);
    const st = Math.sin(theta);
    const P = normalizedLegendre(lmax, x);

    const cosM: number[] = new Array(lmax + 1);
    const sinM: number[] = new Array(lmax + 1);

    for (let ix = 0; ix < width; ix++) {
      const phi = (2 * Math.PI * (ix + 0.5)) / width;
      cosM[0] = 1;
      sinM[0] = 0;
      const c1 = Math.cos(phi);
      const s1 = Math.sin(phi);
      cosM[1] = c1;
      sinM[1] = s1;
      for (let m = 2; m <= lmax; m++) {
        cosM[m] = c1 * cosM[m - 1] - s1 * sinM[m - 1];
        sinM[m] = s1 * cosM[m - 1] + c1 * sinM[m - 1];
      }

      let t = 0;
      for (let l = 2; l <= lmax; l++) {
        t += coeffs.a0[l][0] * P[l][0];
        for (let m = 1; m <= l; m++) {
          const n = P[l][m] * sqrt2;
          t += coeffs.ac[l][m] * n * cosM[m] + coeffs.as[l][m] * n * sinM[m];
        }
      }

      if (grain > 0) {
        const px = st * Math.cos(phi);
        const py = x;
        const pz = st * Math.sin(phi);
        t += sphereGrain(px, py, pz, grainSeed, 95 * grain);
      }

      if (isolate && isolateMix > 0 && isolate.l <= lmax) {
        const n = P[isolate.l][isolate.m];
        let y = n;
        if (isolate.m > 0) {
          const trig = isolate.kind === "s" ? sinM[isolate.m] : cosM[isolate.m];
          y = sqrt2 * n * trig;
        }
        const isolated = y * 180;
        t = t * (1 - isolateMix) + isolated * isolateMix;
      }

      field[iy * width + ix] = t;
    }
  }
  return field;
}

export type FieldStats = { min: number; max: number; mean: number; rms: number };

export function fieldStats(field: Float32Array): FieldStats {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sum2 = 0;
  for (let i = 0; i < field.length; i++) {
    const v = field[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    sum2 += v * v;
  }
  const n = field.length;
  const mean = sum / n;
  const rms = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  return { min, max, mean, rms };
}

export const DEFAULT_LMAX = DISPLAY_LMAX;
