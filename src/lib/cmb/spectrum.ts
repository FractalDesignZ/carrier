import { PLANCK_TT_EXTREMA, SPECTRUM_ANCHORS } from "./constants";

export type SpectrumPoint = { ell: number; D: number };

function cosineInterp(y0: number, y1: number, t: number) {
  const s = (1 - Math.cos(Math.PI * t)) * 0.5;
  return y0 * (1 - s) + y1 * s;
}

/** Phenomenological D_ℓ hitting Planck 2018 TT extrema. Not CAMB. */
export function DlPlanck(ell: number, baryon = 1): number {
  if (ell < 2) return 0;
  const pts = SPECTRUM_ANCHORS;
  const last = pts[pts.length - 1];
  if (ell >= last.ell) {
    return last.D * Math.exp(-(ell - last.ell) / 400);
  }
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1].ell < ell) i += 1;
  const a = pts[i];
  const b = pts[i + 1];
  const t = (ell - a.ell) / Math.max(1e-6, b.ell - a.ell);
  let D = cosineInterp(a.D, b.D, t);

  const first = 220.6;
  const acoustic = Math.round(ell / first);
  if (acoustic >= 1 && ell > 120) {
    const odd = acoustic % 2 === 1;
    const amp = Math.max(0.15, Math.min(2.2, baryon));
    const factor = odd ? 0.55 + 0.45 * amp : 1.35 - 0.35 * amp;
    const blend = Math.min(1, Math.max(0, (ell - 120) / 80));
    D *= 1 + blend * (factor - 1);
  }

  if (ell > 200) {
    D *= Math.exp(-Math.pow((ell - 200) / 1600, 1.85));
  }
  return Math.max(8, D);
}

export function ClFromDl(ell: number, baryon = 1): number {
  if (ell < 2) return 0;
  return (2 * Math.PI * DlPlanck(ell, baryon)) / (ell * (ell + 1));
}

export function spectrumSeries(lmax = 2200, baryon = 1): SpectrumPoint[] {
  const out: SpectrumPoint[] = [];
  for (let l = 2; l <= lmax; l += l < 80 ? 1 : l < 400 ? 2 : 4) {
    out.push({ ell: l, D: DlPlanck(l, baryon) });
  }
  return out;
}

export function nearestPeak(ell: number) {
  let best = PLANCK_TT_EXTREMA[0];
  let d = Infinity;
  for (const p of PLANCK_TT_EXTREMA) {
    const dd = Math.abs(p.ell - ell);
    if (dd < d) {
      d = dd;
      best = p;
    }
  }
  return best;
}
