import { mulberry32 } from "@/lib/cmb/rng";
import type { Series } from "./transform";

export type FeedId = "market" | "modular" | "sensor" | "traffic" | "custom";

type MarketFile = {
  name: string;
  citation: string;
  note: string;
  unit: string;
  r: number[];
  x: number[];
  t: string[];
};

export async function loadMarket(): Promise<Series> {
  const res = await fetch("/data/geom/sp500.json");
  if (!res.ok) throw new Error("S&P 500 sample missing");
  const j = (await res.json()) as MarketFile;
  return {
    id: "market",
    name: j.name,
    claim: "physics",
    unit: "log-return",
    citation: j.citation,
    note: "Monthly Shiller S&P 500, 1926–2026. Channel is log-return. Polar will not make prime rays — that is not a theorem about markets.",
    channel: j.r.slice(1),
    labels: j.t.slice(1),
  };
}

/** Quadratic residues of n² mod 41 — planted modular lattice. */
export function makeModular(n = 2400): Series {
  const channel = new Array(n);
  for (let i = 0; i < n; i++) channel[i] = ((i + 1) * (i + 1)) % 41;
  return {
    id: "modular",
    name: "Quadratic residues n² mod 41",
    claim: "analogy",
    unit: "residue",
    citation: "Control lattice — not a physical instrument",
    note: "This is the positive control. Sacks/Ulam must show modular rays here. If a market series looks like this, that is a claim; if it does not, do not force it.",
    channel,
    planted: { kind: "n² mod 41", detail: "period-41 residue classes", period: 41 },
  };
}

/** Sensor log: 12-sample rotation + 24-sample envelope + AR noise + a stuck burst. */
export function makeSensor(n = 2048, seed = 2206): Series {
  const rng = mulberry32(seed);
  const channel = new Array(n);
  let ar = 0;
  for (let t = 0; t < n; t++) {
    ar = 0.72 * ar + (rng() - 0.5) * 0.22;
    const rot = 0.55 * Math.sin((2 * Math.PI * t) / 12);
    const env = 0.22 * Math.sin((2 * Math.PI * t) / 24);
    let v = rot + env + ar;
    if (t >= 1480 && t < 1560) v += 2.4;
    channel[t] = v;
  }
  return {
    id: "sensor",
    name: "Rotation + burst sensor",
    claim: "physics",
    unit: "σ",
    citation: "Synthetic, planted periods 12 and 24, burst at t=1480–1560",
    note: "DFT should recover k ≈ N/12 and N/24. Residual z>3.5 marks the burst. Not field data.",
    channel,
    planted: { kind: "periods 12, 24 + burst", detail: "t=1480–1560", period: 12 },
  };
}

/** Request-rate: diurnal sinusoid, Poisson-like jitter, a flood window. */
export function makeTraffic(n = 1440, seed = 8080): Series {
  const rng = mulberry32(seed);
  const channel = new Array(n);
  for (let t = 0; t < n; t++) {
    const diurnal = 48 + 22 * Math.sin((2 * Math.PI * t) / 288 - 0.4);
    let v = diurnal + (rng() - 0.5) * 8;
    if (t >= 900 && t < 960) v += 70 + rng() * 20;
    channel[t] = Math.max(0, v);
  }
  return {
    id: "traffic",
    name: "Request rate (5-min)",
    claim: "physics",
    unit: "req",
    citation: "Synthetic 5 days × 288 bins, flood at t=900–960",
    note: "Diurnal period 288 bins. Flood is a residual anomaly, not a new eigenmode of the quiet day.",
    channel,
    planted: { kind: "diurnal 288 + flood", detail: "t=900–960", period: 288 },
  };
}

export function parseNumericColumn(text: string): number[] {
  const out: number[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/[,;\t ]+/);
    let v: number | null = null;
    for (let i = parts.length - 1; i >= 0; i--) {
      const n = Number(parts[i]);
      if (Number.isFinite(n)) {
        v = n;
        break;
      }
    }
    if (v != null) out.push(v);
  }
  return out.slice(0, 4000);
}

export function seriesFromCustom(channel: number[]): Series {
  return {
    id: "custom",
    name: "Pasted column",
    claim: "physics",
    unit: "x",
    citation: "User-supplied 1D series, parsed in-browser",
    note: "Last numeric field on each line. Header rows skipped if non-numeric.",
    channel,
  };
}
