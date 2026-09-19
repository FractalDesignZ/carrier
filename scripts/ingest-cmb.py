#!/usr/bin/env python3
"""Downgrade WMAP 9-year ILC and pack Planck PR3 TT products for the browser engine.

Outputs live in public/data/cmb/. The 24 MB FITS is not shipped — only the
derived Nside=64 map, a_ℓm, and official spectra.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np
from astropy.io import fits
from astropy_healpix import HEALPix
from astropy import units as u

ROOT = Path("/workspace")
SRC_FITS = Path("/tmp/cmb/wmap_ilc_9yr_v5.fits")
SRC_SPEC = Path("/tmp/cmb")
OUT = ROOT / "public" / "data" / "cmb"
NSIDE_IN = 512
NSIDE = 64
LMAX = 48
MAP_W = 384
MAP_H = 192


def normalized_legendre_all(lmax: int, x: np.ndarray) -> list[np.ndarray]:
    """Fully normalized associated Legendre Ñ_ℓ^m(x) for all pixels, matching harmonics.ts."""
    npix = x.size
    P: list[np.ndarray] = [np.zeros((npix, l + 1), dtype=np.float64) for l in range(lmax + 1)]
    somx2 = np.sqrt(np.maximum(0.0, (1.0 - x) * (1.0 + x)))
    pmm = np.full(npix, 1.0 / math.sqrt(4.0 * math.pi))
    P[0][:, 0] = pmm
    for m in range(1, lmax + 1):
        pmm = pmm * (-somx2) * math.sqrt((2 * m + 1) / (2 * m))
        P[m][:, m] = pmm
        if m + 1 <= lmax:
            P[m + 1][:, m] = x * math.sqrt(2 * m + 3) * pmm
    for m in range(0, lmax + 1):
        for ell in range(m + 2, lmax + 1):
            n1 = math.sqrt(((2 * ell + 1) / (2 * ell - 1)) * ((ell - m) / (ell + m)))
            n2 = math.sqrt(
                ((2 * ell + 1) / (2 * ell - 3))
                * (((ell - m) * (ell - m - 1)) / ((ell + m) * (ell + m - 1)))
            )
            a = (n1 * (2 * ell - 1)) / (ell - m)
            b = (n2 * (ell + m - 1)) / (ell - m)
            P[ell][:, m] = a * x * P[ell - 1][:, m] - b * P[ell - 2][:, m]
    return P


def map2alm(temp: np.ndarray, nside: int, lmax: int) -> dict:
    hp = HEALPix(nside=nside, order="nested")
    pix = np.arange(hp.npix)
    lon, lat = hp.healpix_to_lonlat(pix)
    phi = lon.to_value(u.rad)
    theta = (0.5 * math.pi) - lat.to_value(u.rad)
    x = np.cos(theta)
    P = normalized_legendre_all(lmax, x)
    omega = 4.0 * math.pi / hp.npix
    sqrt2 = math.sqrt(2.0)
    a0 = np.zeros(lmax + 1)
    ac = [np.zeros(ell + 1) for ell in range(lmax + 1)]
    as_ = [np.zeros(ell + 1) for ell in range(lmax + 1)]
    cosM = np.ones_like(phi)
    sinM = np.zeros_like(phi)
    c1 = np.cos(phi)
    s1 = np.sin(phi)
    for m in range(0, lmax + 1):
        if m == 1:
            cosM = c1.copy()
            sinM = s1.copy()
        elif m >= 2:
            cos_new = c1 * cosM - s1 * sinM
            sin_new = s1 * cosM + c1 * sinM
            cosM, sinM = cos_new, sin_new
        for ell in range(max(m, 2), lmax + 1):
            n = P[ell][:, m]
            if m == 0:
                a0[ell] += omega * np.dot(temp, n)
            else:
                ac[ell][m] += omega * np.dot(temp, sqrt2 * n * cosM)
                as_[ell][m] += omega * np.dot(temp, sqrt2 * n * sinM)
    Dl = []
    for ell in range(2, lmax + 1):
        s = a0[ell] ** 2
        for m in range(1, ell + 1):
            s += ac[ell][m] ** 2 + as_[ell][m] ** 2
        cl = s / (2 * ell + 1)
        Dl.append({"ell": ell, "C": cl, "D": ell * (ell + 1) * cl / (2 * math.pi)})
    return {
        "lmax": lmax,
        "a0": a0.tolist(),
        "ac": [row.tolist() for row in ac],
        "as": [row.tolist() for row in as_],
        "Dl": Dl,
    }


def sample_equirect(temp: np.ndarray, nside: int, width: int, height: int) -> np.ndarray:
    hp = HEALPix(nside=nside, order="nested")
    iy = (np.arange(height) + 0.5) / height
    ix = (np.arange(width) + 0.5) / width
    theta = math.pi * iy
    phi = 2.0 * math.pi * ix
    tt, pp = np.meshgrid(theta, phi, indexing="ij")
    lon = pp * u.rad
    lat = (0.5 * math.pi - tt) * u.rad
    ipix = hp.lonlat_to_healpix(lon.ravel(), lat.ravel())
    field = temp[ipix].reshape(height, width)
    return field.astype(np.float32)


def parse_full(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        p = line.split()
        rows.append(
            {
                "ell": int(float(p[0])),
                "D": float(p[1]),
                "errLo": float(p[2]),
                "errHi": float(p[3]),
            }
        )
    return rows


def parse_binned(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        p = line.split()
        rows.append(
            {
                "ell": float(p[0]),
                "D": float(p[1]),
                "errLo": float(p[2]),
                "errHi": float(p[3]),
                "bestFit": float(p[4]),
            }
        )
    return rows


def parse_theory(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        p = line.split()
        ell = int(float(p[0]))
        if ell < 2:
            continue
        rows.append({"ell": ell, "D": float(p[1])})
        if ell >= 2500:
            break
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    hdul = fits.open(SRC_FITS)
    t_mk = np.array(hdul[1].data["TEMPERATURE"], dtype=np.float64)
    hdul.close()
    t_uk = t_mk * 1000.0
    factor = (NSIDE_IN // NSIDE) ** 2
    npix = 12 * NSIDE * NSIDE
    t64 = t_uk.reshape(npix, factor).mean(axis=1)
    monopole = float(t64.mean())
    t64 = t64 - monopole
    rms = float(np.sqrt(np.mean(t64**2)))

    print(f"nside {NSIDE} npix {npix} monopole {monopole:.4f} μK  rms {rms:.3f} μK")
    print(f"min {t64.min():.2f} max {t64.max():.2f} μK")

    alm = map2alm(t64, NSIDE, LMAX)
    for row in alm["Dl"][:8]:
        print(f"  recovered D_{row['ell']} = {row['D']:.2f} μK²")

    field = sample_equirect(t64, NSIDE, MAP_W, MAP_H)
    (OUT / "wmap-ilc-n64.bin").write_bytes(t64.astype("<f4").tobytes())
    (OUT / "wmap-ilc-eq.bin").write_bytes(field.astype("<f4").tobytes())

    def round_alm(v: float) -> float:
        return float(f"{v:.6g}")

    alm_out = {
        "lmax": LMAX,
        "a0": [round_alm(x) for x in alm["a0"]],
        "ac": [[round_alm(x) for x in row] for row in alm["ac"]],
        "as": [[round_alm(x) for x in row] for row in alm["as"]],
        "Dl": [{"ell": r["ell"], "D": round(r["D"], 4), "C": float(f"{r['C']:.6g}")} for r in alm["Dl"]],
    }
    (OUT / "wmap-ilc-alm.json").write_text(json.dumps(alm_out, separators=(",", ":")))

    full = parse_full(SRC_SPEC / "COM_PowerSpect_CMB-TT-full_R3.01.txt")
    binned = parse_binned(SRC_SPEC / "COM_PowerSpect_CMB-TT-binned_R3.01.txt")
    theory = parse_theory(SRC_SPEC / "COM_PowerSpect_CMB-theory_R3.01.txt")
    # downsample theory for the plot (keep every ell to 200, then stride)
    theory_plot = [r for r in theory if r["ell"] <= 80 or r["ell"] % (2 if r["ell"] < 400 else 4) == 0]
    (OUT / "planck-tt-full.json").write_text(json.dumps(full, separators=(",", ":")))
    (OUT / "planck-tt-binned.json").write_text(json.dumps(binned, separators=(",", ":")))
    (OUT / "planck-tt-theory.json").write_text(json.dumps(theory_plot, separators=(",", ":")))

    # also keep original ASCII for provenance
    for name in [
        "COM_PowerSpect_CMB-TT-full_R3.01.txt",
        "COM_PowerSpect_CMB-TT-binned_R3.01.txt",
        "COM_PowerSpect_CMB-theory_R3.01.txt",
    ]:
        src = SRC_SPEC / name
        if src.exists():
            (OUT / name).write_bytes(src.read_bytes())

    planck_d2 = next(r for r in full if r["ell"] == 2)
    manifest = {
        "sky": {
            "product": "WMAP 9-year Internal Linear Combination",
            "file": "wmap_ilc_9yr_v5.fits",
            "citation": "Bennett et al. 2013, ApJS 208, 20",
            "url": "https://lambda.gsfc.nasa.gov/product/wmap/dr5/ilc_map_info.html",
            "coordinate": "Galactic",
            "ordering": "NESTED",
            "nsideNative": NSIDE_IN,
            "nside": NSIDE,
            "npix": npix,
            "units": "uK_CMB",
            "nativeUnits": "mK thermodynamic",
            "monopoleSubtracted_uK": round(monopole, 5),
            "rms_uK": round(rms, 4),
            "min_uK": round(float(t64.min()), 3),
            "max_uK": round(float(t64.max()), 3),
            "eq": {"width": MAP_W, "height": MAP_H, "file": "wmap-ilc-eq.bin"},
            "healpix": "wmap-ilc-n64.bin",
            "alm": "wmap-ilc-alm.json",
            "lmax": LMAX,
            "beamNote": "ILC effective resolution ~1°. Nside=64 pixels are 55′. Harmonic analysis is honest to ℓ ≲ 100.",
        },
        "spectrum": {
            "product": "Planck PR3 CMB TT",
            "citation": "Planck Collaboration 2020, A&A 641, A5 and A6",
            "full": "planck-tt-full.json",
            "binned": "planck-tt-binned.json",
            "theory": "planck-tt-theory.json",
            "fullNote": "ℓ=2–29 Commander (86% sky); ℓ≥30 Plik half-mission cross-spectrum.",
            "D2_planck": planck_d2,
            "D2_map": next(r for r in alm_out["Dl"] if r["ell"] == 2),
        },
        "claim": "physics",
        "notIncluded": "Planck SMICA Nside=2048 FITS is 2.0 GB — not a browser product. The official TT spectrum is the Planck analysis; the sky pixels are WMAP 9-year ILC.",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("wrote", OUT)
    print("Planck D2", planck_d2)
    print("Map D2", manifest["spectrum"]["D2_map"])


if __name__ == "__main__":
    os.chdir(ROOT)
    main()
