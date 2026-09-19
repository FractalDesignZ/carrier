import { useEffect, useRef } from "react";
import { PLANCK_TT_EXTREMA } from "@/lib/cmb/constants";
import type { Alm, PlanckBinned, TheoryPt } from "@/lib/cmb/observed";
import { useEngine } from "@/lib/engine-store";

type Props = {
  tall?: boolean;
  theory?: TheoryPt[];
  binned?: PlanckBinned[];
  mapDl?: Alm["Dl"];
};

export function SpectrumPlot({ tall = false, theory = [], binned = [], mapDl = [] }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ell = useEngine((s) => s.ell);
  const setEll = useEngine((s) => s.setEll);
  const source = useEngine((s) => s.source);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const w = parent.clientWidth || 300;
      const h = parent.clientHeight || 80;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const pad = { l: 8, r: 8, t: 10, b: 18 };
      const peakD = Math.max(
        5800,
        ...binned.map((d) => d.D),
        ...theory.map((d) => d.D),
        ...mapDl.map((d) => d.D),
      );
      const maxD = peakD;
      const xOf = (L: number) =>
        pad.l + ((Math.sqrt(L) - Math.sqrt(2)) / (Math.sqrt(2300) - Math.sqrt(2))) * (w - pad.l - pad.r);
      const yOf = (D: number) => pad.t + (1 - D / (maxD * 1.08)) * (h - pad.t - pad.b);

      if (theory.length > 1) {
        ctx.beginPath();
        theory.forEach((p, i) => {
          const x = xOf(p.ell);
          const y = yOf(p.D);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "rgba(197,204,212,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (binned.length) {
        ctx.strokeStyle = "rgba(236,234,228,0.55)";
        ctx.lineWidth = 1.2;
        for (const p of binned) {
          const x = xOf(p.ell);
          ctx.beginPath();
          ctx.moveTo(x, yOf(p.D - p.errLo));
          ctx.lineTo(x, yOf(p.D + p.errHi));
          ctx.stroke();
        }
        ctx.fillStyle = "#eceae4";
        for (const p of binned) {
          ctx.beginPath();
          ctx.arc(xOf(p.ell), yOf(p.D), 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (mapDl.length > 1) {
        ctx.beginPath();
        mapDl.forEach((p, i) => {
          const x = xOf(p.ell);
          const y = yOf(p.D);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#c0563a";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      for (const ext of PLANCK_TT_EXTREMA) {
        if (ext.kind !== "peak") continue;
        const x = xOf(ext.ell);
        const y = yOf(ext.D);
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = ext.n % 2 === 1 ? "#c0563a" : "#4d7fa3";
        ctx.fill();
      }

      const xSel = xOf(Math.max(2, ell));
      ctx.beginPath();
      ctx.moveTo(xSel, pad.t);
      ctx.lineTo(xSel, h - pad.b);
      ctx.strokeStyle = "rgba(236,234,228,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#8b93a0";
      ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText("ℓ", w - 16, h - 4);
      ctx.fillText("2", pad.l, h - 4);
      ctx.fillText("220", xOf(220.6) - 10, h - 4);
      ctx.fillText("2200", w - 40, h - 4);
      if (mapDl.length) {
        ctx.fillStyle = "#c0563a";
        ctx.fillText("map D_ℓ", pad.l + 18, pad.t + 8);
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [theory, binned, mapDl, ell, source]);

  const onPointer = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const u = (ev.clientX - rect.left) / rect.width;
    const sqrtL = Math.sqrt(2) + u * (Math.sqrt(2300) - Math.sqrt(2));
    const L = Math.round(sqrtL * sqrtL);
    const cap = source === "observed" ? 48 : 48;
    setEll(Math.max(2, Math.min(cap, L)));
  };

  return (
    <div className={`relative w-full ${tall ? "h-44" : "h-24"}`}>
      <canvas
        ref={canvasRef}
        className="size-full cursor-crosshair"
        onPointerDown={onPointer}
        aria-label="Angular power spectrum D ell"
      />
    </div>
  );
}
