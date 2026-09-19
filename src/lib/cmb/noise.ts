function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hash3(ix: number, iy: number, iz: number, seed: number) {
  let n = Math.imul(ix + seed, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296 * 2 - 1;
}

function valueNoise3(x: number, y: number, z: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const ty = fade(y - y0);
  const tz = fade(z - z0);
  const n000 = hash3(x0, y0, z0, seed);
  const n100 = hash3(x0 + 1, y0, z0, seed);
  const n010 = hash3(x0, y0 + 1, z0, seed);
  const n110 = hash3(x0 + 1, y0 + 1, z0, seed);
  const n001 = hash3(x0, y0, z0 + 1, seed);
  const n101 = hash3(x0 + 1, y0, z0 + 1, seed);
  const n011 = hash3(x0, y0 + 1, z0 + 1, seed);
  const n111 = hash3(x0 + 1, y0 + 1, z0 + 1, seed);
  const nx00 = lerp(n000, n100, tx);
  const nx10 = lerp(n010, n110, tx);
  const nx01 = lerp(n001, n101, tx);
  const nx11 = lerp(n011, n111, tx);
  const nxy0 = lerp(nx00, nx10, ty);
  const nxy1 = lerp(nx01, nx11, ty);
  return lerp(nxy0, nxy1, tz);
}

/** Band-limited grain on the sphere; frequencies stand in for ℓ ≳ ℓ_max. */
export function sphereGrain(x: number, y: number, z: number, seed: number, scale: number) {
  let s = 0;
  let amp = 1;
  let freq = 6;
  let norm = 0;
  for (let o = 0; o < 5; o++) {
    s += amp * valueNoise3(x * freq + o * 19.1, y * freq, z * freq, seed + o * 97);
    norm += amp;
    amp *= 0.62;
    freq *= 1.85;
  }
  return (s / norm) * scale;
}
