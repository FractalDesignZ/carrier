import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MAP_HEIGHT, MAP_WIDTH } from "@/lib/cmb/constants";
import { useEngine } from "@/lib/engine-store";

type Props = {
  rgba: Uint8Array | null;
};

export function SkyCanvas({ rgba }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const texRef = useRef<THREE.DataTexture | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const torusRef = useRef<THREE.Mesh | null>(null);
  const screenRef = useRef<THREE.LineSegments | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const interior = useEngine((s) => s.interior);
  const holographic = useEngine((s) => s.holographic);
  const coherence = useEngine((s) => s.coherence);
  const reduced = useEngine((s) => s.reducedMotion);
  const mode = useEngine((s) => s.mode);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07080b, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 40);
    camera.position.set(0, 0.15, 2.55);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.45;
    controls.maxDistance = 5.5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const data = new Uint8Array(MAP_WIDTH * MAP_HEIGHT * 4);
    data.fill(20);
    const tex = new THREE.DataTexture(data, MAP_WIDTH, MAP_HEIGHT, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    texRef.current = tex;

    const geo = new THREE.SphereGeometry(1, 192, 96);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
    matRef.current = mat;
    const sphere = new THREE.Mesh(geo, mat);
    sphereRef.current = sphere;
    scene.add(sphere);

    const eqPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      eqPts.push(new THREE.Vector3(Math.cos(a) * 1.015, 0, Math.sin(a) * 1.015));
    }
    const eq = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(eqPts),
      new THREE.LineBasicMaterial({ color: 0x2a2e38, transparent: true, opacity: 0.7 }),
    );
    scene.add(eq);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.SphereGeometry(1.22, 24, 12)),
      new THREE.LineBasicMaterial({ color: 0x4d7fa3, transparent: true, opacity: 0.22 }),
    );
    screenRef.current = wire;
    wire.visible = false;
    scene.add(wire);

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.018, 12, 160),
      new THREE.MeshBasicMaterial({ color: 0x8b93a0, transparent: true, opacity: 0.35 }),
    );
    torus.rotation.x = Math.PI / 2.4;
    torusRef.current = torus;
    torus.visible = false;
    scene.add(torus);

    const N = 96;
    const pPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random();
      const v = Math.random();
      const th = Math.acos(2 * u - 1);
      const ph = 2 * Math.PI * v;
      const r = 1.08;
      pPos[i * 3] = r * Math.sin(th) * Math.cos(ph);
      pPos[i * 3 + 1] = r * Math.cos(th);
      pPos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0xc5ccd4,
        size: 0.018,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      }),
    );
    pointsRef.current = points;
    points.visible = false;
    scene.add(points);

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(0, 0);
    let lastProbe = 0;
    const probe = () => {
      const sph = sphereRef.current;
      if (!sph) return;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(sph);
      const hit = hits[0];
      if (!hit?.uv) return;
      const theta = hit.uv.y * Math.PI;
      const phi = hit.uv.x * Math.PI * 2;
      useEngine.getState().setLook(theta, phi);
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      controls.update();
      if (!reduced) {
        sphere.rotation.y += dt * 0.025;
        torus.rotation.z += dt * 0.08;
        wire.rotation.y -= dt * 0.01;
        const matP = points.material as THREE.PointsMaterial;
        matP.opacity = 0.35 + 0.25 * Math.sin(now * 0.0018);
      }
      if (now - lastProbe > 180) {
        lastProbe = now;
        probe();
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      geo.dispose();
      mat.dispose();
      tex.dispose();
      eq.geometry.dispose();
      (eq.material as THREE.Material).dispose();
      wire.geometry.dispose();
      (wire.material as THREE.Material).dispose();
      torus.geometry.dispose();
      (torus.material as THREE.Material).dispose();
      pGeo.dispose();
      (points.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      texRef.current = null;
      matRef.current = null;
      sphereRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const tex = texRef.current;
    if (!tex || !rgba) return;
    (tex.image.data as Uint8Array).set(rgba);
    tex.needsUpdate = true;
  }, [rgba]);

  useEffect(() => {
    const mat = matRef.current;
    const cam = cameraRef.current;
    const controls = controlsRef.current;
    if (!mat || !cam || !controls) return;
    mat.side = interior ? THREE.BackSide : THREE.FrontSide;
    if (interior) {
      cam.position.set(0, 0, 0.12);
      controls.minDistance = 0.04;
      controls.maxDistance = 0.55;
    } else {
      cam.position.set(0, 0.15, 2.55);
      controls.minDistance = 1.45;
      controls.maxDistance = 5.5;
    }
    controls.update();
  }, [interior]);

  useEffect(() => {
    if (screenRef.current) screenRef.current.visible = holographic || mode === "screen";
    if (torusRef.current) torusRef.current.visible = holographic || mode === "screen";
    if (pointsRef.current) pointsRef.current.visible = coherence;
  }, [holographic, coherence, mode]);

  return <div ref={hostRef} className="absolute inset-0 bg-bg" />;
}
