import { mulberry32 } from "../cmb/rng.ts";
import {
  amplification,
  c,
  cabs,
  csub,
  matEye,
  matFrob,
  matInv,
  matMul,
  matVec,
  stereoFromSphere,
  type C,
  type Mat2,
} from "./smith.ts";

export type Vec3 = { x: number; y: number; z: number };

export type SheafNode = {
  id: number;
  p: Vec3;
  stereo: C;
  gamma: C;
  amp: number;
  mag: number;
};

export type SheafEdge = {
  u: number;
  v: number;
  T: Mat2;
};

export type HorizonFlags = {
  localCollapse: boolean;
  globalPersist: boolean;
  nearKernel: boolean;
  boundary: boolean;
  onset: boolean;
};

export type HorizonReport = {
  nodes: SheafNode[];
  edges: SheafEdge[];
  evals: number[];
  lambdaMin: number;
  kTau: number;
  tau: number;
  holonomyFrob: number;
  holonomyLoop: number[];
  iLoc: number;
  iSheaf: number;
  meanMag: number;
  maxAmp: number;
  maxAmpId: number;
  dimKer: number;
  flags: HorizonFlags;
  state: "stable" | "stressed" | "horizon" | "incoherent";
  note: string;
};

const PHI = (1 + Math.sqrt(5)) / 2;
const STALK = 4;

/** Unit icosahedron vertices = HEALPix Nside=1 pixel centres. */
export function icosahedron(): Vec3[] {
  const raw: [number, number, number][] = [
    [0, 1, PHI],
    [0, -1, PHI],
    [0, 1, -PHI],
    [0, -1, -PHI],
    [1, PHI, 0],
    [-1, PHI, 0],
    [1, -PHI, 0],
    [-1, -PHI, 0],
    [PHI, 0, 1],
    [-PHI, 0, 1],
    [PHI, 0, -1],
    [-PHI, 0, -1],
  ];
  return raw.map(([x, y, z]) => {
    const n = Math.hypot(x, y, z);
    return { x: x / n, y: y / n, z: z / n };
  });
}

function dist(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function icosaEdges(verts: Vec3[]): [number, number][] {
  const n = verts.length;
  let min = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = dist(verts[i], verts[j]);
      if (d < min) min = d;
    }
  }
  const cut = min * 1.12;
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (dist(verts[i], verts[j]) <= cut) edges.push([i, j]);
    }
  }
  return edges;
}

/** A triangular face incident on vertex 0. */
export function faceLoop(edges: [number, number][]): number[] {
  const adj: number[][] = Array.from({ length: 12 }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  for (const a of adj[0]) {
    for (const b of adj[0]) {
      if (b <= a) continue;
      if (adj[a].includes(b)) return [0, a, b, 0];
    }
  }
  return [0, edges[0]?.[1] ?? 1, 0];
}

function trans(delta: C): Mat2 {
  return { a: c(1), b: delta, c: c(0), d: c(1) };
}

function su2(theta: number, psi: number): Mat2 {
  const co = Math.cos(theta);
  const si = Math.sin(theta);
  const e = { re: Math.cos(psi) * si, im: Math.sin(psi) * si };
  return {
    a: c(co),
    b: e,
    c: { re: -e.re, im: e.im },
    d: c(co),
  };
}

/**
 * Port Γ on the Smith disk. Phase follows azimuth; radius grows toward the
 * north, so southern patches sit nearer the match point.
 */
export function placeGamma(p: Vec3, mismatch: number): C {
  const m = Math.max(0, Math.min(0.97, mismatch));
  const phase = Math.atan2(p.y, p.x);
  const south = (1 - p.z) * 0.5;
  const r = m * (0.82 + 0.18 * south);
  return { re: r * Math.cos(phase), im: r * Math.sin(phase) };
}

function applyMatReal(T: Mat2, src: Float64Array, dst: Float64Array) {
  const z: C = { re: src[0], im: src[1] };
  const w: C = { re: src[2], im: src[3] };
  const [zp, wp] = matVec(T, z, w);
  dst[0] = zp.re;
  dst[1] = zp.im;
  dst[2] = wp.re;
  dst[3] = wp.im;
}

function dot4(a: Float64Array, b: Float64Array) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/** L = δ*δ on ℝ^{4V}. Edge term ‖x_v − T x_u‖². */
export function sheafLaplacian(V: number, edges: SheafEdge[]): Float64Array {
  const n = V * STALK;
  const L = new Float64Array(n * n);
  const ea = new Float64Array(STALK);
  const eb = new Float64Array(STALK);
  const Ta = new Float64Array(STALK);
  const Tb = new Float64Array(STALK);
  for (const e of edges) {
    const u0 = e.u * STALK;
    const v0 = e.v * STALK;
    for (let a = 0; a < STALK; a++) {
      for (let b = 0; b < STALK; b++) {
        ea.fill(0);
        eb.fill(0);
        ea[a] = 1;
        eb[b] = 1;
        applyMatReal(e.T, ea, Ta);
        applyMatReal(e.T, eb, Tb);
        if (a === b) L[(v0 + a) * n + (v0 + b)] += 1;
        L[(u0 + a) * n + (u0 + b)] += dot4(Ta, Tb);
        L[(v0 + a) * n + (u0 + b)] -= Tb[a];
        L[(u0 + a) * n + (v0 + b)] -= Ta[b];
      }
    }
  }
  return L;
}

export function sectionEnergy(L: Float64Array, x: Float64Array, n: number) {
  let s = 0;
  for (let i = 0; i < n; i++) {
    let Li = 0;
    for (let j = 0; j < n; j++) Li += L[i * n + j] * x[j];
    s += x[i] * Li;
  }
  return s;
}

/** Cyclic Jacobi. Eigenvalues ascending; evecs as column j of the packed matrix. */
export function jacobiSymmetric(
  A: Float64Array,
  n: number,
  sweeps = 12,
): { evals: number[]; evecs: Float64Array } {
  const M = A.slice();
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let s = 0; s < sweeps; s++) {
    let off = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = M[p * n + q];
        off += apq * apq;
        if (Math.abs(apq) < 1e-14) continue;
        const app = M[p * n + p];
        const aqq = M[q * n + q];
        const tau = (aqq - app) / (2 * apq);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const co = 1 / Math.sqrt(1 + t * t);
        const si = t * co;
        for (let k = 0; k < n; k++) {
          if (k === p || k === q) continue;
          const mkp = M[k * n + p];
          const mkq = M[k * n + q];
          const nk = co * mkp - si * mkq;
          const nq = si * mkp + co * mkq;
          M[k * n + p] = nk;
          M[p * n + k] = nk;
          M[k * n + q] = nq;
          M[q * n + k] = nq;
        }
        M[p * n + p] = co * co * app - 2 * si * co * apq + si * si * aqq;
        M[q * n + q] = si * si * app + 2 * si * co * apq + co * co * aqq;
        M[p * n + q] = 0;
        M[q * n + p] = 0;
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p];
          const vkq = V[k * n + q];
          V[k * n + p] = co * vkp - si * vkq;
          V[k * n + q] = si * vkp + co * vkq;
        }
      }
    }
    if (off < 1e-20) break;
  }
  const idx = Array.from({ length: n }, (_, i) => i);
  idx.sort((i, j) => M[i * n + i] - M[j * n + j]);
  const evals = idx.map((i) => M[i * n + i]);
  const evecs = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    const src = idx[j];
    for (let i = 0; i < n; i++) evecs[i * n + j] = V[i * n + src];
  }
  return { evals, evecs };
}

function bitsFromSnr(snr: number) {
  if (!Number.isFinite(snr) || snr > 1e8) return 8;
  return Math.min(8, Math.log2(1 + Math.max(0, snr)));
}

export const HORIZON_EPS1 = 0.35;
export const HORIZON_EPS2 = 0.55;
export const HORIZON_RHO = 0.72;

export function runHorizon(opts: {
  mismatch: number;
  scramble: number;
  twist: number;
  tau: number;
  seed: number;
}): HorizonReport {
  const verts = icosahedron();
  const pairs = icosaEdges(verts);
  const mismatch = Math.max(0, Math.min(0.97, opts.mismatch));
  const scramble = Math.max(0, opts.scramble);
  const twist = Math.max(0, Math.min(1.2, opts.twist));
  const tau = Math.max(1e-4, opts.tau);
  const rng = mulberry32(opts.seed ^ 0x51eaf);

  const nodes: SheafNode[] = verts.map((p, id) => {
    const stereo = stereoFromSphere(p.x, p.y, p.z);
    const gamma = placeGamma(p, mismatch);
    return {
      id,
      p,
      stereo,
      gamma,
      amp: amplification(gamma),
      mag: cabs(gamma),
    };
  });

  const edges: SheafEdge[] = pairs.map(([u, v], i) => {
    const delta = csub(nodes[v].gamma, nodes[u].gamma);
    const T0 = trans(delta);
    const theta = twist * (0.22 + 0.18 * Math.sin(i * 1.7));
    const psi = (i * 2.399) % (Math.PI * 2);
    const T = twist > 1e-8 ? matMul(su2(theta, psi), T0) : T0;
    return { u, v, T };
  });

  const L = sheafLaplacian(nodes.length, edges);
  const n = nodes.length * STALK;
  const { evals, evecs } = jacobiSymmetric(L, n);
  const lambdaMin = Math.max(0, evals[0]);
  const kTau = evals.filter((l) => l <= tau).length;
  const dimKer = evals.filter((l) => l <= 1e-6).length;

  const loop = faceLoop(pairs);
  let H: Mat2 = matEye();
  for (let i = 0; i < loop.length - 1; i++) {
    const a = loop[i];
    const b = loop[i + 1];
    const e = edges.find((ed) => (ed.u === a && ed.v === b) || (ed.u === b && ed.v === a));
    if (!e) continue;
    if (e.u === a) H = matMul(e.T, H);
    else H = matMul(matInv(e.T), H);
  }
  const holonomyFrob = matFrob({
    a: csub(H.a, c(1)),
    b: H.b,
    c: H.c,
    d: csub(H.d, c(1)),
  });

  const planted = new Float64Array(n);
  for (let v = 0; v < nodes.length; v++) {
    planted[v * STALK] = nodes[v].gamma.re;
    planted[v * STALK + 1] = nodes[v].gamma.im;
    planted[v * STALK + 2] = 1;
    planted[v * STALK + 3] = 0;
  }

  const k = Math.max(4, Math.min(kTau, n));
  let eLoc = 0;
  let eSheaf = 0;
  let eSig = 0;
  for (let v = 0; v < nodes.length; v++) {
    const pr = planted[v * STALK];
    const pi = planted[v * STALK + 1];
    eSig += pr * pr + pi * pi;
  }
  const draws = 8;
  for (let d = 0; d < draws; d++) {
    const noisy = planted.slice();
    for (let v = 0; v < nodes.length; v++) {
      noisy[v * STALK] += scramble * (rng() * 2 - 1);
      noisy[v * STALK + 1] += scramble * (rng() * 2 - 1);
    }
    const proj = new Float64Array(n);
    for (let j = 0; j < k; j++) {
      let coef = 0;
      for (let i = 0; i < n; i++) coef += evecs[i * n + j] * noisy[i];
      for (let i = 0; i < n; i++) proj[i] += coef * evecs[i * n + j];
    }
    for (let v = 0; v < nodes.length; v++) {
      const pr = planted[v * STALK];
      const pi = planted[v * STALK + 1];
      const lr = noisy[v * STALK] - pr;
      const li = noisy[v * STALK + 1] - pi;
      eLoc += lr * lr + li * li;
      const sr = proj[v * STALK] - pr;
      const si = proj[v * STALK + 1] - pi;
      eSheaf += sr * sr + si * si;
    }
  }
  eLoc /= draws;
  eSheaf /= draws;
  const iLoc = bitsFromSnr(eSig / Math.max(eLoc, 1e-12));
  const iSheaf = bitsFromSnr(eSig / Math.max(eSheaf, 1e-12));

  let maxAmp = 0;
  let maxAmpId = 0;
  let meanMag = 0;
  for (const nd of nodes) {
    meanMag += nd.mag;
    if (nd.amp > maxAmp) {
      maxAmp = nd.amp;
      maxAmpId = nd.id;
    }
  }
  meanMag /= nodes.length;

  const flags: HorizonFlags = {
    localCollapse: iLoc <= HORIZON_EPS1,
    globalPersist: iSheaf >= HORIZON_EPS2,
    nearKernel: evals[Math.min(3, evals.length - 1)] <= tau,
    boundary: meanMag >= HORIZON_RHO,
    onset: false,
  };
  flags.onset = flags.localCollapse && flags.globalPersist && flags.nearKernel && flags.boundary;

  let state: HorizonReport["state"] = "stable";
  if (flags.onset) state = "horizon";
  else if (!flags.nearKernel && flags.localCollapse) state = "incoherent";
  else if (flags.boundary || maxAmp > 40) state = "stressed";

  return {
    nodes,
    edges,
    evals,
    lambdaMin,
    kTau,
    tau,
    holonomyFrob,
    holonomyLoop: loop,
    iLoc,
    iSheaf,
    meanMag,
    maxAmp,
    maxAmpId,
    dimKer,
    flags,
    state,
    note: "Γ = (z−1)/(z+1), A = 2/|1−Γ|², L = δ*δ on the HEALPix Nside=1 1-skeleton. Digital Horizon is a criterion on this sheaf, not a CMB measurement.",
  };
}
