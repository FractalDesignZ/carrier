import { create } from "zustand";
import type { FeedId } from "@/lib/geom/series";
import type { FeedMap } from "@/lib/geom/transform";
import type { PruneScenario } from "@/lib/geom/prune";

export type EngineMode = "surface" | "multipoles" | "acoustic" | "matrix" | "feed" | "prune" | "horizon" | "screen";
export type ClaimKind = "physics" | "analogy" | "contested";
export type SkySource = "observed" | "gaussian";
export type { FeedMap, PruneScenario };

export const MODE_META: Record<
  EngineMode,
  { label: string; claim: ClaimKind; kicker: string }
> = {
  surface: { label: "Surface", claim: "physics", kicker: "Last-scattering sphere" },
  multipoles: { label: "Multipoles", claim: "physics", kicker: "Y_ℓm isolation" },
  acoustic: { label: "Acoustic", claim: "physics", kicker: "Planck TT + map D_ℓ" },
  matrix: { label: "Matrix", claim: "analogy", kicker: "Prime spiral analog" },
  feed: { label: "Feed", claim: "physics", kicker: "1D → lattice" },
  prune: { label: "Prune", claim: "physics", kicker: "α-β geometric" },
  horizon: { label: "Horizon", claim: "physics", kicker: "Smith + sheaf L" },
  screen: { label: "Screen", claim: "contested", kicker: "Holographic overlay" },
};

type EngineState = {
  mode: EngineMode;
  entered: boolean;
  source: SkySource;
  ell: number;
  m: number;
  kind: "c" | "s";
  lmax: number;
  seed: number;
  baryon: number;
  grain: number;
  isolateMix: number;
  interior: boolean;
  holographic: boolean;
  coherence: boolean;
  reducedMotion: boolean;
  lookTheta: number;
  lookPhi: number;
  feedId: FeedId;
  feedMap: FeedMap;
  feedPaste: string;
  pruneScenario: PruneScenario;
  pruneDepth: number;
  mismatch: number;
  scramble: number;
  twist: number;
  tau: number;
  setMode: (mode: EngineMode) => void;
  setEntered: (v: boolean) => void;
  setSource: (source: SkySource) => void;
  setEll: (ell: number) => void;
  setM: (m: number) => void;
  setKind: (kind: "c" | "s") => void;
  setLmax: (n: number) => void;
  reshuffle: () => void;
  setBaryon: (n: number) => void;
  setGrain: (n: number) => void;
  setIsolateMix: (n: number) => void;
  setInterior: (v: boolean) => void;
  setHolographic: (v: boolean) => void;
  setCoherence: (v: boolean) => void;
  setLook: (theta: number, phi: number) => void;
  setFeedId: (id: FeedId) => void;
  setFeedMap: (map: FeedMap) => void;
  setFeedPaste: (text: string) => void;
  setPruneScenario: (s: PruneScenario) => void;
  setPruneDepth: (n: number) => void;
  setMismatch: (n: number) => void;
  setScramble: (n: number) => void;
  setTwist: (n: number) => void;
  setTau: (n: number) => void;
  driveHorizon: () => void;
};

export const useEngine = create<EngineState>((set, get) => ({
  mode: "surface",
  entered: false,
  source: "observed",
  ell: 2,
  m: 2,
  kind: "c",
  lmax: 16,
  seed: 2206,
  baryon: 1,
  grain: 0.85,
  isolateMix: 0,
  interior: false,
  holographic: false,
  coherence: false,
  reducedMotion: false,
  lookTheta: Math.PI / 2,
  lookPhi: 0,
  feedId: "sensor",
  feedMap: "phase",
  feedPaste: "",
  pruneScenario: "adversary",
  pruneDepth: 5,
  mismatch: 0.42,
  scramble: 0.3,
  twist: 0,
  tau: 0.08,
  setMode: (mode) => {
    set({
      mode,
      isolateMix: mode === "multipoles" ? Math.max(get().isolateMix, 0.85) : 0,
      holographic: mode === "screen" || get().holographic,
    });
  },
  setEntered: (entered) => set({ entered }),
  setSource: (source) => {
    const ell = get().ell;
    set({
      source,
      isolateMix: 0,
      lmax: source === "gaussian" ? Math.min(get().lmax, 24) : get().lmax,
      m: source === "observed" && ell === 2 && get().m === 0 ? 2 : get().m,
    });
  },
  setEll: (ell) => {
    const cap = get().source === "observed" ? 48 : Math.min(get().lmax, 28);
    const e = Math.max(2, Math.min(cap, Math.round(ell)));
    const m = Math.min(get().m, e);
    set({ ell: e, m });
  },
  setM: (m) => {
    const mm = Math.max(0, Math.min(get().ell, Math.round(m)));
    set({ m: mm });
  },
  setKind: (kind) => set({ kind }),
  setLmax: (n) => set({ lmax: Math.max(4, Math.min(24, Math.round(n))) }),
  reshuffle: () => set({ seed: (get().seed * 1103515245 + 12345) >>> 0 }),
  setBaryon: (baryon) => set({ baryon }),
  setGrain: (grain) => set({ grain }),
  setIsolateMix: (isolateMix) => set({ isolateMix }),
  setInterior: (interior) => set({ interior }),
  setHolographic: (holographic) => set({ holographic }),
  setCoherence: (coherence) => set({ coherence }),
  setLook: (lookTheta, lookPhi) => set({ lookTheta, lookPhi }),
  setFeedId: (feedId) => {
    const map: FeedMap =
      feedId === "sensor" || feedId === "traffic" || feedId === "modular"
        ? "phase"
        : feedId === "market"
          ? "delay"
          : get().feedMap;
    set({ feedId, feedMap: map });
  },
  setFeedMap: (feedMap) => set({ feedMap }),
  setFeedPaste: (feedPaste) => set({ feedPaste, feedId: "custom" }),
  setPruneScenario: (pruneScenario) => set({ pruneScenario }),
  setPruneDepth: (n) => set({ pruneDepth: Math.max(2, Math.min(6, Math.round(n))) }),
  setMismatch: (mismatch) => set({ mismatch }),
  setScramble: (scramble) => set({ scramble }),
  setTwist: (twist) => set({ twist }),
  setTau: (tau) => set({ tau }),
  driveHorizon: () => set({ mismatch: 0.88, scramble: 3.2, twist: 0, tau: 0.08 }),
}));
