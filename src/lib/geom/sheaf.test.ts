import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amplification,
  c,
  cabs,
  gammaFromZ,
  stereoFromSphere,
  zFromGamma,
} from "./smith.ts";
import {
  faceLoop,
  icosaEdges,
  icosahedron,
  jacobiSymmetric,
  runHorizon,
  sectionEnergy,
  sheafLaplacian,
} from "./sheaf.ts";

describe("Smith identities", () => {
  it("inverts z ↔ Γ", () => {
    const z = c(1.4, 0.6);
    const g = gammaFromZ(z);
    const back = zFromGamma(g);
    assert.ok(Math.abs(back.re - z.re) < 1e-10);
    assert.ok(Math.abs(back.im - z.im) < 1e-10);
  });

  it("A(0)=2 and A(1/2)=8", () => {
    assert.equal(amplification(c(0)), 2);
    assert.ok(Math.abs(amplification(c(0.5)) - 8) < 1e-12);
  });

  it("equator stereoprojects to the unit circle", () => {
    const z = stereoFromSphere(1, 0, 0);
    assert.ok(Math.abs(cabs(z) - 1) < 1e-12);
    const s = stereoFromSphere(0, 1, 0);
    assert.ok(Math.abs(cabs(s) - 1) < 1e-12);
  });

  it("south pole maps near the origin", () => {
    const g = stereoFromSphere(0, 0, -1);
    assert.ok(cabs(g) < 1e-12);
  });
});

describe("Icosahedral HEALPix skeleton", () => {
  it("has 12 vertices and 30 edges", () => {
    const v = icosahedron();
    const e = icosaEdges(v);
    assert.equal(v.length, 12);
    assert.equal(e.length, 30);
  });

  it("has unit vertices", () => {
    for (const p of icosahedron()) {
      assert.ok(Math.abs(Math.hypot(p.x, p.y, p.z) - 1) < 1e-12);
    }
  });

  it("closes a 3-cycle face", () => {
    const loop = faceLoop(icosaEdges(icosahedron()));
    assert.equal(loop.length, 4);
    assert.equal(loop[0], loop[3]);
  });
});

describe("Sheaf Laplacian", () => {
  it("planted section is harmonic when twist = 0", () => {
    const r = runHorizon({ mismatch: 0.4, scramble: 0, twist: 0, tau: 0.05, seed: 1 });
    const L = sheafLaplacian(r.nodes.length, r.edges);
    const n = r.nodes.length * 4;
    const x = new Float64Array(n);
    for (let v = 0; v < r.nodes.length; v++) {
      x[v * 4] = r.nodes[v].gamma.re;
      x[v * 4 + 1] = r.nodes[v].gamma.im;
      x[v * 4 + 2] = 1;
    }
    const E = sectionEnergy(L, x, n);
    assert.ok(E < 1e-8, `energy ${E}`);
    assert.ok(r.lambdaMin < 1e-6, `λmin ${r.lambdaMin}`);
    assert.ok(r.holonomyFrob < 1e-6, `holonomy ${r.holonomyFrob}`);
  });

  it("twist lifts the kernel and holonomy", () => {
    const flat = runHorizon({ mismatch: 0.4, scramble: 0, twist: 0, tau: 0.05, seed: 1 });
    const bent = runHorizon({ mismatch: 0.4, scramble: 0, twist: 0.6, tau: 0.05, seed: 1 });
    assert.ok(bent.lambdaMin > flat.lambdaMin + 0.01, `${bent.lambdaMin} vs ${flat.lambdaMin}`);
    assert.ok(bent.holonomyFrob > 0.05, `holonomy ${bent.holonomyFrob}`);
  });

  it("scramble drops local MI while the kernel still carries the section", () => {
    const r = runHorizon({ mismatch: 0.88, scramble: 3.5, twist: 0, tau: 0.08, seed: 7 });
    assert.ok(r.iLoc < r.iSheaf, `I_loc ${r.iLoc} I_sheaf ${r.iSheaf}`);
    assert.ok(r.flags.nearKernel, "near-kernel");
    assert.ok(r.flags.localCollapse, "local collapse");
    assert.ok(r.flags.globalPersist, "global persist");
    assert.ok(r.flags.boundary, "boundary");
    assert.equal(r.flags.onset, true);
    assert.equal(r.state, "horizon");
  });

  it("Jacobi recovers a known diagonal", () => {
    const n = 3;
    const A = new Float64Array([
      2, 0.4, 0,
      0.4, 3, 0.1,
      0, 0.1, 1,
    ]);
    const { evals } = jacobiSymmetric(A, n);
    const s = evals.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 6) < 1e-8);
    assert.ok(evals[0] <= evals[1] && evals[1] <= evals[2]);
  });
});
