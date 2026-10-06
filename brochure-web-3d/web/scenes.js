// Escenas 3D compartidas entre la versión web y los renders del PDF.
// Un solo origen: lo que el cliente ve impreso es la misma geometría que gira en la web.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const COLORS = {
  ink: 0x0a0c12,
  panel: 0x1a2030,
  key: 0xffb04a, // luz clave (cálida)
  rim: 0x6fe3f0, // luz de contorno (fría)
  ivory: 0xe9e3d6,
  steel: 0xc9d2e3,
};

const TAU = Math.PI * 2;

// ─────────────────────────────────────────────────────────────
// Escenario: renderer + luz de estudio (clave cálida, contorno frío)
// ─────────────────────────────────────────────────────────────
export function createStage(canvas, { alpha = true, pixelRatio = 1, exposure = 0.92, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0x9fb8ff, 0x140e06, 0.5));

  const key = new THREE.DirectionalLight(0xffd3a3, 3.0);
  key.position.set(-3, 9, 5);
  key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 6;
  scene.add(key);

  const rim = new THREE.DirectionalLight(COLORS.rim, 4.2);
  rim.position.set(6, 2.5, -5);
  scene.add(rim);

  const kick = new THREE.DirectionalLight(COLORS.key, 1.6);
  kick.position.set(-6, -1.5, -3);
  scene.add(kick);

  // Destello que sigue al cursor en la web (en el PDF queda fijo).
  const glint = new THREE.PointLight(0xffffff, 18, 14, 2);
  glint.position.set(1.5, 1.5, 4);
  scene.add(glint);

  return { renderer, scene, camera, lights: { key, rim, kick, glint } };
}

// ─────────────────────────────────────────────────────────────
// Materiales
// ─────────────────────────────────────────────────────────────
export function makeMaterials() {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  return {
    chrome: phys({
      color: 0xe3e9f7,
      metalness: 1,
      roughness: 0.14,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 620],
      envMapIntensity: 1.25,
    }),
    steel: phys({ color: 0xc9d2e3, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
    amber: phys({ color: 0xee7d10, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.55 }),
    cyan: phys({ color: 0x22aec2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.6 }),
    ivory: phys({ color: 0xd9d2c3, roughness: 0.42, clearcoat: 0.6, envMapIntensity: 0.6 }),
    ink: phys({ color: 0x1b2232, roughness: 0.42, metalness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }),
    inkMatte: phys({ color: 0x141a27, roughness: 0.7, metalness: 0.2, envMapIntensity: 0.6 }),
    glassDark: phys({ color: 0x1c2638, roughness: 0.12, metalness: 0.55, clearcoat: 1, envMapIntensity: 1.5 }),
    glass: phys({
      color: 0xa9eef6,
      roughness: 0.04,
      transparent: true,
      opacity: 0.26,
      clearcoat: 1,
      envMapIntensity: 1.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    glowRim: new THREE.MeshBasicMaterial({ color: COLORS.rim, toneMapped: false }),
    glowKey: new THREE.MeshBasicMaterial({ color: COLORS.key, toneMapped: false }),
    wireRim: new THREE.LineBasicMaterial({ color: COLORS.rim, transparent: true, opacity: 0.55 }),
  };
}

function shadowCatcher(radius = 4, opacity = 0.38) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), new THREE.ShadowMaterial({ opacity }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function cast(obj) {
  obj.traverse((o) => {
    if (o.isMesh && !(o.material && o.material.isShadowMaterial)) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return obj;
}

function dust(count, spread, seed = 1) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const a = new THREE.Color(COLORS.key);
  const b = new THREE.Color(COLORS.rim);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * spread.x;
    pos[i * 3 + 1] = (rnd() - 0.5) * spread.y;
    pos[i * 3 + 2] = (rnd() - 0.5) * spread.z;
    const c = rnd() > 0.5 ? a : b;
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Points(
    g,
    new THREE.PointsMaterial({ size: 0.045, vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false })
  );
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// HERO · una ventana de navegador de la que sale un objeto
// ─────────────────────────────────────────────────────────────
function screenTexture() {
  return canvasTexture(1400, 820, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0e1424");
    g.addColorStop(1, "#141c30");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // rejilla de fondo
    ctx.strokeStyle = "rgba(111,227,240,0.07)";
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 70);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 70; y < h; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // barra del navegador
    ctx.fillStyle = "#1a2234";
    ctx.fillRect(0, 0, w, 70);
    [["#ffb04a", 40], ["#6fe3f0", 76], ["#3a445c", 112]].forEach(([c, x]) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, 35, 11, 0, TAU);
      ctx.fill();
    });
    ctx.fillStyle = "#10182a";
    rr(ctx, 170, 18, 520, 34, 17);
    ctx.fill();
    ctx.fillStyle = "rgba(236,238,244,0.35)";
    rr(ctx, 192, 31, 220, 8, 4);
    ctx.fill();
    // titular y texto
    ctx.fillStyle = "#eceef4";
    rr(ctx, 90, 220, 470, 40, 10);
    ctx.fill();
    rr(ctx, 90, 278, 360, 40, 10);
    ctx.fill();
    ctx.fillStyle = "rgba(236,238,244,0.32)";
    for (let i = 0; i < 3; i++) {
      rr(ctx, 90, 360 + i * 30, 420 - i * 60, 12, 6);
      ctx.fill();
    }
    ctx.fillStyle = "#ffb04a";
    rr(ctx, 90, 500, 200, 58, 29);
    ctx.fill();
    ctx.strokeStyle = "rgba(111,227,240,0.7)";
    ctx.lineWidth = 3;
    rr(ctx, 310, 500, 170, 58, 29);
    ctx.stroke();
    // halo donde emerge el objeto
    const rg = ctx.createRadialGradient(1000, 430, 10, 1000, 430, 360);
    rg.addColorStop(0, "rgba(111,227,240,0.55)");
    rg.addColorStop(0.45, "rgba(111,227,240,0.12)");
    rg.addColorStop(1, "rgba(111,227,240,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(560, 70, 840, 750);
  });
}

function buildHero() {
  const M = makeMaterials();
  const root = new THREE.Group();

  const browser = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(4.6, 2.85, 0.16, 5, 0.12), M.ink);
  browser.add(frame);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(4.42, 2.67),
    new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false })
  );
  screen.position.z = 0.082;
  browser.add(screen);

  // El nudo atraviesa la pantalla: la parte de atrás queda oculta por el plano.
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.23, 260, 40, 2, 3), M.chrome);
  knot.position.set(1.45, 0.05, 0.62);
  knot.rotation.set(0.4, 0.6, 0.1);
  browser.add(knot);

  browser.rotation.set(0.1, -0.5, 0.02);
  browser.position.set(-0.15, 0, 0);
  root.add(browser);

  const floats = [
    Object.assign(new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 48), M.amber), { userData: { p: [-2.3, 1.3, 0.9], s: 0.9 } }),
    Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 32, 96), M.glowRim), { userData: { p: [2.45, -1.35, 1.1], s: 1.2 } }),
    Object.assign(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.46, 0.46, 4, 0.08), M.ivory), { userData: { p: [-2.45, -1.45, 0.4], s: 0.7 } }),
    Object.assign(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.42, 0)), M.wireRim), { userData: { p: [2.7, 1.5, -0.4], s: 0.6 } }),
    Object.assign(new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), M.chrome), { userData: { p: [0.4, 1.95, 0.6], s: 1.4 } }),
  ];
  floats.forEach((f, i) => {
    f.position.set(...f.userData.p);
    f.userData.phase = i * 1.3;
    root.add(f);
  });

  root.add(dust(70, new THREE.Vector3(9, 6, 5), 7));
  cast(root);

  return {
    group: root,
    camera: { fov: 30, position: [0.3, 0.25, 9.6], target: [0.1, 0, 0] },
    tick(t) {
      knot.rotation.x = 0.4 + t * 0.35;
      knot.rotation.y = 0.6 + t * 0.22;
      floats.forEach((f) => {
        const ph = f.userData.phase;
        f.position.y = f.userData.p[1] + Math.sin(t * f.userData.s + ph) * 0.08;
        f.rotation.x = t * 0.3 * f.userData.s + ph;
        f.rotation.y = t * 0.4 * f.userData.s;
      });
    },
  };
}

// ─────────────────────────────────────────────────────────────
// CAPAS · la misma interfaz, plana o separada en profundidad
// ─────────────────────────────────────────────────────────────
function layerTextures() {
  const W = 1040, H = 680;
  return [
    canvasTexture(W, H, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#121a2c");
      g.addColorStop(1, "#1d2740");
      ctx.fillStyle = g;
      rr(ctx, 0, 0, W, H, 36);
      ctx.fill();
      ctx.strokeStyle = "rgba(111,227,240,0.12)";
      ctx.lineWidth = 2;
      for (let x = 40; x < W; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
    }),
    canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = "#24304a";
      rr(ctx, 560, 110, 400, 420, 28);
      ctx.fill();
      ctx.save();
      rr(ctx, 560, 110, 400, 420, 28);
      ctx.clip();
      ctx.fillStyle = "#ffb04a";
      ctx.beginPath();
      ctx.arc(820, 250, 70, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#4fd3e3";
      ctx.beginPath();
      ctx.moveTo(540, 540);
      ctx.lineTo(700, 330);
      ctx.lineTo(800, 440);
      ctx.lineTo(880, 360);
      ctx.lineTo(1000, 540);
      ctx.fill();
      ctx.restore();
    }),
    canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = "#eceef4";
      rr(ctx, 80, 150, 400, 44, 12);
      ctx.fill();
      rr(ctx, 80, 210, 300, 44, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(236,238,244,0.45)";
      for (let i = 0; i < 4; i++) {
        rr(ctx, 80, 300 + i * 32, 380 - i * 40, 14, 7);
        ctx.fill();
      }
    }),
    canvasTexture(W, H, (ctx) => {
      ctx.fillStyle = "#ffb04a";
      rr(ctx, 80, 470, 220, 64, 32);
      ctx.fill();
      ctx.fillStyle = "#0a0c12";
      rr(ctx, 120, 496, 140, 12, 6);
      ctx.fill();
      ctx.strokeStyle = "#6fe3f0";
      ctx.lineWidth = 4;
      rr(ctx, 320, 470, 180, 64, 32);
      ctx.stroke();
    }),
  ];
}

function buildLayers({ explode = 1 } = {}) {
  const M = makeMaterials();
  const root = new THREE.Group();
  const stack = new THREE.Group();
  const tex = layerTextures();
  const layers = tex.map((map, i) => {
    const layer = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.7),
      new THREE.MeshBasicMaterial({ map, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: i === 0 })
    );
    layer.add(plane);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.6, 1.7)),
      new THREE.LineBasicMaterial({ color: i === 3 ? COLORS.key : COLORS.rim, transparent: true, opacity: 0.0 })
    );
    layer.add(edge);
    layer.userData = { i, edge };
    stack.add(layer);
    return layer;
  });
  root.add(stack);

  // Pilares guía entre capas (se ven solo al separar)
  const guides = new THREE.Group();
  [[-1.3, -0.85], [1.3, -0.85], [-1.3, 0.85], [1.3, 0.85]].forEach(([x, y]) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, 1)]);
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: COLORS.rim, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.5 }));
    l.computeLineDistances();
    guides.add(l);
  });
  stack.add(guides);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 32), M.amber);
  stack.add(knob);

  function setExplode(e) {
    const gap = 0.62 * e + 0.004;
    layers.forEach((l) => {
      l.position.z = l.userData.i * gap;
      l.userData.edge.material.opacity = 0.75 * e;
    });
    guides.scale.z = gap * 3;
    guides.visible = e > 0.05;
    knob.position.set(1.3, 0.85, gap * 3);
    knob.visible = e > 0.05;
    stack.rotation.y = -0.72 * e;
    stack.rotation.x = -0.22 * e;
    stack.position.x = 0.35 * e;
    stack.position.y = -0.1 * e;
    stack.position.z = -0.9 * e;
  }
  setExplode(explode);

  return {
    group: root,
    camera: { fov: 30, position: [0, 0, 6.9], target: [0, 0, 0] },
    api: { setExplode },
    tick() {},
  };
}

// ─────────────────────────────────────────────────────────────
// ICONOS DE HABILIDADES
// ─────────────────────────────────────────────────────────────
function buildIcon(name) {
  const M = makeMaterials();
  const g = new THREE.Group();
  let spin = null;

  if (name === "modelado") {
    const solid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), M.ivory);
    solid.material = solid.material.clone();
    solid.material.flatShading = true;
    g.add(solid);
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.02, 1)), M.wireRim);
    g.add(wire);
    const pts = new THREE.Points(
      new THREE.IcosahedronGeometry(1.02, 1),
      new THREE.PointsMaterial({ color: COLORS.key, size: 0.09, toneMapped: false })
    );
    g.add(pts);
    g.scale.setScalar(1.3);
    g.rotation.set(0.3, 0.5, 0);
    spin = (t) => (g.rotation.y = 0.5 + t * 0.4);
  }

  if (name === "interaccion") {
    const cube = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.95, 0.95, 5, 0.14), M.chrome);
    cube.rotation.set(0.6, 0.7, 0);
    g.add(cube);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 24, 128), M.glowRim);
    ring.rotation.set(1.2, 0.1, 0.3);
    g.add(ring);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 32), M.amber);
    const a = 0.9;
    handle.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0).applyEuler(ring.rotation);
    g.add(handle);
    spin = (t) => (cube.rotation.y = 0.7 + t * 0.5);
  }

  if (name === "animacion") {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.1, -0.7, 0),
      new THREE.Vector3(-0.3, 1.3, 0),
      new THREE.Vector3(0.75, 0.15, 0.2)
    );
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.1 + k * 0.32, 40, 40),
        i === 5 ? M.amber : new THREE.MeshPhysicalMaterial({ color: COLORS.rim, roughness: 0.3, transparent: true, opacity: 0.18 + k * 0.5, envMapIntensity: 0.8 })
      );
      s.position.copy(curve.getPoint(k));
      g.add(s);
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.018, 8), M.glowRim);
    g.add(tube);
    g.rotation.set(0.15, -0.35, 0);
  }

  if (name === "ux") {
    const panels = [
      [M.inkMatte, 0.0],
      [M.ink, 0.32],
      [M.ivory, 0.64],
    ];
    panels.forEach(([mat, o], i) => {
      const p = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.0, 0.07, 4, 0.06), mat);
      p.position.set(-0.35 + o, -0.3 + o * 0.55, -0.3 + o * 0.6);
      g.add(p);
      if (i === 2) {
        const btn = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.2, 0.08, 4, 0.1), M.amber);
        btn.position.set(p.position.x - 0.3, p.position.y - 0.24, p.position.z + 0.06);
        g.add(btn);
        [0.22, 0.08].forEach((y, j) => {
          const bar = new THREE.Mesh(new RoundedBoxGeometry(j ? 0.6 : 0.95, 0.07, 0.05, 2, 0.03), M.inkMatte);
          bar.position.set(p.position.x - (j ? 0.31 : 0.12), p.position.y + y, p.position.z + 0.05);
          g.add(bar);
        });
      }
    });
    g.rotation.set(-0.35, 0.55, 0.05);
  }

  if (name === "rendimiento") {
    const track = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 24, 128, Math.PI * 1.5), M.inkMatte);
    track.rotation.z = -Math.PI * 0.25;
    g.add(track);
    const prog = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.13, 24, 128, Math.PI * 1.2), M.glowRim);
    prog.rotation.z = Math.PI * 0.05;
    g.add(prog);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 48), M.amber);
    cap.rotation.x = Math.PI / 2;
    g.add(cap);
    const needle = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.08, 0.08, 2, 0.03), M.chrome);
    needle.geometry.translate(0.42, 0, 0);
    needle.rotation.z = Math.PI * 0.18;
    needle.position.z = 0.08;
    g.add(needle);
    g.rotation.set(-0.25, 0.35, 0);
    spin = (t) => (needle.rotation.z = Math.PI * 0.18 + Math.sin(t * 2) * 0.08);
  }

  if (name === "ia") {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), M.chrome);
    gem.scale.set(1, 1.25, 1);
    gem.rotation.y = 0.5;
    g.add(gem);
    const shards = [
      [-1.05, 0.75, 0.2, 0.18],
      [1.0, -0.55, 0.3, 0.14],
      [0.95, 0.95, -0.2, 0.1],
      [-0.9, -0.85, 0.1, 0.12],
    ];
    shards.forEach(([x, y, z, s], i) => {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(s, 0), i % 2 ? M.amber : M.glowRim);
      m.position.set(x, y, z);
      m.rotation.set(i, i * 2, 0);
      g.add(m);
    });
    spin = (t) => (gem.rotation.y = 0.5 + t * 0.6);
  }

  cast(g);
  return {
    group: g,
    camera: { fov: 30, position: [0, 0, 6.2], target: [0, 0, 0] },
    tick: (t) => spin && spin(t),
  };
}

// ─────────────────────────────────────────────────────────────
// CASO 1 · Torre residencial con selector de pisos
// ─────────────────────────────────────────────────────────────
export const TOWER_UNITS = [
  // Datos de ejemplo para la demo
  { floor: 11, unit: "PH-A", m2: 142, view: "Montaña y ciudad", status: "Reservado" },
  { floor: 10, unit: "10A", m2: 96, view: "Montaña", status: "Disponible" },
  { floor: 9, unit: "9B", m2: 84, view: "Parque", status: "Disponible" },
  { floor: 8, unit: "8A", m2: 96, view: "Montaña", status: "Vendido" },
  { floor: 7, unit: "7B", m2: 84, view: "Parque", status: "Disponible" },
  { floor: 6, unit: "6A", m2: 96, view: "Montaña", status: "Disponible" },
  { floor: 5, unit: "5B", m2: 84, view: "Parque", status: "Vendido" },
  { floor: 4, unit: "4A", m2: 96, view: "Ciudad", status: "Reservado" },
  { floor: 3, unit: "3B", m2: 84, view: "Jardín", status: "Disponible" },
  { floor: 2, unit: "2A", m2: 96, view: "Jardín", status: "Vendido" },
];

function buildTower({ selected = 7 } = {}) {
  const M = makeMaterials();
  const root = new THREE.Group();
  const FLOORS = 11;
  const H = 0.32;
  const W = 1.9, D = 1.25;

  const plaza = new THREE.Mesh(new RoundedBoxGeometry(4.4, 0.14, 4.4, 4, 0.06), M.inkMatte);
  plaza.position.y = -0.07;
  root.add(plaza);
  const grid = new THREE.GridHelper(4.2, 21, COLORS.rim, COLORS.rim);
  grid.material.transparent = true;
  grid.material.opacity = 0.16;
  grid.position.y = 0.002;
  root.add(grid);

  const lobby = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, H * 1.2, D - 0.2), M.glassDark);
  lobby.position.y = H * 0.6;
  root.add(lobby);

  const floorMeshes = [];
  const glassSel = new THREE.MeshStandardMaterial({ color: 0xee7d10, emissive: 0xe86d00, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.2 });
  const glassHover = new THREE.MeshStandardMaterial({ color: 0x22aec2, emissive: 0x1b9fb3, emissiveIntensity: 0.45, roughness: 0.25, metalness: 0.2 });

  const finGeo = new THREE.BoxGeometry(0.035, H - 0.06, 0.035);
  for (let f = 2; f <= FLOORS; f++) {
    const y = H * 1.2 + (f - 2) * H;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.06, D + 0.08), M.ivory);
    slab.position.y = y + 0.03;
    root.add(slab);
    const band = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.06, D - 0.04), M.glassDark);
    band.position.y = y + 0.06 + (H - 0.06) / 2;
    band.userData = { floor: f, base: M.glassDark };
    root.add(band);
    floorMeshes.push(band);
    // parteluces en las dos fachadas visibles
    for (let i = 0; i <= 8; i++) {
      const fin = new THREE.Mesh(finGeo, M.ivory);
      fin.position.set(-W / 2 + (i * W) / 8, band.position.y, D / 2);
      root.add(fin);
    }
    for (let i = 0; i <= 5; i++) {
      const fin = new THREE.Mesh(finGeo, M.ivory);
      fin.position.set(W / 2, band.position.y, -D / 2 + (i * D) / 5);
      root.add(fin);
    }
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.08, D + 0.12), M.ivory);
  roof.position.y = H * 1.2 + (FLOORS - 1) * H + 0.04;
  root.add(roof);
  const plant = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.22, 0.5, 3, 0.04), M.inkMatte);
  plant.position.set(-0.4, roof.position.y + 0.15, -0.2);
  root.add(plant);

  const treeMat = new THREE.MeshPhysicalMaterial({ color: 0x2c6e72, roughness: 0.75, flatShading: true });
  [[-1.75, 1.6], [1.7, 1.65], [-1.65, -1.6], [1.75, -1.5], [0.1, 1.85], [-1.85, 0.2]].forEach(([x, z], i) => {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8), M.inkMatte);
    trunk.position.y = 0.11;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + (i % 3) * 0.04, 0), treeMat);
    crown.position.y = 0.36;
    t.add(trunk, crown);
    t.position.set(x, 0, z);
    root.add(t);
  });

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W + 0.2, H + 0.06, D + 0.2)), new THREE.LineBasicMaterial({ color: COLORS.key }));
  root.add(outline);

  cast(root);
  // el contorno y el piso iluminado no proyectan sombra
  outline.castShadow = false;

  let current = null;
  let hovered = null;
  function paint() {
    floorMeshes.forEach((m) => {
      m.material = m === current ? glassSel : m === hovered ? glassHover : m.userData.base;
    });
    if (current) {
      outline.visible = true;
      outline.position.set(0, current.position.y, 0);
    } else outline.visible = false;
  }
  function select(floor) {
    current = floorMeshes.find((m) => m.userData.floor === floor) || null;
    paint();
  }
  function hover(floor) {
    hovered = floorMeshes.find((m) => m.userData.floor === floor) || null;
    paint();
  }
  select(selected);
  root.position.y = -1.6;

  return {
    group: root,
    camera: { fov: 30, position: [6.9, 5.1, 8.2], target: [0, 0.05, 0] },
    pickables: floorMeshes,
    api: { select, hover },
    anchors: () => {
      const f = current || floorMeshes[0];
      const v = new THREE.Vector3(W / 2 + 0.1, f.position.y, D / 2 + 0.1);
      return { selected: root.localToWorld(v.clone()) };
    },
    tick() {},
  };
}

// ─────────────────────────────────────────────────────────────
// CASO 2 · Botella térmica configurable
// ─────────────────────────────────────────────────────────────
export const BOTTLE_COLORS = {
  ambar: { name: "Ámbar", hex: "#ee7d10", swatch: "#ffa443" },
  glaciar: { name: "Glaciar", hex: "#22aec2", swatch: "#5fd6e6" },
  marfil: { name: "Marfil", hex: "#d9d2c3", swatch: "#ece6da" },
  noche: { name: "Noche", hex: "#1f2a42", swatch: "#34405c" },
};

function makeBottle(colorHex) {
  const M = makeMaterials();
  const g = new THREE.Group();
  const body = [
    [0.0, 0.0], [0.34, 0.0], [0.4, 0.025], [0.43, 0.09], [0.435, 0.2],
    [0.435, 1.82], [0.42, 1.96], [0.38, 2.06], [0.33, 2.13], [0.31, 2.2], [0.31, 2.3],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bodyMat = M.amber.clone();
  bodyMat.color = new THREE.Color(colorHex);
  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(body, 96), bodyMat);
  g.add(bodyMesh);
  const cap = [
    [0.0, 2.27], [0.325, 2.27], [0.33, 2.3], [0.33, 2.64], [0.315, 2.7], [0.28, 2.73], [0.0, 2.73],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(cap, 96), M.inkMatte));
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.338, 0.338, 0.05, 96, 1, true), M.chrome);
  ring.position.y = 2.33;
  g.add(ring);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 96, 1, true), M.chrome);
  band.position.y = 0.5;
  g.add(band);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 16, 48), M.inkMatte);
  loop.position.set(0, 2.78, 0);
  g.add(loop);
  g.userData.bodyMat = bodyMat;
  cast(g);
  return g;
}

function buildBottles() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const main = makeBottle(BOTTLE_COLORS.ambar.hex);
  main.scale.setScalar(1.12);
  main.position.set(0, 0.12, 0.7);
  main.rotation.y = 0.4;
  const left = makeBottle(BOTTLE_COLORS.glaciar.hex);
  left.position.set(-1.35, 0, -0.55);
  const right = makeBottle(BOTTLE_COLORS.marfil.hex);
  right.position.set(1.35, 0, -0.55);
  root.add(main, left, right);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.12, 96), M.ink);
  ped.position.set(0, 0.06, 0.7);
  root.add(ped);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.015, 12, 128), M.glowRim);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.12, 0.7);
  root.add(halo);
  root.add(shadowCatcher(4.6, 0.42));
  cast(root);
  root.position.y = -1.35;
  return {
    group: root,
    camera: { fov: 30, position: [0, 1.7, 8.4], target: [0, 0.2, 0] },
    tick(t) {
      main.rotation.y = 0.4 + t * 0.4;
    },
  };
}

function buildBottle() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const bottle = makeBottle(BOTTLE_COLORS.ambar.hex);
  root.add(bottle);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.12, 96), M.ink);
  ped.position.y = -0.06;
  root.add(ped);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.015, 12, 128), M.glowRim);
  halo.rotation.x = Math.PI / 2;
  root.add(halo);
  const floor = shadowCatcher(3.2, 0.4);
  floor.position.y = -0.12;
  root.add(floor);
  cast(root);
  root.position.y = -1.3;
  const target = new THREE.Color(BOTTLE_COLORS.ambar.hex);
  return {
    group: root,
    camera: { fov: 30, position: [0, 0.9, 7.2], target: [0, 0, 0] },
    api: {
      setColor(hex) {
        target.set(hex);
      },
      spinBy(d) {
        bottle.rotation.y += d;
      },
    },
    tick(t, dt = 0.016) {
      bottle.userData.bodyMat.color.lerp(target, Math.min(1, dt * 8));
    },
  };
}

// ─────────────────────────────────────────────────────────────
// CASO 3 · Bomba en vista explosionada
// ─────────────────────────────────────────────────────────────
function gearShape(rOut, rIn, teeth) {
  const s = new THREE.Shape();
  const step = TAU / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rIn, a],
      [rOut, a + step * 0.18],
      [rOut, a + step * 0.48],
      [rIn, a + step * 0.66],
    ];
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, rIn * 0.32, 0, TAU, true);
  s.holes.push(hole);
  return s;
}

export const PUMP_PARTS = [
  { id: "motor", label: "Motor eficiente", note: "Consume y calienta menos" },
  { id: "rodamiento", label: "Rodamiento sellado", note: "Sin mantenimiento" },
  { id: "impulsor", label: "Impulsor de bronce", note: "Más caudal, menos desgaste" },
  { id: "carcasa", label: "Carcasa reforzada", note: "Aguanta presión y golpes" },
];

function buildPump({ explode = 1 } = {}) {
  const M = makeMaterials();
  const root = new THREE.Group();
  const axisGroup = new THREE.Group();
  root.add(axisGroup);

  const parts = {};

  // Motor
  const motor = new THREE.Group();
  const housingProfile = [
    [0.0, -0.78], [0.5, -0.78], [0.58, -0.72], [0.6, -0.6], [0.6, 0.62], [0.55, 0.72], [0.3, 0.78], [0.0, 0.78],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const housing = new THREE.Mesh(new THREE.LatheGeometry(housingProfile, 72), M.ink);
  motor.add(housing);
  for (let i = 0; i < 9; i++) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.028, 12, 72), M.steel);
    fin.rotation.x = Math.PI / 2;
    fin.position.y = -0.52 + i * 0.13;
    motor.add(fin);
  }
  const box = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.5, 0.32, 3, 0.05), M.inkMatte);
  box.position.set(0, 0.0, 0.66);
  box.rotation.x = Math.PI / 2;
  motor.add(box);
  motor.rotation.z = Math.PI / 2;
  parts.motor = motor;

  // Eje
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.7, 32), M.chrome);
  shaft.rotation.z = Math.PI / 2;
  parts.eje = shaft;

  // Rodamiento
  const bearing = new THREE.Group();
  bearing.add(new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.075, 24, 72), M.chrome));
  bearing.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 16, 48), M.steel));
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), M.glowKey);
    const a = (i / 10) * TAU;
    b.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0);
    bearing.add(b);
  }
  bearing.rotation.y = Math.PI / 2;
  parts.rodamiento = bearing;

  // Impulsor
  const imp = new THREE.Group();
  const gearGeo = new THREE.ExtrudeGeometry(gearShape(0.56, 0.44, 12), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 6 });
  gearGeo.center();
  imp.add(new THREE.Mesh(gearGeo, M.amber));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.3, 48), M.chrome);
  hub.rotation.x = Math.PI / 2;
  imp.add(hub);
  imp.rotation.y = Math.PI / 2;
  parts.impulsor = imp;

  // Carcasa (vidrio para ver el interior)
  const casing = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.55, 72, 1, true), M.glass);
  casing.add(shell);
  [-0.275, 0.275].forEach((y) => {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.028, 12, 96), M.glowRim);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = y;
    casing.add(rim);
  });
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 32, 1, true), M.glass);
  outlet.position.set(0, 0, 0.92);
  outlet.rotation.x = Math.PI / 2;
  casing.add(outlet);
  casing.rotation.z = Math.PI / 2;
  parts.carcasa = casing;

  // Tapa con pernos
  const cover = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.09, 72), M.ivory);
  cover.add(disc);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 6), M.steel);
    bolt.position.set(Math.cos(a) * 0.64, 0.07, Math.sin(a) * 0.64);
    cover.add(bolt);
  }
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.42, 48), M.steel);
  inlet.position.y = 0.25;
  cover.add(inlet);
  cover.rotation.z = -Math.PI / 2;
  parts.tapa = cover;

  Object.values(parts).forEach((p) => axisGroup.add(p));

  const assembled = { motor: -1.0, eje: -0.15, rodamiento: 0.05, impulsor: 0.32, carcasa: 0.36, tapa: 0.7 };
  const exploded = { motor: -2.55, eje: -1.05, rodamiento: -0.25, impulsor: 0.55, carcasa: 1.5, tapa: 2.5 };

  const axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.6, 0, 0), new THREE.Vector3(3.3, 0, 0)]),
    new THREE.LineDashedMaterial({ color: COLORS.rim, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.7 })
  );
  axisLine.computeLineDistances();
  axisGroup.add(axisLine);

  root.add(dust(40, new THREE.Vector3(8, 3.5, 3), 3));
  cast(root);

  let e = explode;
  function setExplode(v) {
    e = v;
    Object.entries(parts).forEach(([k, p]) => {
      p.position.x = THREE.MathUtils.lerp(assembled[k], exploded[k], e);
    });
    axisLine.material.opacity = 0.15 + 0.6 * e;
  }
  setExplode(explode);

  axisGroup.rotation.set(0.18, -0.58, 0.04);

  return {
    group: root,
    camera: { fov: 28, position: [0, 0.9, 8.4], target: [0, 0, 0] },
    api: { setExplode },
    anchors: () => {
      const out = {};
      const offs = {
        motor: [0, 0.75, 0], rodamiento: [0, 0.38, 0], impulsor: [0, 0.6, 0], carcasa: [0, 0.82, 0],
        motor_b: [0, -0.68, 0], rodamiento_b: [0, -0.38, 0], impulsor_b: [0, -0.6, 0], carcasa_b: [0, -0.82, 0],
      };
      Object.entries(offs).forEach(([k, o]) => {
        const part = parts[k.replace("_b", "")];
        part.updateMatrixWorld(true);
        const wp = new THREE.Vector3();
        part.getWorldPosition(wp);
        out[k] = wp.add(new THREE.Vector3(...o));
      });
      return out;
    },
    tick(t) {
      parts.impulsor.rotation.x = t * 1.2;
      parts.rodamiento.rotation.x = t * 0.8;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// HIGGSFIELD · de una foto a un modelo 3D
// ─────────────────────────────────────────────────────────────
function photoTexture() {
  return canvasTexture(640, 800, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f1ece2");
    g.addColorStop(1, "#d9d2c4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(w / 2, 690, 170, 26, 0, 0, TAU);
    ctx.fill();
    const bg = ctx.createLinearGradient(200, 0, 440, 0);
    bg.addColorStop(0, "#c56f12");
    bg.addColorStop(0.45, "#ffae4a");
    bg.addColorStop(1, "#b9620e");
    ctx.fillStyle = bg;
    rr(ctx, 215, 230, 210, 460, 60);
    ctx.fill();
    ctx.fillStyle = "#1a2030";
    rr(ctx, 250, 130, 140, 120, 26);
    ctx.fill();
    ctx.fillStyle = "#c9d2e3";
    ctx.fillRect(215, 330, 210, 10);
  });
}

function buildHiggs() {
  const M = makeMaterials();
  const root = new THREE.Group();

  const card = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(1.7, 2.1, 0.05, 4, 0.06), M.ivory);
  card.add(frame);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.88), new THREE.MeshBasicMaterial({ map: photoTexture(), toneMapped: false }));
  photo.position.z = 0.027;
  card.add(photo);
  card.position.set(-2.25, 1.15, 0);
  card.rotation.set(0, 0.42, -0.05);
  root.add(card);

  const bottle = makeBottle(BOTTLE_COLORS.ambar.hex);
  bottle.position.set(1.75, 0.12, 0.2);
  bottle.rotation.y = 0.5;
  root.add(bottle);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(
      new THREE.LatheGeometry(
        [[0.0, 0.0], [0.44, 0.0], [0.45, 0.2], [0.45, 1.85], [0.4, 2.02], [0.33, 2.14]].map(([x, y]) => new THREE.Vector2(x, y)),
        16
      )
    ),
    new THREE.LineBasicMaterial({ color: COLORS.rim, transparent: true, opacity: 0.22 })
  );
  wire.position.copy(bottle.position);
  wire.position.x += 0.0;
  wire.scale.setScalar(1.035);
  root.add(wire);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.12, 96), M.ink);
  ped.position.set(1.75, 0.06, 0.2);
  root.add(ped);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.015, 12, 128), M.glowRim);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(1.75, 0.12, 0.2);
  root.add(halo);

  // Flujo de partículas foto → modelo
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, 1.35, 0.2),
    new THREE.Vector3(-0.4, 2.0, 0.6),
    new THREE.Vector3(0.6, 1.9, 0.5),
    new THREE.Vector3(1.4, 1.5, 0.3),
  ]);
  const N = 220;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const a = new THREE.Color(COLORS.key), b = new THREE.Color(COLORS.rim);
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const k = i / N;
    const p = curve.getPoint(k);
    const spread = 0.05 + Math.sin(k * Math.PI) * 0.22;
    pos.set([p.x + (rnd() - 0.5) * spread, p.y + (rnd() - 0.5) * spread, p.z + (rnd() - 0.5) * spread], i * 3);
    const c = a.clone().lerp(b, k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  root.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.075, vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false })));

  root.add(shadowCatcher(5, 0.35));
  cast(root);
  root.position.y = -1.3;
  return {
    group: root,
    camera: { fov: 30, position: [0, 1.5, 9.4], target: [0, 0.25, 0] },
    anchors: () => ({
      photo: root.localToWorld(new THREE.Vector3(-2.25, 2.25, 0)),
      model: root.localToWorld(new THREE.Vector3(1.75, 3.0, 0.2)),
    }),
    tick(t) {
      bottle.rotation.y = 0.5 + t * 0.4;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// PROCESO · cuatro bloques que suben
// ─────────────────────────────────────────────────────────────
function buildSteps() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const blocks = [];
  const heights = [0.45, 0.85, 1.25, 1.65];
  heights.forEach((h, i) => {
    const mat = i === 3 ? M.amber : M.ink;
    const b = new THREE.Mesh(new RoundedBoxGeometry(1.15, h, 1.15, 4, 0.08), mat);
    b.position.set(-2.4 + i * 1.6, h / 2, 0);
    root.add(b);
    const top = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.0, 1.0)),
      new THREE.LineBasicMaterial({ color: i === 3 ? 0xffffff : COLORS.rim, transparent: true, opacity: 0.8 })
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(b.position.x, h + 0.003, 0);
    root.add(top);
    blocks.push(b);
  });
  const goal = new THREE.Mesh(new THREE.SphereGeometry(0.22, 48, 48), M.chrome);
  goal.position.set(blocks[3].position.x, heights[3] + 0.24, 0);
  root.add(goal);
  root.add(shadowCatcher(5.5, 0.35));
  cast(root);
  root.position.y = -0.8;
  return {
    group: root,
    camera: { fov: 26, position: [1.3, 2.5, 7.0], target: [0.1, 0.4, 0] },
    anchors: () => {
      const out = {};
      blocks.forEach((b, i) => {
        out["s" + (i + 1)] = root.localToWorld(new THREE.Vector3(b.position.x, heights[i] + (i === 3 ? 0.6 : 0.1), 0.35));
      });
      return out;
    },
    tick(t) {
      goal.position.y = heights[3] + 0.24 + Math.sin(t * 2) * 0.05;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// CIERRE · portal
// ─────────────────────────────────────────────────────────────
function buildPortal() {
  const M = makeMaterials();
  const root = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.1, 48, 220), M.chrome);
  root.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.022, 16, 220), M.glowKey);
  ring2.rotation.set(0.25, 0.35, 0);
  root.add(ring2);
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 96),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(512, 512, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, "rgba(111,227,240,0.55)");
        g.addColorStop(0.6, "rgba(111,227,240,0.12)");
        g.addColorStop(1, "rgba(111,227,240,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.position.z = -0.05;
  root.add(glow);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.19, 240, 36, 2, 3), M.amber);
  knot.position.set(0.15, 0, 0.25);
  root.add(knot);
  root.add(dust(60, new THREE.Vector3(6, 6, 4), 5));
  root.rotation.y = -0.35;
  cast(root);
  return {
    group: root,
    camera: { fov: 30, position: [0, 0, 8.2], target: [0, 0, 0] },
    tick(t) {
      knot.rotation.set(t * 0.4, t * 0.3, 0);
      ring2.rotation.z = t * 0.15;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Registro de escenas
// ─────────────────────────────────────────────────────────────
export const SCENES = {
  hero: () => buildHero(),
  "layers-flat": () => buildLayers({ explode: 0 }),
  "layers-depth": () => buildLayers({ explode: 1 }),
  layers: () => buildLayers({ explode: 0 }),
  "icon-modelado": () => buildIcon("modelado"),
  "icon-interaccion": () => buildIcon("interaccion"),
  "icon-animacion": () => buildIcon("animacion"),
  "icon-ux": () => buildIcon("ux"),
  "icon-rendimiento": () => buildIcon("rendimiento"),
  "icon-ia": () => buildIcon("ia"),
  tower: () => buildTower(),
  bottles: () => buildBottles(),
  bottle: () => buildBottle(),
  pump: () => buildPump({ explode: 1 }),
  higgs: () => buildHiggs(),
  steps: () => buildSteps(),
  portal: () => buildPortal(),
};

function applyCamera(camera, spec, aspect) {
  camera.fov = spec.fov;
  camera.aspect = aspect;
  camera.position.set(...spec.position);
  camera.lookAt(new THREE.Vector3(...spec.target));
  camera.updateProjectionMatrix();
}

function projectAnchors(built, camera) {
  if (!built.anchors) return {};
  const raw = built.anchors();
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const p = v.clone().project(camera);
    out[k] = [(p.x + 1) / 2, (1 - p.y) / 2];
  }
  return out;
}

// Render fijo (para el PDF). Devuelve las anclas en coordenadas 0–1 del lienzo.
export function renderStill(canvas, name, width, height, { t = 1.2 } = {}) {
  canvas.width = width;
  canvas.height = height;
  const stage = createStage(canvas, { pixelRatio: 1 });
  stage.renderer.setSize(width, height, false);
  const built = SCENES[name]();
  stage.scene.add(built.group);
  applyCamera(stage.camera, built.camera, width / height);
  built.tick(t, 0.5);
  stage.scene.updateMatrixWorld(true);
  stage.renderer.render(stage.scene, stage.camera);
  return { anchors: projectAnchors(built, stage.camera) };
}

// Visor interactivo (para la web).
export function mountViewer(container, name, { orbit = false, parallax = true, onFrame } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "viewer-canvas";
  container.appendChild(canvas);
  let stage;
  try {
    stage = createStage(canvas, { pixelRatio: Math.min(window.devicePixelRatio || 1, 2), shadows: true });
  } catch (err) {
    canvas.remove();
    container.classList.add("no3d");
    return null;
  }
  container.classList.add("has3d");
  const built = SCENES[name]();
  stage.scene.add(built.group);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const base = new THREE.Vector3(...built.camera.position);
  const target = new THREE.Vector3(...built.camera.target);
  let w = 1, h = 1;
  function resize() {
    const r = container.getBoundingClientRect();
    w = Math.max(1, r.width);
    h = Math.max(1, r.height);
    stage.renderer.setSize(w, h, false);
    applyCamera(stage.camera, built.camera, w / h);
    if (w / h < 0.9) {
      // en pantallas verticales alejamos un poco la cámara
      const k = 0.9 / (w / h);
      stage.camera.position.copy(target).add(base.clone().sub(target).multiplyScalar(Math.min(k, 1.7)));
      stage.camera.lookAt(target);
    }
  }
  resize();
  new ResizeObserver(resize).observe(container);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (parallax && finePointer) {
    container.addEventListener("pointermove", (ev) => {
      const r = container.getBoundingClientRect();
      mouse.tx = ((ev.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = ((ev.clientY - r.top) / r.height) * 2 - 1;
    });
    container.addEventListener("pointerleave", () => {
      mouse.tx = 0;
      mouse.ty = 0;
    });
  }

  // Arrastrar para girar (sin zoom: así el scroll de la página sigue funcionando)
  let drag = null;
  let spinY = 0, spinX = 0;
  if (orbit) {
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", (ev) => {
      drag = { x: ev.clientX, y: ev.clientY };
      canvas.setPointerCapture(ev.pointerId);
      container.classList.add("dragging");
    });
    canvas.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      spinY += (ev.clientX - drag.x) * 0.01;
      spinX = THREE.MathUtils.clamp(spinX + (ev.clientY - drag.y) * 0.004, -0.35, 0.35);
      drag = { x: ev.clientX, y: ev.clientY };
    });
    const end = () => {
      drag = null;
      container.classList.remove("dragging");
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  // Selección por clic (torre)
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    if (!built.pickables) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    const hit = ray.intersectObjects(built.pickables, false)[0];
    return hit ? hit.object.userData : null;
  }

  let visible = true;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { rootMargin: "100px" }).observe(container);

  const clock = new THREE.Clock();
  let t = 1.2;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reduce) t += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    built.tick(t, dt);
    built.group.rotation.y = spinY + mouse.x * 0.12;
    built.group.rotation.x = spinX + mouse.y * 0.05;
    stage.lights.glint.position.set(mouse.x * 5, -mouse.y * 3.5 + 1, 3.2);
    stage.renderer.render(stage.scene, stage.camera);
    if (onFrame) onFrame(projectAnchors(built, stage.camera));
  }
  if (reduce) {
    built.tick(t, 1);
  }
  frame();

  return { api: built.api || {}, pick, canvas, camera: stage.camera };
}
