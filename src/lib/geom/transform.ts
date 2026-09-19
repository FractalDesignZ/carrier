import { sacksCoord, ulamCoord } from "@/lib/cmb/primes";

export type FeedMap = "sacks" | "ulam" | "delay" | "phase";

export type Series = {
  id: string;
  name: string;
  claim: "physics" | "analogy";
  unit: string;
  note: string;
  citation: string;
  channel: number[];
  labels?: string[];
  planted?: { kind: string; detail: string; period?: number };
};

export function zscore(x: number[]): number[] {
  const n = x.length || 1;
  let m = 0;
  for (const v of x) m += v;
  m /= n;
  let s = 0;
  for (const v of x) s += (v - m) * (v - m);
  const sd = Math.sqrt(s / n) || 1;
  return x.map((v) => (v - m) / sd);
}

export function periodogram(x: number[]): { k: number; p: number }[] {
  const n = x.length;
  if (n < 8) return [];
  const z = zscore(x);
  const out: { k: number; p: number }[] = [];
  const kmax = Math.floor(n / 2);
  for (let k = 1; k < kmax; k++) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      const h = 0.5 * (1 - Math.cos((2 * Math.PI * t) / (n - 1)));
      re += z[t] * h * Math.cos(w * t);
      im -= z[t] * h * Math.sin(w * t);
    }
    out.push({ k, p: (re * re + im * im) / n });
  }
  return out;
}

export function peakPeriod(pg: { k: number; p: number }[], n: number) {
  if (!pg.length) return null;
  let best = pg[0];
  for (const q of pg) if (q.p > best.p) best = q;
  return { k: best.k, period: n / best.k, power: best.p };
}

export function polarPoint(n: number, kind: "sacks" | "ulam") {
  return kind === "ulam" ? ulamCoord(n) : sacksCoord(n);
}

/** Archimedean phase lattice: θ = 2π n / T, r grows with index. Period-T series become T arms. */
export function phasePoint(index0: number, n: number, period: number) {
  const T = Math.max(2, period);
  const theta = (2 * Math.PI * index0) / T;
  const r = 0.08 + 0.92 * ((index0 + 1) / Math.max(1, n));
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

export function latticePoint(index1: number, n: number, kind: FeedMap, period: number) {
  if (kind === "ulam") return ulamCoord(index1);
  if (kind === "sacks") return sacksCoord(index1);
  return phasePoint(index1 - 1, n, period);
}

export function latticeSpan(n: number, kind: FeedMap) {
  if (kind === "ulam") return Math.ceil((Math.sqrt(n) - 1) / 2) + 2;
  if (kind === "sacks") return Math.sqrt(n) + 2;
  return 1.12;
}

/** Delay-embedded correlation (M × M) of a standardized series. */
export function delayCorrelation(x: number[], dim: number, tau: number): number[][] {
  const z = zscore(x);
  const T = z.length - (dim - 1) * tau;
  const m = Math.min(dim, 24);
  const C: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  if (T < m + 4) return C;
  for (let i = 0; i < m; i++) {
    for (let j = i; j < m; j++) {
      let s = 0;
      for (let t = 0; t < T; t++) s += z[t + i * tau] * z[t + j * tau];
      const v = s / T;
      C[i][j] = v;
      C[j][i] = v;
    }
  }
  return C;
}

export function jacobiEigs(A: number[][]): number[] {
  const n = A.length;
  const M = A.map((r) => r.slice());
  for (let iter = 0; iter < 48; iter++) {
    let max = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = Math.abs(M[i][j]);
        if (a > max) {
          max = a;
          p = i;
          q = j;
        }
      }
    }
    if (max < 1e-12) break;
    const app = M[p][p];
    const aqq = M[q][q];
    const apq = M[p][q];
    const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    for (let k = 0; k < n; k++) {
      if (k === p || k === q) continue;
      const mkp = M[k][p];
      const mkq = M[k][q];
      M[k][p] = c * mkp - s * mkq;
      M[p][k] = M[k][p];
      M[k][q] = s * mkp + c * mkq;
      M[q][k] = M[k][q];
    }
    M[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    M[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    M[p][q] = 0;
    M[q][p] = 0;
  }
  return M.map((row, i) => row[i]).sort((a, b) => b - a);
}

export function mpEdge(q: number) {
  const s = Math.sqrt(Math.max(0, q));
  return { lo: (1 - s) ** 2, hi: (1 + s) ** 2 };
}

export type RmtReport = {
  eigs: number[];
  hi: number;
  outliers: number;
  coherent: number;
  q: number;
};

export function rmtReport(x: number[], dim = 20, tau = 1): RmtReport {
  const C = delayCorrelation(x, dim, tau);
  const eigs = jacobiEigs(C);
  const T = Math.max(1, x.length - (dim - 1) * tau);
  const q = dim / T;
  const { hi } = mpEdge(q);
  const trace = eigs.reduce((a, b) => a + b, 0) || 1;
  const outliers = eigs.filter((l) => l > hi * 1.05).length;
  const coherent = eigs.filter((l) => l > hi * 1.05).reduce((a, b) => a + b, 0) / trace;
  return { eigs, hi, outliers, coherent, q };
}

/** Reconstruct using the top-k DFT bins; residual flags local bursts. */
export function coherentResidual(x: number[], keep = 3): { recon: number[]; resid: number[]; burstIdx: number[] } {
  const n = x.length;
  const z = zscore(x);
  const pg = periodogram(x)
    .slice()
    .sort((a, b) => b.p - a.p)
    .slice(0, keep);
  const recon = new Array(n).fill(0);
  for (const { k } of pg) {
    let re = 0;
    let im = 0;
    const w = (2 * Math.PI * k) / n;
    for (let t = 0; t < n; t++) {
      re += z[t] * Math.cos(w * t);
      im -= z[t] * Math.sin(w * t);
    }
    re *= 2 / n;
    im *= 2 / n;
    for (let t = 0; t < n; t++) recon[t] += re * Math.cos(w * t) - im * Math.sin(w * t);
  }
  const resid = z.map((v, i) => v - recon[i]);
  const rs = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / n) || 1;
  const burstIdx: number[] = [];
  resid.forEach((v, i) => {
    if (Math.abs(v) > 3.5 * rs) burstIdx.push(i);
  });
  return { recon, resid, burstIdx };
}
