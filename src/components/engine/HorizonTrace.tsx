import { useEffect, useRef } from "react";
import type { HorizonReport } from "@/lib/geom/sheaf";

export function HorizonTrace({ report }: { report: HorizonReport | null }) {
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
      const shown = report.evals.slice(0, 24);
      const max = Math.max(report.tau * 1.8, ...shown, 0.05);
      const bw = (w - pad.l - pad.r) / shown.length;
      const yOf = (v: number) => pad.t + (1 - v / max) * (h - pad.t - pad.b);
      ctx.strokeStyle = "rgba(176,137,72,0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, yOf(report.tau));
      ctx.lineTo(w - pad.r, yOf(report.tau));
      ctx.stroke();
      ctx.setLineDash([]);
      shown.forEach((l, i) => {
        const x = pad.l + i * bw + bw * 0.25;
        const y = yOf(Math.max(0, l));
        const barH = h - pad.b - y;
        ctx.fillStyle = l <= report.tau ? "#6a8f73" : "#4d7fa3";
        ctx.fillRect(x, y, Math.max(2, bw * 0.5), Math.max(1, barH));
      });
      ctx.fillStyle = "#8b93a0";
      ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("λ(L)  near-kernel ≤ τ", pad.l, h - 4);
      ctx.fillText(`k(τ)=${report.kTau}  λ₁=${report.lambdaMin.toExponential(1)}`, w - 168, h - 4);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [report]);

  return <canvas ref={canvasRef} className="h-16 w-full sm:h-20" />;
}
