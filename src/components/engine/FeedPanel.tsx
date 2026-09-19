import { useEffect, useMemo, useRef, useState } from "react";
import { planckColor } from "@/lib/cmb/colormap";
import type { FeedId } from "@/lib/geom/series";
import { latticePoint, latticeSpan, zscore, type FeedMap, type Series } from "@/lib/geom/transform";
import { useEngine } from "@/lib/engine-store";
import { cn } from "@/lib/utils";

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

export function FeedPanel({
  series,
  bursts,
  period,
}: {
  series: Series | null;
  bursts: number[];
  period: number;
}) {
  const polarRef = useRef<HTMLCanvasElement>(null);
  const stripRef = useRef<HTMLCanvasElement>(null);
  const map = useEngine((s) => s.feedMap);
  const feedId = useEngine((s) => s.feedId);
  const setFeedId = useEngine((s) => s.setFeedId);
  const setFeedMap = useEngine((s) => s.setFeedMap);
  const [hover, setHover] = useState<number | null>(null);

  const z = useMemo(() => (series ? zscore(series.channel) : []), [series]);
  const burstSet = useMemo(() => new Set(bursts), [bursts]);

  useEffect(() => {
    const canvas = polarRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || !series) return;
    const x = series.channel;
    const n = x.length;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < 8 || h < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07080b";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const span = latticeSpan(n, map === "delay" ? "phase" : map);
      const scale = (Math.min(w, h) * 0.46) / Math.max(0.5, span);

      if (map === "delay") {
        const tau = Math.max(1, Math.round(n / 24));
        let minx = Infinity;
        let maxx = -Infinity;
        for (let i = 0; i < n - tau; i++) {
          if (z[i] < minx) minx = z[i];
          if (z[i] > maxx) maxx = z[i];
        }
        const rng = Math.max(1e-6, maxx - minx);
        const pad = 28;
        ctx.strokeStyle = "rgba(42,46,56,1)";
        ctx.strokeRect(pad, pad, w - 2 * pad, h - 2 * pad);
        for (let i = 0; i < n - tau; i++) {
          const px = pad + ((z[i] - minx) / rng) * (w - 2 * pad);
          const py = pad + (1 - (z[i + tau] - minx) / rng) * (h - 2 * pad);
          const [r, g, b] = planckColor(z[i] * 80, 280);
          ctx.fillStyle = burstSet.has(i) ? "#c0563a" : `rgb(${r},${g},${b})`;
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
        ctx.fillStyle = "#8b93a0";
        ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
        ctx.fillText("x(t)", pad, h - 10);
        ctx.fillText(`x(t+${tau})`, w - 64, pad + 12);
        return;
      }

      if (map === "phase") {
        const T = Math.max(2, Math.round(period));
        const guide = Math.min(T, 48);
        ctx.strokeStyle = "rgba(42,46,56,0.85)";
        ctx.lineWidth = 1;
        for (let k = 0; k < guide; k++) {
          const th = (2 * Math.PI * k) / T;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(th) * Math.min(w, h) * 0.46, cy - Math.sin(th) * Math.min(w, h) * 0.46);
          ctx.stroke();
        }
      }

      const rad = map === "phase" ? 2.1 : 1.4;
      for (let i = 0; i < n; i++) {
        const { x: px0, y: py0 } = latticePoint(i + 1, n, map, period);
        const px = cx + px0 * scale;
        const py = cy - py0 * scale;
        if (px < 0 || py < 0 || px > w || py > h) continue;
        const [r, g, b] = planckColor(z[i] * 90, 280);
        ctx.fillStyle = hover === i ? "#eceae4" : burstSet.has(i) ? "#c0563a" : `rgb(${r},${g},${b})`;
        const rr = hover === i ? rad + 1.2 : rad;
        ctx.fillRect(px - rr / 2, py - rr / 2, rr, rr);
      }

      if (map === "phase") {
        ctx.fillStyle = "#8b93a0";
        ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
        ctx.fillText(`θ = 2π n / ${period.toFixed(1)}`, 12, h - 12);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [series, map, z, hover, burstSet, period]);

  useEffect(() => {
    const canvas = stripRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || !series) return;
    const x = series.channel;
    const n = x.length;

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w < 8 || h < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 8, r: 8, t: 8, b: 8 };
      let lo = Infinity;
      let hi = -Infinity;
      for (const v of x) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const rng = Math.max(1e-9, hi - lo);
      const xOf = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
      const yOf = (v: number) => pad.t + (1 - (v - lo) / rng) * (h - pad.t - pad.b);
      ctx.beginPath();
      x.forEach((v, i) => {
        const xx = xOf(i);
        const yy = yOf(v);
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      });
      ctx.strokeStyle = "#c5ccd4";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#c0563a";
      for (const i of bursts) {
        ctx.fillRect(xOf(i) - 0.6, pad.t, 1.2, h - pad.t - pad.b);
      }
      if (hover != null && hover >= 0 && hover < n) {
        ctx.strokeStyle = "rgba(236,234,228,0.4)";
        ctx.beginPath();
        ctx.moveTo(xOf(hover), pad.t);
        ctx.lineTo(xOf(hover), h - pad.b);
        ctx.stroke();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [series, bursts, hover]);

  const onPolar = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!series || map === "delay") return;
    const canvas = polarRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const n = series.channel.length;
    const span = latticeSpan(n, map);
    const scale = (Math.min(w, h) * 0.46) / Math.max(0.5, span);
    const x = (ev.clientX - rect.left - cx) / scale;
    const y = (cy - (ev.clientY - rect.top)) / scale;
    let best = -1;
    let dmin = map === "phase" ? 0.08 : 1.6;
    for (let i = 0; i < n; i++) {
      const p = latticePoint(i + 1, n, map, period);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < dmin) {
        dmin = d;
        best = i;
      }
    }
    setHover(best >= 0 ? best : null);
  };

  if (!series) {
    return <p className="text-sm text-muted">Loading series…</p>;
  }

  const hv = hover != null ? series.channel[hover] : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {FEEDS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFeedId(f.id)}
            className={cn(
              "h-11 rounded-full px-3 text-xs sm:h-8",
              feedId === f.id ? "bg-accent text-accent-fg" : "border border-line text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex max-w-md gap-1 rounded-full border border-line p-1">
        {MAPS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFeedMap(f.id)}
            className={cn(
              "h-10 flex-1 rounded-full px-2 text-xs sm:h-8",
              map === f.id ? "bg-accent text-accent-fg" : "text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted text-pretty">{series.note}</p>
      <div className="min-h-16 shrink-0">
        <canvas ref={stripRef} className="h-16 w-full" />
      </div>
      <div className="relative min-h-64 flex-1">
        <canvas
          ref={polarRef}
          className="size-full"
          onPointerMove={onPolar}
          onPointerLeave={() => setHover(null)}
        />
        {hover != null && hv != null && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs tabular-nums text-fg">
            n {hover}
            {series.labels?.[hover] ? ` · ${series.labels[hover]}` : ""} · {hv.toFixed(3)} {series.unit}
          </div>
        )}
      </div>
    </div>
  );
}
