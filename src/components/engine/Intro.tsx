import { Button } from "@/components/ui/button";
import { useEngine } from "@/lib/engine-store";

export function Intro({ loaded, error }: { loaded: boolean; error: string | null }) {
  const setEntered = useEngine((s) => s.setEntered);
  const setMode = useEngine((s) => s.setMode);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-start sm:items-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--color-bg) 0%, color-mix(in oklab, var(--color-bg) 82%, transparent) 46%, transparent 78%)",
        }}
      />
      <div className="relative max-w-xl px-6 py-10 sm:px-10">
        <p className="mb-4 font-mono text-xs tracking-[0.22em] text-muted uppercase">
          Last-scattering geometry
        </p>
        <h1 className="font-sans text-5xl font-medium tracking-tight text-fg text-balance sm:text-6xl">
          CARRIER
        </h1>
        <p className="mt-5 max-w-prose text-base leading-relaxed text-muted text-pretty">
          The sphere is the WMAP 9-year ILC. Horizon stereoprojects that geometry onto the Smith
          disk and runs a Möbius sheaf Laplacian on the HEALPix Nside=1 skeleton. Digital Horizon
          is a criterion on that sheaf — local collapse with a persisting kernel — not a sky
          measurement. Feed and Prune stay 1D instruments. Gaussian is a comparison draw, not the sky.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={() => setEntered(true)}>
            {error ? "Enter without map" : loaded ? "Enter the surface" : "Enter"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMode("feed");
              setEntered(true);
            }}
          >
            Feed a series
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMode("horizon");
              setEntered(true);
            }}
          >
            Open Horizon
          </Button>
          {!loaded && !error && (
            <p className="font-mono text-xs text-faint">WMAP still reading — Feed, Prune, and Horizon do not need it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
