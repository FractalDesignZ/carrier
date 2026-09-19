import { mulberry32 } from "@/lib/cmb/rng";

export type PruneScenario = "adversary" | "supply" | "sensor";

export type TreeNode = {
  id: number;
  parent: number | null;
  ply: number;
  slot: number;
  kids: number;
  maximizing: boolean;
  value: number | null;
  pruned: boolean;
  cutoff: boolean;
  terminal: boolean;
  label: string;
  x: number;
  y: number;
  theta: number;
  a0: number;
  a1: number;
  pv: boolean;
};

export type PruneReport = {
  scenario: PruneScenario;
  depth: number;
  branching: number;
  fullNodes: number;
  visited: number;
  pruned: number;
  cutoffs: number;
  prunePct: number;
  rootValue: number;
  pv: string[];
  nodes: TreeNode[];
  horizonPly: number;
  note: string;
};

type State = { x: number; y: number; label: string; halt: boolean };

const META: Record<
  PruneScenario,
  { branching: number; maxStep: number; rootMax: boolean; note: string }
> = {
  adversary: {
    branching: 4,
    maxStep: 0.32,
    rootMax: true,
    note: "Zero-sum toy. Core attributes: material (x) and space (y). Move ordering is shallow eval; futility uses depth × max-step. Not a chess engine.",
  },
  supply: {
    branching: 3,
    maxStep: 0.38,
    rootMax: true,
    note: "Make / buy / delay. Utility = −(cost + 0.45·risk). A branch whose optimistic remaining cost cannot beat β is cut.",
  },
  sensor: {
    branching: 3,
    maxStep: 0.28,
    rootMax: true,
    note: "Wait / sample / halt. Halt is a terminal stop. Horizon is the first PV halt, or the leaf if the line never stops.",
  },
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function evaluate(scenario: PruneScenario, st: State, ply: number): number {
  if (scenario === "adversary") return 0.62 * st.x + 0.38 * st.y;
  if (scenario === "supply") return -(st.x + 0.45 * st.y);
  return st.y - 0.32 * Math.abs(st.x) - 0.035 * ply;
}

function catalog(scenario: PruneScenario, st: State, rng: () => number): State[] {
  const jitter = () => (rng() - 0.5) * 0.07;
  if (scenario === "adversary") {
    const moves = [
      { label: "center", dx: 0.05, dy: 0.17 },
      { label: "take", dx: 0.21, dy: -0.08 },
      { label: "castle", dx: -0.05, dy: 0.15 },
      { label: "push", dx: 0.11, dy: 0.05 },
    ];
    return moves.map((m) => ({
      x: clamp(st.x + m.dx + jitter(), -1.35, 1.35),
      y: clamp(st.y + m.dy + jitter(), -1.35, 1.35),
      label: m.label,
      halt: false,
    }));
  }
  if (scenario === "supply") {
    const moves = [
      { label: "make", dx: 0.16, dy: 0.07 },
      { label: "buy", dx: 0.22, dy: 0.03 },
      { label: "delay", dx: 0.07, dy: 0.15 },
    ];
    return moves.map((m) => ({
      x: clamp(st.x + m.dx + Math.abs(jitter()), 0, 2.4),
      y: clamp(st.y + m.dy + Math.abs(jitter()), 0, 2.2),
      label: m.label,
      halt: false,
    }));
  }
  return [
    {
      x: clamp(st.x + 0.03 + jitter(), -1.2, 1.2),
      y: clamp(st.y + 0.05 + Math.abs(jitter()), 0, 2),
      label: "wait",
      halt: false,
    },
    {
      x: clamp(st.x - 0.05 + jitter(), -1.2, 1.2),
      y: clamp(st.y + 0.18 + Math.abs(jitter()), 0, 2),
      label: "sample",
      halt: false,
    },
    {
      x: st.x,
      y: st.y,
      label: "halt",
      halt: true,
    },
  ];
}

function fullNodeCount(branching: number, depth: number) {
  if (branching <= 1) return depth + 1;
  return (branching ** (depth + 1) - 1) / (branching - 1);
}

export function runPrune(scenario: PruneScenario, depth: number, seed: number): PruneReport {
  const d = Math.max(2, Math.min(6, Math.round(depth)));
  const meta = META[scenario];
  const rng = mulberry32(seed ^ (scenario === "supply" ? 91 : scenario === "sensor" ? 17 : 3));
  const nodes: TreeNode[] = [];
  let nextId = 1;
  let visited = 0;
  let pruned = 0;
  let cutoffs = 0;

  const rootState: State =
    scenario === "supply"
      ? { x: 0.12, y: 0.08, label: "root", halt: false }
      : scenario === "sensor"
        ? { x: 0.2, y: 0.1, label: "root", halt: false }
        : { x: 0.08, y: 0.04, label: "root", halt: false };

  const search = (
    st: State,
    remain: number,
    ply: number,
    alpha0: number,
    beta0: number,
    maximizing: boolean,
    parent: number | null,
    slot: number,
    kids: number,
    a0: number,
    a1: number,
  ): number => {
    const id = nextId++;
    const node: TreeNode = {
      id,
      parent,
      ply,
      slot,
      kids,
      maximizing,
      value: null,
      pruned: false,
      cutoff: false,
      terminal: remain === 0 || st.halt,
      label: st.label,
      x: st.x,
      y: st.y,
      theta: 0.5 * (a0 + a1),
      a0,
      a1,
      pv: false,
    };
    nodes.push(node);
    visited += 1;

    if (node.terminal) {
      const v = evaluate(scenario, st, ply);
      node.value = v;
      return v;
    }

    const moves = catalog(scenario, st, rng);
    moves.sort((a, b) => {
      const ea = evaluate(scenario, a, ply + 1);
      const eb = evaluate(scenario, b, ply + 1);
      return maximizing ? eb - ea : ea - eb;
    });

    let alpha = alpha0;
    let beta = beta0;
    let best = maximizing ? -Infinity : Infinity;
    let cutoff = false;

    for (let i = 0; i < moves.length; i++) {
      const child = moves[i];
      const span = (a1 - a0) / moves.length;
      const c0 = a0 + i * span;
      const c1 = c0 + span;
      const shallow = evaluate(scenario, child, ply + 1);
      const bound = maximizing ? shallow + meta.maxStep * remain : shallow - meta.maxStep * remain;
      const futile = i > 0 && (maximizing ? bound <= alpha : bound >= beta);
      if (futile) {
        pruned += 1;
        nodes.push({
          id: nextId++,
          parent: id,
          ply: ply + 1,
          slot: i,
          kids: moves.length,
          maximizing: !maximizing,
          value: null,
          pruned: true,
          cutoff: false,
          terminal: true,
          label: child.label,
          x: child.x,
          y: child.y,
          theta: 0.5 * (c0 + c1),
          a0: c0,
          a1: c1,
          pv: false,
        });
        continue;
      }

      const val = search(child, remain - 1, ply + 1, alpha, beta, !maximizing, id, i, moves.length, c0, c1);

      if (maximizing) {
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (alpha >= beta) cutoff = true;
      } else {
        if (val < best) best = val;
        if (best < beta) beta = best;
        if (alpha >= beta) cutoff = true;
      }

      if (cutoff) {
        cutoffs += 1;
        for (let j = i + 1; j < moves.length; j++) {
          pruned += 1;
          const s0 = a0 + j * span;
          const s1 = s0 + span;
          const rest = moves[j];
          nodes.push({
            id: nextId++,
            parent: id,
            ply: ply + 1,
            slot: j,
            kids: moves.length,
            maximizing: !maximizing,
            value: null,
            pruned: true,
            cutoff: true,
            terminal: true,
            label: rest.label,
            x: rest.x,
            y: rest.y,
            theta: 0.5 * (s0 + s1),
            a0: s0,
            a1: s1,
            pv: false,
          });
        }
        break;
      }
    }

    node.value = Number.isFinite(best) ? best : evaluate(scenario, st, ply);
    node.cutoff = cutoff;
    return node.value;
  };

  const rootValue = search(
    rootState,
    d,
    0,
    -Infinity,
    Infinity,
    meta.rootMax,
    null,
    0,
    1,
    0,
    Math.PI * 2,
  );

  const byParent = new Map<number, TreeNode[]>();
  for (const n of nodes) {
    if (n.parent == null) continue;
    const arr = byParent.get(n.parent) ?? [];
    arr.push(n);
    byParent.set(n.parent, arr);
  }
  const pv: string[] = [];
  let cur: TreeNode | undefined = nodes.find((n) => n.parent == null);
  let horizonPly = d;
  while (cur) {
    cur.pv = true;
    if (cur.label !== "root") pv.push(cur.label);
    if (cur.label === "halt" || cur.label === "stock") {
      horizonPly = cur.ply;
      break;
    }
    const kids = (byParent.get(cur.id) ?? []).filter((c) => !c.pruned && c.value != null);
    if (!kids.length) {
      horizonPly = cur.ply;
      break;
    }
    let next = kids[0];
    for (const c of kids) {
      const cv = c.value ?? 0;
      const nv = next.value ?? 0;
      if (cur.maximizing ? cv > nv : cv < nv) next = c;
    }
    cur = next;
  }

  const fullNodes = fullNodeCount(meta.branching, d);
  const prunePct = fullNodes > 0 ? (1 - visited / fullNodes) * 100 : 0;

  return {
    scenario,
    depth: d,
    branching: meta.branching,
    fullNodes,
    visited,
    pruned,
    cutoffs,
    prunePct,
    rootValue,
    pv,
    nodes,
    horizonPly,
    note: meta.note,
  };
}
