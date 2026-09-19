# CARRIER

Last-scattering engine. WMAP ILC on a sphere, Planck TT on a spectrum, Smith/sheaf geometry on a 12-port Horizon. Finite certificates. Claim chips on every mode.

**Digital Horizon is a criterion on a constructed sheaf — not a sky measurement, not GCP, not a consciousness detector.**

Smith identities, stereographic projection, and the sheaf Laplacian are physics. Applying the four-inequality onset test to the CMB, or reading it as a holographic screen, is constructed / contested. The engine will not let those claims share a chip.

## What it actually does

Eight instruments. One last-scattering sphere. Auth off. No database.

| Mode | Chip | What you can do |
|---|---|---|
| **Surface** | Physics | Rotate the WMAP 9-year ILC (Nside=64, monopole subtracted, µK). Probe ΔT. Interior / grain. T₀ = 2.72548 K, z⋆ ≈ 1090. |
| **Multipoles** | Physics | Isolate a real spherical harmonic Y_ℓm on the observed sky (ℓ ≤ 48 from shipped a_ℓm) or a Gaussian comparison draw. Cosine / sine. Mix against the residual field. |
| **Acoustic** | Physics | Planck PR3 TT (full + binned + base-ΛCDM theory) against D_ℓ recovered from the map. First peak at ℓ ≈ 220.6 is a Planck number, not a fit from this engine. |
| **Matrix** | Analogy | Prime-spiral analog on the same sphere. Not a CMB claim. |
| **Feed** | Physics | 1D series → lattice (phase / Sacks / Ulam / delay). Periodogram, RMT bulk, residual bursts. Feeds: Shiller S&P 500 log-returns, n² mod 41 control lattice, planted sensor, diurnal traffic, paste. Polar will not invent prime rays in a market. |
| **Prune** | Physics | α–β geometric search on a toy tree. Adversary / supply / sensor. Move ordering + futility. Not a chess engine. |
| **Horizon** | Physics | Stereoproject the sphere onto the Smith disk. Plant Γ on the HEALPix Nside=1 icosahedron (12 verts, 30 edges). Run L = δ\*δ. Four lights: local collapse, sheaf persist, near-kernel, boundary. **Drive to horizon** lights all four on the constructed sheaf. |
| **Screen** | Contested | Holographic overlay. Explicitly contested. Stays off the physics chip. |

Feed, Prune, and Horizon do not need the WMAP map. Surface / Multipoles / Acoustic do.

## Horizon — what is computed

Bridge: last-scattering S² → stereographic ℂ → unit disk. Equator → \|ζ\| = 1. Southern hemisphere → interior of the Smith chart.

Identities (load-bearing, tested):

```
Γ = (z − 1) / (z + 1)
z = (1 + Γ) / (1 − Γ)
A(Γ) = 2 / |1 − Γ|²     singular at Γ → 1, not uniformly on |Γ| = 1
A(0) = 2
A(1/2) = 8
```

Cellular sheaf on the Nside=1 1-skeleton. Stalks ℂ² ≅ ℝ⁴. Edge maps T_e ∈ GL(2,ℂ). Coboundary (δx)_e = x_head − T_e x_tail. Laplacian L = δ\*δ, so ker L = H⁰. Twist = 0 plants an affine section x_v = [Γ_v, 1]ᵀ via translations → λ_min ≲ 1e−8 and face holonomy = I. Twist inserts SU(2); holonomy leaves I; the kernel lifts.

Digital Horizon (constructed criterion, eight-draw Gaussian-SNR MI proxy in bits):

```
onset  ⇔  I_loc ≤ 0.35  ∧  I_sheaf ≥ 0.55  ∧  λ₄ ≤ τ  ∧  |Γ̄| ≥ 0.72
```

Do not say the WMAP ILC “has a Digital Horizon.” Do say: local observers on this sheaf can lose the planted section while the kernel still carries it.

Drive preset: mismatch 0.88, scramble 3.2, twist 0, τ = 0.08.

## Data shipped

- **Sky** — WMAP 9-year ILC, Bennett et al. 2013, ApJS 208, 20. Native HEALPix nested Nside=512 Galactic; shipped equal-area average Nside=64, µK, monopole subtracted. Plus a_ℓm through ℓ = 48.
- **Spectrum** — Planck PR3 TT full, binned, and base-ΛCDM theory (COM_PowerSpect_CMB-*). Planck Collaboration 2020, A&A 641, A5 / A6.
- **Market sample** — Shiller S&P 500 monthly, log-return channel.

WMAP and Planck data are public. Cite the papers. Planck SMICA Nside=2048 is not shipped (2 GB); the official TT spectrum is the Planck analysis product, the pixel-level last-scattering geometry is the WMAP ILC.

See `public/data/cmb/CREDITS.txt`.

## Run

```bash
npm install
npm run dev
```

`npm test` includes the sheaf identities (`src/lib/geom/sheaf.test.ts`). `npm run typecheck` and `npm run build` are the other gates.

Auth and database stay off. `localStorage` / zustand only.

## Layout

```
src/components/engine/   Surface, Horizon, Feed, Prune, Inspector
src/lib/cmb/             WMAP/Planck loaders, Y_ℓm, colormap
src/lib/geom/smith.ts    Γ, z, A(Γ), stereo, GL(2,ℂ)
src/lib/geom/sheaf.ts    icosahedron, L = δ*δ, Digital Horizon
src/lib/geom/series.ts   feeds
src/lib/geom/transform.ts periodogram, RMT, lattices
src/lib/geom/prune.ts    α–β tree
artifacts/research/      claim inventory
```

## Claim posture

- Physics: Smith chart, stereographic chart, sheaf Laplacian, WMAP ILC, Planck TT, DFT/RMT on a named series.
- Analogy: prime spiral, “carrier wave” as a name for the sphere.
- Constructed: Digital Horizon lights, planted Γ section, Gaussian-SNR “mutual information.”
- Contested: holographic-consciousness / GCP readings. Screen mode only.

A mode chip is not a theorem about the sky.

## Not this

Not a Planck analysis pipeline. Not a full-resolution SMICA viewer. Not RF network design software. Not a chess engine. Not a brokerage. Not a measurement of a cosmological horizon.
