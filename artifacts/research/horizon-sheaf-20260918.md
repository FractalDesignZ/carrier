# Research brief — Horizon mode (Smith disk + Möbius sheaf)

- Depth: L4 (load-bearing physics vs constructed criterion)
- As of: 2026-09-18 19:20 CDT
- Decision gated: what Carrier may claim when it puts CMB geometry on a Smith chart

## Claim inventory

- [load-bearing] Reflection coefficient of a normalized impedance is the Möbius map `Γ = (z−1)/(z+1)`, inverse `z = (1+Γ)/(1−Γ)`. Passive Re(z)≥0 fills the unit disk. **primary** — Pozar, Steer; Wikipedia/Smith chart identities.
- [load-bearing] Jacobian of the inverse map: `dz/dΓ = 2/(1−Γ)²`, so `A(Γ) = |dz/dΓ| = 2/|1−Γ|²`. The blow-up is at `Γ → 1` (open-circuit point), not uniformly on `|Γ|=1`. **verified** in `smith.ts` tests.
- [load-bearing] Stereographic projection from the north pole, `ζ = (x+iy)/(1−z)`, is conformal; equator → unit circle; southern hemisphere → `|ζ|<1`. Rotations of S² conjugate to Möbius maps in PSU(2). **primary** — Arnold–Rogness; Riemann sphere.
- [load-bearing] Cellular sheaf on a graph: coboundary `(δx)_e = x_head − T_e x_tail`. Sheaf Laplacian `L = δ*δ`. `ker L = ker δ = H⁰(F)` (global sections). **primary** — Hansen–Ghrist, arXiv:1808.01513; *J. Appl. Comput. Topol.*
- [load-bearing] HEALPix Nside=1 has 12 pixels whose centers are the icosahedron vertices. Carrier’s 12-port graph is that 1-skeleton, not a WMAP analysis product.
- [constructed] Edge maps `T_e ∈ GL(2,ℂ)` are built so a planted affine section `x_v = [Γ_v, 1]ᵀ` is a global section when twist = 0 (`T_e` is a translation in Γ). Twist inserts an SU(2) factor; cycle holonomy leaves I; `λ_min` lifts. This is an engine, not a measured CMB sheaf.
- [constructed] Local/global “mutual information” is the Gaussian formula `log₂(1 + ‖signal‖² / MSE)` on planted Γ vs local reads vs the near-kernel projection. Not Shannon MI of a cosmological field, not GCP.
- [analogy] Calling the last-scattering sphere a “carrier wave” for this disk is geometric (same S², same stereographic chart). It is not a claim that microwave anisotropies are RF ports.
- [contested] Holographic-consciousness / GCP readings of the CMB remain Screen-mode, not Horizon-mode.

## Qualified picture

Horizon is a **physics instrument** (Smith identities, sheaf Laplacian, conformal chart) whose **Digital Horizon** lights are a **criterion on the constructed 12-port sheaf**:

```
onset ⇔ I(B; O_loc) ≤ ε₁  ∧  I(B; X_sheaf) ≥ ε₂  ∧  λ_k(L) ≤ τ  ∧  |Γ̄| ≥ ρ*
```

Do not say the WMAP ILC “has a Digital Horizon.” Do say: local observers on this sheaf can lose the planted section while the kernel still carries it.

## Verified numbers (this engine)

| Identity | Value |
|---|---|
| A(0) | 2 |
| A(1/2) | 8 |
| stereo(equator) | \|ζ\| = 1 |
| twist = 0 | λ_min ≲ 1e−8, face holonomy = I |
| HEALPix Nside=1 | 12 vertices, 30 edges, 20 triangular faces |
