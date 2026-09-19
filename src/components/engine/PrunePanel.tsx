import { useEffect, useRef, useState } from "react";
import { planckColor } from "@/lib/cmb/colormap";
import type { PruneReport, PruneScenario, TreeNode } from "@/lib/geom/prune";
import { useEngine } from "@/lib/engine-store";
import { cn } from "@/lib/utils";

const SCENARIOS: { id: PruneScenario; label: string }[] = [
  { id: "adversary", label: "Adversary" },
  { id: "supply", label: "Supply" },
  { id: "sensor", label: "Sensor" },
];

export function PrunePanel({ report }: { report: PruneReport | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<TreeNode | null>(null);
  const scenario = useEngine((s) => s.pruneScenario);
  const setScenario = useEngine((s) => s.setPruneScenario);

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
      const R = Math.min(w, h) * 0.46;
      const rings = report.depth + 1;
      const byId = new Map(report.nodes.map((n) => [n.id, n]));
      const rOf = (ply: number) => (ply / rings) * R;

      ctx.strokeStyle = "rgba(42,46,56,0.9)";
      for (let p = 1; p <= report.depth; p++) {
        ctx.beginPath();
        ctx.arc(cx, cy, rOf(p), 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const n of report.nodes) {
        if (n.parent == null) continue;
        const p = byId.get(n.parent);
        if (!p) continue;
        const r0 = rOf(p.ply);
        const r1 = rOf(n.ply);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(p.theta) * r0, cy - Math.sin(p.theta) * r0);
        ctx.lineTo(cx + Math.cos(n.theta) * r1, cy - Math.sin(n.theta) * r1);
        if (n.pv && p.pv) {
          ctx.strokeStyle = "#eceae4";
          ctx.lineWidth = 1.8;
        } else if (n.pruned) {
          ctx.strokeStyle = "rgba(92,99,112,0.35)";
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = "rgba(77,127,163,0.45)";
          ctx.lineWidth = 1;
        }
        ctx.stroke();
      }

      for (const n of report.nodes) {
        if (n.pruned) {
          const r = rOf(n.ply);
          ctx.beginPath();
          ctx.arc(cx, cy, r, -n.a1, -n.a0, true);
          ctx.strokeStyle = "rgba(192,86,58,0.22)";
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      }

      let vmax = 1e-6;
      for (const n of report.nodes) {
        if (n.value != null) vmax = Math.max(vmax, Math.abs(n.value));
      }

      for (const n of report.nodes) {
        const r = rOf(n.ply);
        const px = cx + Math.cos(n.theta) * r;
        const py = cy - Math.sin(n.theta) * r;
        if (n.pruned) {
          ctx.fillStyle = "rgba(92,99,112,0.55)";
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
          continue;
        }
        const [cr, cg, cb] = planckColor(((n.value ?? 0) / vmax) * 180, 280);
        const rad = n.pv ? 5.5 : n.ply === 0 ? 6 : 3.4;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
        if (n.pv) {
          ctx.strokeStyle = "#eceae4";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        if (hover && hover.id === n.id) {
          ctx.strokeStyle = "#eceae4";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(px, py, rad + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "#8b93a0";
      ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("lit = visited · faint arc = pruned wedge · ring = PV", 12, h - 12);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [report, hover]);

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!report) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.46;
    const rings = report.depth + 1;
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;
    let best: TreeNode | null = null;
    let dmin = 14;
    for (const n of report.nodes) {
      const r = (n.ply / rings) * R;
      const px = cx + Math.cos(n.theta) * r;
      const py = cy - Math.sin(n.theta) * r;
      const d = Math.hypot(px - mx, py - my);
      if (d < dmin) {
        dmin = d;
        best = n;
      }
    }
    setHover(best);
  };

  if (!report) return <p className="text-sm text-muted">Running search…</p>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {SCENARIOS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setScenario(f.id)}
            className={cn(
              "h-11 rounded-full px-3 text-xs sm:h-8",
              scenario === f.id ? "bg-accent text-accent-fg" : "border border-line text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-muted text-pretty">{report.note}</p>
      <div className="relative min-h-64 flex-1">
        <canvas
          ref={canvasRef}
          className="size-full"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
        {hover && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs tabular-nums text-fg">
            ply {hover.ply} · {hover.label}
            {hover.pruned ? " · pruned" : hover.value != null ? ` · v ${hover.value.toFixed(3)}` : ""}
            {hover.pv ? " · PV" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
