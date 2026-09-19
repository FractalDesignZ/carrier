import { useEffect, useRef } from "react";
import type { RmtReport } from "@/lib/geom/transform";

export function FeedSpectrum({
  pg,
  eigs,
  n,
}: {
  pg: { k: number; p: number }[];
  eigs: RmtReport | null;
  n: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
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
      const maxP = Math.max(1e-9, ...pg.map((p) => p.p));
      const kmax = Math.max(2, ...pg.map((p) => p.k));
      const xOf = (k: number) => pad.l + (k / kmax) * (w - pad.l - pad.r);
      const yOf = (p: number) => pad.t + (1 - p / (maxP * 1.08)) * (h - pad.t - pad.b);
      ctx.beginPath();
      pg.forEach((p, i) => {
        const x = xOf(p.k);
        const y = yOf(p.p);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#c5ccd4";
      ctx.lineWidth = 1.3;
      ctx.stroke();
      if (eigs) {
        const hiX = w * 0.78;
        const maxE = Math.max(eigs.hi, ...eigs.eigs, 1);
        eigs.eigs.forEach((l, i) => {
          const x = hiX + (i / Math.max(1, eigs.eigs.length)) * (w - hiX - pad.r);
          const y1 = yOf(0);
          const y0 = pad.t + (1 - l / (maxE * 1.08)) * (h - pad.t - pad.b);
          ctx.strokeStyle = l > eigs.hi * 1.05 ? "#c0563a" : "rgba(77,127,163,0.8)";
          ctx.beginPath();
          ctx.moveTo(x, y1);
          ctx.lineTo(x, y0);
          ctx.stroke();
        });
      }
      ctx.fillStyle = "#8b93a0";
      ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("k", w - 14, h - 4);
      ctx.fillText(`N=${n}`, pad.l, h - 4);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [pg, eigs, n]);

  return (
    <div className="relative h-24 w-full">
      <canvas ref={canvasRef} className="size-full" aria-label="Periodogram and RMT eigenvalues" />
    </div>
  );
}
