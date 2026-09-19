import { useEffect, useRef, useState } from "react";
import {
  reactanceCircle,
  resistanceCircle,
  SMITH_R,
  SMITH_X,
  zFromGamma,
} from "@/lib/geom/smith";
import type { HorizonReport, SheafNode } from "@/lib/geom/sheaf";
import { useEngine } from "@/lib/engine-store";
import { cn } from "@/lib/utils";

const STATE_COPY: Record<HorizonReport["state"], string> = {
  stable: "Local match, kernel intact",
  stressed: "Boundary stress — A(Γ) rising",
  horizon: "Local collapse, global section persists",
  incoherent: "Kernel lifted — no global carrier",
};

export function HorizonPanel({ report }: { report: HorizonReport | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<SheafNode | null>(null);
  const driveHorizon = useEngine((s) => s.driveHorizon);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent || !report) return;

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
      const R = Math.min(w, h) * 0.42;
      const toX = (re: number) => cx + re * R;
      const toY = (im: number) => cy - im * R;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = "rgba(42,46,56,0.95)";
      ctx.lineWidth = 1;
      for (const r of SMITH_R) {
        const c = resistanceCircle(r);
        ctx.beginPath();
        ctx.arc(toX(c.cx), toY(c.cy), c.radius * R, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const x of SMITH_X) {
        for (const s of [1, -1]) {
          const c = reactanceCircle(s * x);
          ctx.beginPath();
          ctx.arc(toX(c.cx), toY(c.cy), c.radius * R, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#eceae4";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.strokeStyle = "rgba(92,99,112,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const loopSet = new Set(report.holonomyLoop);
      for (const e of report.edges) {
        const a = report.nodes[e.u];
        const b = report.nodes[e.v];
        const onLoop =
          loopSet.has(e.u) &&
          loopSet.has(e.v) &&
          report.holonomyLoop.some((v, i) => {
            const n = report.holonomyLoop[i + 1];
            return (v === e.u && n === e.v) || (v === e.v && n === e.u);
          });
        ctx.beginPath();
        ctx.moveTo(toX(a.gamma.re), toY(a.gamma.im));
        ctx.lineTo(toX(b.gamma.re), toY(b.gamma.im));
        ctx.strokeStyle = onLoop ? "rgba(236,234,228,0.85)" : "rgba(77,127,163,0.4)";
        ctx.lineWidth = onLoop ? 1.8 : 1;
        ctx.stroke();
      }

      for (const nd of report.nodes) {
        const mag = Math.min(1.4, Math.hypot(nd.stereo.re, nd.stereo.im));
        const ang = Math.atan2(nd.stereo.im, nd.stereo.re);
        const sr = mag > 1 ? 1 : mag;
        ctx.beginPath();
        ctx.arc(toX(Math.cos(ang) * sr), toY(Math.sin(ang) * sr), 3.2, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(92,99,112,0.7)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const nd of report.nodes) {
        const t = Math.min(1, nd.mag);
        const hot = t > 0.55;
        ctx.beginPath();
        ctx.arc(toX(nd.gamma.re), toY(nd.gamma.im), nd.id === report.maxAmpId ? 6 : 4.2, 0, Math.PI * 2);
        ctx.fillStyle = hot ? "#c0563a" : "#4d7fa3";
        ctx.fill();
        if (hover?.id === nd.id) {
          ctx.strokeStyle = "#eceae4";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#8b93a0";
      ctx.font = "11px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("Γ = 0  match", cx + 8, cy - 8);
      ctx.fillText("Γ = 1  open", toX(0.78), toY(0) + 16);
      ctx.fillText("|Γ| = 1", cx + R * 0.62, cy - R * 0.78);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [report, hover]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!report) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42;
    const mx = (e.clientX - rect.left - cx) / R;
    const my = -(e.clientY - rect.top - cy) / R;
    let best: SheafNode | null = null;
    let d0 = 0.08;
    for (const nd of report.nodes) {
      const d = Math.hypot(nd.gamma.re - mx, nd.gamma.im - my);
      if (d < d0) {
        d0 = d;
        best = nd;
      }
    }
    setHover(best);
  };

  const z = hover ? zFromGamma(hover.gamma) : null;
  const state = report?.state ?? "stable";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-faint uppercase">Unit disk · Möbius sheaf</p>
          <p className="mt-1 text-sm text-muted">
            Filled ports are constructed Γ. Open rings are stereographic sky vertices. Lit edges are the
            holonomy face.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 font-mono text-xs uppercase tracking-wide",
              state === "horizon"
                ? "border-ok/50 text-ok"
                : state === "incoherent"
                  ? "border-hot/50 text-hot"
                  : state === "stressed"
                    ? "border-warn/50 text-warn"
                    : "border-line text-muted",
            )}
          >
            {state}
          </span>
          <button
            type="button"
            onClick={driveHorizon}
            className="h-9 rounded-full bg-accent px-3 text-xs text-accent-fg"
          >
            Drive to horizon
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 font-mono text-xs tabular-nums text-muted">
        <p>{report ? STATE_COPY[report.state] : "computing…"}</p>
        {hover && z ? (
          <p className="text-fg">
            n{hover.id} · |Γ| {hover.mag.toFixed(3)} · A {hover.amp.toFixed(1)} · z {z.re.toFixed(2)}
            {z.im >= 0 ? "+" : ""}
            {z.im.toFixed(2)}j
          </p>
        ) : report ? (
          <p>
            max A n{report.maxAmpId} {report.maxAmp.toFixed(1)} · ‖H−I‖ {report.holonomyFrob.toFixed(3)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
