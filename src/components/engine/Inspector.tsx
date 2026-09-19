import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CREDITS, OBSERVED_LMAX, T_CMB_K, Z_STAR } from "@/lib/cmb/constants";
import { coeffOf, type CmbAssets } from "@/lib/cmb/observed";
import { ylmLabel } from "@/lib/cmb/harmonics";
import type { FieldStats } from "@/lib/cmb/generate-map";
import type { Series, FeedMap, RmtReport } from "@/lib/geom/transform";
import type { FeedId } from "@/lib/geom/series";
import type { PruneReport, PruneScenario } from "@/lib/geom/prune";
import {
  HORIZON_EPS1,
  HORIZON_EPS2,
  HORIZON_RHO,
  type HorizonReport,
} from "@/lib/geom/sheaf";
import { MODE_META, useEngine, type ClaimKind, type SkySource } from "@/lib/engine-store";

const CLAIM_COPY: Record<ClaimKind, string> = {
  physics: "Physics",
  analogy: "Analogy",
  contested: "Contested",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-center gap-3">
      <span className="text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

const FEEDS: { id: FeedId; label: string }[] = [
  { id: "market", label: "S&P" },
  { id: "modular", label: "n² mod 41" },
  { id: "sensor", label: "Sensor" },
  { id: "traffic", label: "Traffic" },
  { id: "custom", label: "Paste" },
];

const MAPS: { id: FeedMap; label: string }[] = [
  { id: "phase", label: "Phase" },
  { id: "sacks", label: "Sacks" },
  { id: "ulam", label: "Ulam" },
  { id: "delay", label: "Delay" },
];

const SCENARIOS: { id: PruneScenario; label: string }[] = [
  { id: "adversary", label: "Adversary" },
  { id: "supply", label: "Supply" },
  { id: "sensor", label: "Sensor" },
];

export function Inspector({
  stats,
  assets,
  probeMuK,
  series,
  rmt,
  peak,
  bursts,
  prune,
  horizon,
}: {
  stats: FieldStats | null;
  assets: CmbAssets | null;
  probeMuK: number | null;
  series?: Series | null;
  rmt?: RmtReport | null;
  peak?: { k: number; period: number; power: number } | null;
  bursts?: number[];
  prune?: PruneReport | null;
  horizon?: HorizonReport | null;
}) {
  const mode = useEngine((s) => s.mode);
  const meta = MODE_META[mode];
  const source = useEngine((s) => s.source);
  const ell = useEngine((s) => s.ell);
  const m = useEngine((s) => s.m);
  const kind = useEngine((s) => s.kind);
  const lmax = useEngine((s) => s.lmax);
  const baryon = useEngine((s) => s.baryon);
  const grain = useEngine((s) => s.grain);
  const isolateMix = useEngine((s) => s.isolateMix);
  const interior = useEngine((s) => s.interior);
  const holographic = useEngine((s) => s.holographic);
  const coherence = useEngine((s) => s.coherence);
  const seed = useEngine((s) => s.seed);
  const feedId = useEngine((s) => s.feedId);
  const feedMap = useEngine((s) => s.feedMap);
  const feedPaste = useEngine((s) => s.feedPaste);
  const pruneScenario = useEngine((s) => s.pruneScenario);
  const pruneDepth = useEngine((s) => s.pruneDepth);
  const mismatch = useEngine((s) => s.mismatch);
  const scramble = useEngine((s) => s.scramble);
  const twist = useEngine((s) => s.twist);
  const tau = useEngine((s) => s.tau);
  const {
    setEll,
    setM,
    setKind,
    setLmax,
    setBaryon,
    setGrain,
    setIsolateMix,
    setInterior,
    setHolographic,
    setCoherence,
    setSource,
    setFeedId,
    setFeedMap,
    setFeedPaste,
    setPruneScenario,
    setPruneDepth,
    setMismatch,
    setScramble,
    setTwist,
    setTau,
    driveHorizon,
    reshuffle,
  } = useEngine();

  const observed = source === "observed";
  const ellMax = observed ? OBSERVED_LMAX : Math.min(lmax, 28);
  const alm = assets?.alm;
  const aSel = alm ? coeffOf(alm, ell, m, kind) : null;
  const mapD = alm?.Dl.find((d) => d.ell === ell);
  const planckD = assets?.full.find((d) => d.ell === ell);

  const blurb =
    mode === "feed"
      ? "Phase map: θ = 2π n / T with T from the periodogram (or the planted period). A period-T series collapses onto T arms. Sacks/Ulam are index lattices — markets will not spontaneously form prime rays. Delay is (x(t), x(t+τ)). Eigenvalues above the Marchenko–Pastur edge are kept mass, not GUE-of-zeta and not GCP."
      : mode === "prune"
        ? "Minimax with shallow-eval ordering and geometric futility. Measured prune ratio is 1 − visited/b-tree, not a promised 98%. The principal variation is the lit ring. Halt on the sensor tree is an actual stop — that ply is the horizon."
        : mode === "horizon"
          ? "Γ = (z−1)/(z+1) and A = 2/|1−Γ|² are exact. L = δ*δ on the HEALPix Nside=1 icosahedron; ker L = H⁰. Stereographic S² → disk is conformal. Digital Horizon is a criterion on this 12-port sheaf — local MI collapse with a persisting kernel — not a CMB measurement and not GCP."
        : mode === "screen"
          ? "Holographic screens in gravity bound information by area. Not a measured consciousness field on the CMB. GCP points are illustrative; reanalyses do not establish global consciousness."
          : mode === "matrix"
            ? "Ulam/Sacks diagonals are prime-rich quadratics — a spectral picture of the integers, not an identity with Y_ℓm."
            : mode === "acoustic"
              ? "White points: Planck PR3 TT (Commander ℓ<30, Plik ℓ≥30) with 1σ errors. Red: D_ℓ recovered from the WMAP ILC map via HEALPix quadrature. Grey: best-fit ΛCDM."
              : mode === "multipoles"
                ? observed
                  ? "Isolation multiplies the measured a_ℓm by Y_ℓm. Mix=100% is the actual contribution of that mode on this sky, not a unit harmonic."
                  : "ΔT = Σ a_ℓm Y_ℓm. Isolation is exact only up to ℓ_max. Acoustic peaks sit near ℓ ~ 220, below this band."
                : observed
                  ? "WMAP 9-year ILC, Galactic, Nside=64. Real ΔT in μK, monopole removed. Not Planck SMICA pixels — those FITS are 2 GB. The spectrum below is Planck PR3."
                  : "Gaussian sky from C_ℓ plus high-ℓ grain. A ΛCDM-shaped draw, not flight data. Dipole omitted (ℓ ≥ 2).";

  const feedClaim = mode === "feed" ? (series?.claim ?? meta.claim) : meta.claim;

  return (
    <aside className="flex w-full flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface/90 p-4 sm:w-80">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-faint uppercase">{meta.kicker}</p>
          <h2 className="mt-1 text-lg font-medium tracking-tight text-fg">{meta.label}</h2>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 font-mono text-xs tracking-wide uppercase ${
            feedClaim === "physics"
              ? "border-ok/40 text-ok"
              : feedClaim === "analogy"
                ? "border-cold/40 text-cold"
                : "border-warn/50 text-warn"
          }`}
        >
          {CLAIM_COPY[feedClaim]}
        </span>
      </header>

      {mode === "feed" ? (
        <>
          <p className="text-sm leading-relaxed text-muted text-pretty">{blurb}</p>
          <div className="flex flex-wrap gap-1">
            {FEEDS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedId(f.id)}
                className={`h-8 rounded-full px-3 text-xs ${
                  feedId === f.id ? "bg-accent text-accent-fg" : "border border-line text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-full border border-line p-1">
            {MAPS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFeedMap(f.id)}
                className={`h-8 flex-1 rounded-full px-1.5 text-xs ${
                  feedMap === f.id ? "bg-accent text-accent-fg" : "text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {feedId === "custom" && (
            <textarea
              value={feedPaste}
              onChange={(e) => setFeedPaste(e.target.value)}
              placeholder="Paste a CSV column or one number per line"
              className="min-h-28 w-full rounded-lg border border-line bg-bg px-3 py-2 font-mono text-xs text-fg"
            />
          )}
          {series && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
              <dt className="text-faint">N</dt>
              <dd className="text-fg">{series.channel.length}</dd>
              {peak && (
                <>
                  <dt className="text-faint">Peak k</dt>
                  <dd className="text-fg">{peak.k}</dd>
                  <dt className="text-faint">Period</dt>
                  <dd className="text-fg">{peak.period.toFixed(1)}</dd>
                </>
              )}
              {rmt && (
                <>
                  <dt className="text-faint">MP edge</dt>
                  <dd className="text-fg">{rmt.hi.toFixed(2)}</dd>
                  <dt className="text-faint">Outliers</dt>
                  <dd className="text-fg">{rmt.outliers}</dd>
                  <dt className="text-faint">Kept mass</dt>
                  <dd className="text-fg">{(rmt.coherent * 100).toFixed(1)}%</dd>
                </>
              )}
              <dt className="text-faint">Bursts</dt>
              <dd className="text-fg">{bursts?.length ?? 0}</dd>
            </dl>
          )}
          {series?.planted && (
            <p className="font-mono text-xs text-ok">Planted: {series.planted.kind}</p>
          )}
          <p className="text-xs leading-relaxed text-faint">{series?.citation}</p>
        </>
      ) : mode === "prune" ? (
        <>
          <p className="text-sm leading-relaxed text-muted text-pretty">{blurb}</p>
          <div className="flex flex-wrap gap-1">
            {SCENARIOS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPruneScenario(f.id)}
                className={`h-8 rounded-full px-3 text-xs ${
                  pruneScenario === f.id ? "bg-accent text-accent-fg" : "border border-line text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Row label={`Ply  ${pruneDepth}`}>
            <Slider min={2} max={6} step={1} value={[pruneDepth]} onValueChange={(v) => setPruneDepth(v[0] ?? 5)} />
          </Row>
          {prune && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
              <dt className="text-faint">Branching</dt>
              <dd className="text-fg">{prune.branching}</dd>
              <dt className="text-faint">Full tree</dt>
              <dd className="text-fg">{prune.fullNodes.toFixed(0)}</dd>
              <dt className="text-faint">Visited</dt>
              <dd className="text-fg">{prune.visited}</dd>
              <dt className="text-faint">Pruned</dt>
              <dd className="text-fg">{prune.pruned}</dd>
              <dt className="text-faint">Cutoffs</dt>
              <dd className="text-fg">{prune.cutoffs}</dd>
              <dt className="text-faint">Prune %</dt>
              <dd className="text-fg">{prune.prunePct.toFixed(1)}</dd>
              <dt className="text-faint">Root v</dt>
              <dd className="text-fg">{prune.rootValue.toFixed(3)}</dd>
              <dt className="text-faint">Horizon</dt>
              <dd className="text-fg">ply {prune.horizonPly}</dd>
            </dl>
          )}
          {prune && prune.pv.length > 0 && (
            <p className="font-mono text-xs text-fg">PV {prune.pv.join(" → ")}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs tabular-nums text-faint">seed {seed}</p>
            <Button variant="outline" size="sm" onClick={reshuffle}>
              <RotateCcw className="size-3.5" />
              Reseed
            </Button>
          </div>
        </>
      ) : mode === "horizon" ? (
        <>
          <p className="text-sm leading-relaxed text-muted text-pretty">{blurb}</p>
          <div className="grid gap-2">
            <Row label={`|Γ|  ${mismatch.toFixed(2)}`}>
              <Slider min={0} max={0.96} step={0.01} value={[mismatch]} onValueChange={(v) => setMismatch(v[0] ?? 0.42)} />
            </Row>
            <Row label={`Scramble  ${scramble.toFixed(2)}`}>
              <Slider min={0} max={5} step={0.05} value={[scramble]} onValueChange={(v) => setScramble(v[0] ?? 0.3)} />
            </Row>
            <Row label={`Twist  ${twist.toFixed(2)}`}>
              <Slider min={0} max={1} step={0.01} value={[twist]} onValueChange={(v) => setTwist(v[0] ?? 0)} />
            </Row>
            <Row label={`τ  ${tau.toFixed(3)}`}>
              <Slider min={0.002} max={0.4} step={0.002} value={[tau]} onValueChange={(v) => setTau(v[0] ?? 0.08)} />
            </Row>
          </div>
          {horizon && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["I_loc ≤ ε₁", horizon.flags.localCollapse],
                    ["I_sheaf ≥ ε₂", horizon.flags.globalPersist],
                    ["λ₄ ≤ τ", horizon.flags.nearKernel],
                    ["|Γ̄| ≥ ρ*", horizon.flags.boundary],
                  ] as const
                ).map(([label, on]) => (
                  <span
                    key={label}
                    className={`rounded-full border px-2.5 py-1 font-mono text-xs ${
                      on ? "border-ok/40 text-ok" : "border-line text-faint"
                    }`}
                  >
                    {on ? "on  " : "off "}
                    {label}
                  </span>
                ))}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
                <dt className="text-faint">λ₁</dt>
                <dd className="text-fg">{horizon.lambdaMin.toExponential(2)}</dd>
                <dt className="text-faint">k(τ)</dt>
                <dd className="text-fg">{horizon.kTau}</dd>
                <dt className="text-faint">dim ker</dt>
                <dd className="text-fg">{horizon.dimKer}</dd>
                <dt className="text-faint">‖H−I‖</dt>
                <dd className="text-fg">{horizon.holonomyFrob.toFixed(3)}</dd>
                <dt className="text-faint">I_loc</dt>
                <dd className="text-fg">{horizon.iLoc.toFixed(2)} b</dd>
                <dt className="text-faint">I_sheaf</dt>
                <dd className="text-fg">{horizon.iSheaf.toFixed(2)} b</dd>
                <dt className="text-faint">|Γ̄|</dt>
                <dd className="text-fg">{horizon.meanMag.toFixed(3)}</dd>
                <dt className="text-faint">max A</dt>
                <dd className="text-fg">{horizon.maxAmp.toFixed(1)}</dd>
              </dl>
              <p className="font-mono text-xs text-faint">
                ε₁ {HORIZON_EPS1} · ε₂ {HORIZON_EPS2} · ρ* {HORIZON_RHO}
              </p>
            </>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={driveHorizon}>
              Drive to horizon
            </Button>
            <Button variant="outline" size="sm" onClick={reshuffle}>
              <RotateCcw className="size-3.5" />
              Reseed
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 rounded-full border border-line p-1">
            {(["observed", "gaussian"] as SkySource[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSource(id)}
                className={`h-8 flex-1 rounded-full px-3 text-xs ${
                  source === id ? "bg-accent text-accent-fg" : "text-muted"
                }`}
              >
                {id === "observed" ? "Observed" : "Gaussian"}
              </button>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-muted text-pretty">{blurb}</p>

          <div className="grid gap-2">
            <Row label={`ℓ  ${ell}`}>
              <Slider min={2} max={ellMax} step={1} value={[ell]} onValueChange={(v) => setEll(v[0] ?? 2)} />
            </Row>
            <Row label={`m  ${m}`}>
              <Slider min={0} max={ell} step={1} value={[m]} onValueChange={(v) => setM(v[0] ?? 0)} />
            </Row>
            <Row label="Parity">
              <div className="flex gap-1 rounded-full border border-line p-1">
                <button
                  type="button"
                  className={`h-8 rounded-full px-3 text-xs ${kind === "c" ? "bg-accent text-accent-fg" : "text-muted"}`}
                  onClick={() => setKind("c")}
                >
                  cos
                </button>
                <button
                  type="button"
                  className={`h-8 rounded-full px-3 text-xs ${kind === "s" ? "bg-accent text-accent-fg" : "text-muted"}`}
                  onClick={() => setKind("s")}
                  disabled={m === 0}
                >
                  sin
                </button>
              </div>
            </Row>
            <Row label={`Mix  ${Math.round(isolateMix * 100)}%`}>
              <Slider min={0} max={1} step={0.01} value={[isolateMix]} onValueChange={(v) => setIsolateMix(v[0] ?? 0)} />
            </Row>
            {!observed && (
              <>
                <Row label={`ℓ_max  ${lmax}`}>
                  <Slider min={4} max={24} step={1} value={[lmax]} onValueChange={(v) => setLmax(v[0] ?? 16)} />
                </Row>
                <Row label={`Baryon  ${baryon.toFixed(2)}`}>
                  <Slider min={0.4} max={1.8} step={0.02} value={[baryon]} onValueChange={(v) => setBaryon(v[0] ?? 1)} />
                </Row>
                <Row label={`Grain  ${grain.toFixed(2)}`}>
                  <Slider min={0} max={1.4} step={0.02} value={[grain]} onValueChange={(v) => setGrain(v[0] ?? 0.85)} />
                </Row>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-xs text-muted">
            <label className="flex flex-col items-start gap-2">
              Interior
              <Switch checked={interior} onCheckedChange={setInterior} />
            </label>
            <label className="flex flex-col items-start gap-2">
              Hologram
              <Switch checked={holographic} onCheckedChange={setHolographic} />
            </label>
            <label className="flex flex-col items-start gap-2">
              Coherence
              <Switch checked={coherence} onCheckedChange={setCoherence} />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs tabular-nums text-faint">
              {ylmLabel(ell, m, kind)}
              {aSel != null ? ` · a ${aSel.toFixed(2)} μK` : ` · ${seed}`}
            </p>
            {!observed && (
              <Button variant="outline" size="sm" onClick={reshuffle}>
                <RotateCcw className="size-3.5" />
                Reseed
              </Button>
            )}
          </div>

          {observed && assets && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
              <dt className="text-faint">Look ΔT</dt>
              <dd className="text-fg">{probeMuK == null ? "—" : `${probeMuK.toFixed(1)} μK`}</dd>
              <dt className="text-faint">Map RMS</dt>
              <dd className="text-fg">{assets.manifest.sky.rms_uK.toFixed(1)} μK</dd>
              <dt className="text-faint">Map D₂</dt>
              <dd className="text-fg">{assets.manifest.spectrum.D2_map.D.toFixed(0)} μK²</dd>
              <dt className="text-faint">Planck D₂</dt>
              <dd className="text-fg">{assets.manifest.spectrum.D2_planck.D.toFixed(0)} μK²</dd>
              {mapD && (
                <>
                  <dt className="text-faint">Map D_ℓ</dt>
                  <dd className="text-fg">{mapD.D.toFixed(0)} μK²</dd>
                </>
              )}
              {planckD && (
                <>
                  <dt className="text-faint">Planck D_ℓ</dt>
                  <dd className="text-fg">{planckD.D.toFixed(0)} μK²</dd>
                </>
              )}
            </dl>
          )}

          {stats && (
            <p className="font-mono text-xs tabular-nums text-muted">
              RMS {stats.rms.toFixed(1)} μK · T₀ {T_CMB_K} K · z⋆ {Z_STAR}
            </p>
          )}

          <p className="text-xs leading-relaxed text-faint">{observed ? CREDITS.sky : CREDITS.peaks}</p>
        </>
      )}
    </aside>
  );
}
