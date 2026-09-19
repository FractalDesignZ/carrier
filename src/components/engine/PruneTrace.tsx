import { useEffect, useRef } from "react";
import type { PruneReport } from "@/lib/geom/prune";

export function PruneTrace({ report }: { report: PruneReport | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      ctx.clearRect(0, 0, w, h);
      const pad = { l: 8, r: 8, t: 10, b: 16 };
      const counts = Array.from({ length: report.depth + 1 }, () => ({ v: 0, p: 0 }));
      for (const n of report.nodes) {
        if (!counts[n.ply]) continue;
        if (n.pruned) counts[n.ply].p += 1;
        else counts[n.ply].v += 1;
      }
      const max = Math.max(1, ...counts.map((c) => c.v + c.p));
      const bw = (w - pad.l - pad.r) / counts.length;
      counts.forEach((c, i) => {
        const x = pad.l + i * bw + 4;
        const barW = Math.max(8, bw - 10);
        const hV = ((c.v) / max) * (h - pad.t - pad.b);
        const hP = ((c.p) / max) * (h - pad.t - pad.b);
        const yBase = h - pad.b;
        ctx.fillStyle = "rgba(192,86,58,0.45)";
        ctx.fillRect(x, yBase - hP, barW, hP);
        ctx.fillStyle = "#4d7fa3";
        ctx.fillRect(x, yBase - hP - hV, barW, hV);
      });
      ctx.fillStyle = "#8b93a0";
      ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("ply  visited / pruned", pad.l, h - 4);
      ctx.fillText(`${report.visited} / ${report.fullNodes.toFixed(0)}`, w - 88, h - 4);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [report]);

  return (
    <div className="relative h-24 w-full">
      <canvas ref={canvasRef} className="size-full" aria-label="Visited versus pruned nodes by ply" />
    </div>
  );
}
