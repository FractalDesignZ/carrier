import { useEffect, useRef, useState } from "react";
import { sacksCoord, sieve, ulamCoord } from "@/lib/cmb/primes";

const LIMIT = 101 ** 2;

export function PrimePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [kind, setKind] = useState<"ulam" | "sacks">("ulam");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const isPrime = sieve(LIMIT);

    const draw = (highlight: number | null) => {
      const w = parent.clientWidth || 300;
      const h = parent.clientHeight || 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07080b";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const maxN = kind === "ulam" ? LIMIT : 9000;
      const span = kind === "ulam" ? 52 : 95;
      const scale = (Math.min(w, h) * 0.46) / span;

      for (let n = 1; n <= maxN; n++) {
        const { x, y } = kind === "ulam" ? ulamCoord(n) : sacksCoord(n);
        const px = cx + x * scale;
        const py = cy - y * scale;
        if (px < 0 || py < 0 || px > w || py > h) continue;
        const prime = isPrime[n] === 1;
        if (!prime && kind === "ulam") {
          if (n % 4 === 0) {
            ctx.fillStyle = "#12151c";
            ctx.fillRect(px - 1, py - 1, 2, 2);
          }
          continue;
        }
        if (!prime) continue;
        ctx.fillStyle = highlight === n ? "#eceae4" : "#4d7fa3";
        const r = kind === "sacks" ? 1.4 : 1.7;
        ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }

      ctx.strokeStyle = "rgba(139,147,160,0.25)";
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    };

    draw(hover);
    const ro = new ResizeObserver(() => draw(hover));
    ro.observe(parent);
    return () => ro.disconnect();
  }, [kind, hover]);

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const span = kind === "ulam" ? 52 : 95;
    const scale = (Math.min(w, h) * 0.46) / span;
    const x = (px - cx) / scale;
    const y = (cy - py) / scale;
    if (kind === "ulam") {
      const gx = Math.round(x);
      const gy = Math.round(y);
      let found: number | null = null;
      for (let n = 1; n <= LIMIT; n++) {
        const c = ulamCoord(n);
        if (c.x === gx && c.y === gy) {
          found = n;
          break;
        }
      }
      setHover(found);
    } else {
      const r = Math.hypot(x, y);
      const n = Math.round(r * r);
      setHover(n > 1 && n < 9000 ? n : null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Integers on a spiral, primes lit. Diagonals are quadratic polynomials — a discrete
          spectral fingerprint, not a spherical harmonic. Visual analog only.
        </p>
        <div className="flex shrink-0 gap-1 rounded-full border border-line p-1">
          <button
            className={`h-8 rounded-full px-3 text-xs ${kind === "ulam" ? "bg-accent text-accent-fg" : "text-muted"}`}
            onClick={() => setKind("ulam")}
          >
            Ulam
          </button>
          <button
            className={`h-8 rounded-full px-3 text-xs ${kind === "sacks" ? "bg-accent text-accent-fg" : "text-muted"}`}
            onClick={() => setKind("sacks")}
          >
            Sacks
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="size-full"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
        {hover != null && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-surface px-2 py-1 font-mono text-xs tabular-nums text-fg">
            n = {hover}
          </div>
        )}
      </div>
    </div>
  );
}
