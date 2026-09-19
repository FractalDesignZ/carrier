import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Intro } from "@/components/engine/Intro";
import { Inspector } from "@/components/engine/Inspector";
import { PrimePanel } from "@/components/engine/PrimePanel";
import { FeedPanel } from "@/components/engine/FeedPanel";
import { FeedSpectrum } from "@/components/engine/FeedSpectrum";
import { PrunePanel } from "@/components/engine/PrunePanel";
import { PruneTrace } from "@/components/engine/PruneTrace";
import { HorizonPanel } from "@/components/engine/HorizonPanel";
import { HorizonTrace } from "@/components/engine/HorizonTrace";
import { SkyCanvas } from "@/components/engine/SkyCanvas";
import { SpectrumPlot } from "@/components/engine/SpectrumPlot";
import { Button } from "@/components/ui/button";
import { mapToRgba } from "@/lib/cmb/colormap";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/cmb/constants";
import {
  fieldStats,
  sampleCoeffs,
  synthesizeField,
  type FieldStats,
} from "@/lib/cmb/generate-map";
import {
  blendObservedMode,
  loadCmbAssets,
  probeEquirect,
  type CmbAssets,
} from "@/lib/cmb/observed";
import {
  loadMarket,
  makeModular,
  makeSensor,
  makeTraffic,
  parseNumericColumn,
  seriesFromCustom,
} from "@/lib/geom/series";
import {
  coherentResidual,
  peakPeriod,
  periodogram,
  rmtReport,
  type RmtReport,
  type Series,
} from "@/lib/geom/transform";
import { MODE_META, useEngine, type EngineMode } from "@/lib/engine-store";
import { runPrune, type PruneReport } from "@/lib/geom/prune";
import { runHorizon, type HorizonReport } from "@/lib/geom/sheaf";
import { cn } from "@/lib/utils";

const MODES: EngineMode[] = ["surface", "multipoles", "acoustic", "matrix", "feed", "prune", "horizon", "screen"];

export function CarrierApp() {
  const mode = useEngine((s) => s.mode);
  const entered = useEngine((s) => s.entered);
  const setMode = useEngine((s) => s.setMode);
  const source = useEngine((s) => s.source);
  const seed = useEngine((s) => s.seed);
  const lmax = useEngine((s) => s.lmax);
  const baryon = useEngine((s) => s.baryon);
  const grain = useEngine((s) => s.grain);
  const isolateMix = useEngine((s) => s.isolateMix);
  const ell = useEngine((s) => s.ell);
  const m = useEngine((s) => s.m);
  const kind = useEngine((s) => s.kind);
  const lookTheta = useEngine((s) => s.lookTheta);
  const lookPhi = useEngine((s) => s.lookPhi);
  const feedId = useEngine((s) => s.feedId);
  const feedPaste = useEngine((s) => s.feedPaste);
  const pruneScenario = useEngine((s) => s.pruneScenario);
  const pruneDepth = useEngine((s) => s.pruneDepth);
  const mismatch = useEngine((s) => s.mismatch);
  const scramble = useEngine((s) => s.scramble);
  const twist = useEngine((s) => s.twist);
  const tau = useEngine((s) => s.tau);
  const [rgba, setRgba] = useState<Uint8Array | null>(null);
  const [stats, setStats] = useState<FieldStats | null>(null);
  const [busy, setBusy] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [assets, setAssets] = useState<CmbAssets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [series, setSeries] = useState<Series | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => useEngine.setState({ reducedMotion: mq.matches });
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadCmbAssets()
      .then((data) => {
        if (!cancelled) setAssets(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "CMB load failed");
          useEngine.getState().setSource("gaussian");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let next: Series | null = null;
      if (feedId === "market") next = await loadMarket();
      else if (feedId === "modular") next = makeModular();
      else if (feedId === "sensor") next = makeSensor(2048, seed);
      else if (feedId === "traffic") next = makeTraffic(1440, seed);
      else {
        const nums = parseNumericColumn(feedPaste);
        next = nums.length >= 16 ? seriesFromCustom(nums) : null;
      }
      if (!cancelled) setSeries(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [feedId, feedPaste, seed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, EngineMode> = {
        "1": "surface",
        "2": "multipoles",
        "3": "acoustic",
        "4": "matrix",
        "5": "feed",
        "6": "prune",
        "7": "horizon",
        "8": "screen",
      };
      const next = map[e.key];
      if (next) {
        useEngine.getState().setEntered(true);
        setMode(next);
      }
      if (e.key === "o") useEngine.getState().setSource("observed");
      if (e.key === "g") useEngine.getState().setSource("gaussian");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setMode]);

  const isolate = useMemo(
    () => (isolateMix > 0.02 ? { l: Math.min(ell, source === "observed" ? 48 : lmax), m: Math.min(m, ell), kind } : null),
    [isolateMix, ell, m, kind, lmax, source],
  );

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const handle = window.setTimeout(() => {
      if (source === "observed") {
        if (!assets) return;
        let field = assets.field;
        if (isolate) {
          field = blendObservedMode(field, MAP_WIDTH, MAP_HEIGHT, isolate, isolateMix, assets.alm);
        }
        if (cancelled) return;
        setRgba(mapToRgba(field, 280));
        setStats(fieldStats(field));
        setBusy(false);
        return;
      }
      const coeffs = sampleCoeffs(lmax, seed, baryon);
      const field = synthesizeField(coeffs, MAP_WIDTH, MAP_HEIGHT, grain, seed, isolate, isolateMix);
      if (cancelled) return;
      setRgba(mapToRgba(field, 280));
      setStats(fieldStats(field));
      setBusy(false);
    }, 16);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [source, assets, seed, lmax, baryon, grain, isolate, isolateMix]);

  const probeMuK =
    source === "observed" && assets ? probeEquirect(assets.field, lookTheta, lookPhi) : null;

  const pg = useMemo(() => (series ? periodogram(series.channel) : []), [series]);
  const peak = useMemo(() => (series ? peakPeriod(pg, series.channel.length) : null), [pg, series]);
  const rmt: RmtReport | null = useMemo(
    () => (series && series.channel.length > 40 ? rmtReport(series.channel) : null),
    [series],
  );
  const bursts = useMemo(
    () => (series ? coherentResidual(series.channel).burstIdx : []),
    [series],
  );
  const period = series?.planted?.period ?? peak?.period ?? 12;
  const prune: PruneReport | null = useMemo(
    () => (entered && mode === "prune" ? runPrune(pruneScenario, pruneDepth, seed) : null),
    [entered, mode, pruneScenario, pruneDepth, seed],
  );
  const horizon: HorizonReport | null = useMemo(
    () =>
      entered && mode === "horizon"
        ? runHorizon({ mismatch, scramble, twist, tau, seed })
        : null,
    [entered, mode, mismatch, scramble, twist, tau, seed],
  );

  const status =
    mode === "feed"
      ? series
        ? `${series.name} · N=${series.channel.length}`
        : "paste at least 16 numbers"
      : mode === "prune"
        ? prune
          ? `visited ${prune.visited} / ${prune.fullNodes.toFixed(0)} · prune ${prune.prunePct.toFixed(1)}%`
          : "searching…"
      : mode === "horizon"
        ? horizon
          ? `${horizon.state} · λ₁ ${horizon.lambdaMin.toExponential(1)} · k(τ) ${horizon.kTau}`
          : "assembling sheaf…"
      : loadError ? "load error"
        : busy ? (source === "observed" ? "reading WMAP…" : "synthesizing…")
          : source === "observed" ? "WMAP 9-year ILC · Planck PR3"
            : "Gaussian · Planck 2018 extrema";

  const overlay = mode === "matrix" || mode === "feed" || mode === "prune" || mode === "horizon";

  return (
    <div className="relative h-dvh min-h-dvh overflow-hidden bg-bg text-fg">
      <SkyCanvas rgba={rgba} />

      {entered && overlay && (
        <div className="absolute inset-0 z-10 bg-bg px-4 pb-28 pt-20 sm:pl-8 sm:pr-96 sm:pt-24">
          {mode === "matrix" ? (
            <PrimePanel />
          ) : mode === "prune" ? (
            <PrunePanel report={prune} />
          ) : mode === "horizon" ? (
            <HorizonPanel report={horizon} />
          ) : (
            <FeedPanel series={series} bursts={bursts} period={period} />
          )}
        </div>
      )}

      {entered && (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
          <div className="pointer-events-auto">
            <p className="font-mono text-xs tracking-[0.22em] text-muted uppercase">Carrier</p>
            <p className="text-sm text-faint">Last-scattering engine</p>
          </div>
          <nav className="pointer-events-auto hidden max-w-[70vw] flex-nowrap justify-end gap-1 overflow-x-auto sm:flex">
            {MODES.map((id) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-2.5 text-xs transition-colors",
                  mode === id ? "bg-accent text-accent-fg" : "bg-surface/80 text-muted hover:text-fg",
                )}
              >
                {MODE_META[id].label}
              </button>
            ))}
          </nav>
          <Button
            variant="quiet"
            size="icon"
            className="pointer-events-auto sm:hidden"
            onClick={() => setSheet((v) => !v)}
            aria-label="Controls"
          >
            {sheet ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </header>
      )}

      {entered && (
        <nav className="pointer-events-auto absolute inset-x-3 top-16 z-20 flex gap-1 overflow-x-auto pb-1 sm:hidden">
          {MODES.map((id) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={cn(
                "h-11 shrink-0 rounded-full px-3 text-xs",
                mode === id ? "bg-accent text-accent-fg" : "bg-surface/80 text-muted",
              )}
            >
              {MODE_META[id].label}
            </button>
          ))}
        </nav>
      )}

      {entered && (
        <div
          className={cn(
            "absolute z-20",
            "bottom-40 right-5 top-20 hidden overflow-y-auto sm:block",
            (mode === "acoustic" || mode === "feed" || mode === "prune" || mode === "horizon") && "sm:bottom-56",
            sheet && "top-28 right-3 left-3 bottom-36 block sm:left-auto",
          )}
        >
          <Inspector
            stats={stats}
            assets={assets}
            probeMuK={probeMuK}
            series={series}
            rmt={rmt}
            peak={peak}
            bursts={bursts}
            prune={prune}
            horizon={horizon}
          />
        </div>
      )}

      {entered && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-5 sm:pr-96">
          <div className="pointer-events-auto rounded-xl border border-line bg-surface/90 px-4 py-3">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
                {mode === "feed" ? "Periodogram · RMT eigs" : mode === "prune" ? "Visited / pruned by ply" : mode === "horizon" ? "λ(L) · sheaf spectrum" : "D_ℓ · Planck TT"}
              </p>
              <p className="font-mono text-xs text-faint">{status}</p>
            </div>
            {mode === "feed" ? (
              <FeedSpectrum pg={pg} eigs={rmt} n={series?.channel.length ?? 0} />
            ) : mode === "prune" ? (
              <PruneTrace report={prune} />
            ) : mode === "horizon" ? (
              <HorizonTrace report={horizon} />
            ) : (
              <SpectrumPlot
                tall={mode === "acoustic"}
                theory={assets?.theory}
                binned={assets?.binned}
                mapDl={assets?.alm.Dl}
              />
            )}
          </div>
        </div>
      )}

      {entered && mode !== "feed" && mode !== "matrix" && mode !== "prune" && mode !== "horizon" && (
        <div
          className="pointer-events-none absolute top-1/3 left-3 z-20 hidden h-40 w-2 overflow-hidden rounded-full sm:block"
          aria-hidden
          style={{
            background:
              "linear-gradient(to bottom, var(--color-cold), var(--color-fg), var(--color-hot))",
          }}
        />
      )}

      {!entered && <Intro loaded={!!assets} error={loadError} />}
    </div>
  );
}
