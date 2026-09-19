# Research brief — ingesting real CMB data into Carrier

- Depth: L4
- Decision gated: which public CMB products a browser can analyze without lying
- As of: 2026-09-18 18:30 CDT

## Claim inventory

- [load-bearing] Planck SMICA Nside=2048 IQU FITS is 2.013 GB (IRSA `COM_CMB_IQU-smica_2048_R3.00_full.fits`). A browser engine cannot ship or parse that. **primary** (engineering) — HEAD Content-Length 2013312960.
- [load-bearing] Planck PR3 TT spectra *are* the analysis product cosmologists fit: Commander ℓ=2–29 (86% sky) + Plik half-mission ℓ≥30, plus the base-ΛCDM theory curve. Files are 7–201 kB ASCII. **primary** — Planck 2020 A&A 641 A5/A6; IRSA cosmoparams.
- [load-bearing] WMAP 9-year ILC is a public full-sky ΔT map at Nside=512 nested, Galactic, mK thermodynamic, ~24 MB. Bennett et al. 2013 ApJS 208, 20. **primary** — NASA LAMBDA `wmap_ilc_9yr_v5.fits`.
- [load-bearing] Nested ud_grade 512→64 is the mean of 64 children. Pixel scale 55′, matched to the ILC’s ~1° beam. Harmonic analysis honest to ℓ ≲ 100. **corroborated** — HEALPix nested child indexing.
- [load-bearing] Discrete HEALPix quadrature a_ℓm = Ω Σ T_p Y_ℓm(p) recovers D₂ = 213 μK² vs Planck Commander D₂ = 226 μK² (68% interval +533/−132). **verified** this ingest.
- [context] Residual Galactic plane remains in a full-sky ILC. No mask is applied; that is labeled.
- [context] “CMB as holographic consciousness screen” remains contested and is not this data.

## Qualified picture

Process two real products, not a pretty JPEG:

1. **Sky:** WMAP 9-year ILC pixels (μK), Nside=64 nested, monopole subtracted.
2. **Spectrum:** Planck PR3 TT full + binned with errors + best-fit theory.
3. **Analysis:** measure a_ℓm from the ILC, recover D_ℓ, isolate the *measured* mode, probe look-direction ΔT.

Do not call the sphere “Planck SMICA.” Do not call a Gaussian draw “flight data.” Gaussian remains a comparison sky.

## Verified numbers (this ingest)

| Quantity | Value |
|---|---|
| ILC monopole (removed) | 2.039 μK |
| Nside=64 RMS | 66.51 μK |
| Map D₂ | 213.04 μK² |
| Planck D₂ | 225.90 μK² |
| Map D₃ | 1040 μK² |
| Planck D₃ | 937 μK² |
