/**
 * Fully normalized associated Legendre Ñ_ℓ^m(x) = N_ℓm P_ℓ^m(x)
 * with Condon–Shortley phase, so Y_ℓ0 = Ñ_ℓ0 and the real pair is
 * Y_ℓm^c = √2 Ñ_ℓm cos(mφ), Y_ℓm^s = √2 Ñ_ℓm sin(mφ).
 */
export function normalizedLegendre(lmax: number, x: number): number[][] {
  const P: number[][] = new Array(lmax + 1);
  for (let l = 0; l <= lmax; l++) P[l] = new Array(l + 1).fill(0);

  const somx2 = Math.sqrt(Math.max(0, (1 - x) * (1 + x)));
  let pmm = 1 / Math.sqrt(4 * Math.PI);
  P[0][0] = pmm;

  for (let m = 1; m <= lmax; m++) {
    pmm *= -somx2 * Math.sqrt((2 * m + 1) / (2 * m));
    P[m][m] = pmm;
    if (m + 1 <= lmax) {
      P[m + 1][m] = x * Math.sqrt(2 * m + 3) * pmm;
    }
  }

  for (let m = 0; m <= lmax; m++) {
    for (let l = m + 2; l <= lmax; l++) {
      const n1 = Math.sqrt(((2 * l + 1) / (2 * l - 1)) * ((l - m) / (l + m)));
      const n2 = Math.sqrt(
        ((2 * l + 1) / (2 * l - 3)) * (((l - m) * (l - m - 1)) / ((l + m) * (l + m - 1))),
      );
      const a = (n1 * (2 * l - 1)) / (l - m);
      const b = (n2 * (l + m - 1)) / (l - m);
      P[l][m] = a * x * P[l - 1][m] - b * P[l - 2][m];
    }
  }
  return P;
}

/** Real spherical harmonic Y_ℓm at (θ, φ). m ≥ 0; kind 'c' cosine, 's' sine (ignored at m=0). */
export function realYlm(l: number, m: number, theta: number, phi: number, kind: "c" | "s" = "c") {
  const P = normalizedLegendre(l, Math.cos(theta));
  const n = P[l][m];
  if (m === 0) return n;
  const trig = kind === "s" ? Math.sin(m * phi) : Math.cos(m * phi);
  return Math.SQRT2 * n * trig;
}

export function ylmLabel(l: number, m: number, kind: "c" | "s") {
  if (m === 0) return `Y_${l}^0`;
  return kind === "s" ? `Y_${l}^{${m} s}` : `Y_${l}^{${m} c}`;
}
