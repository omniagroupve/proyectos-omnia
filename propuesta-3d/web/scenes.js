// Escenas 3D compartidas.
// Las usa la versión web (interactiva) y el pipeline de renders que alimenta el PDF,
// así el PDF y la web muestran exactamente los mismos objetos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Paleta: luz clave cálida + luz de contorno fría, como un set de iluminación 3D.
export const PALETTE = {
  void: 0x080912,
  deep: 0x10122a,
  pearl: 0xece9f7,
  cobalt: 0x3a4bff,
  key: 0xffb088,   // luz clave (cálida)
  rim: 0x5be4ff,   // luz de contorno (fría)
  graphite: 0x1d2042,
};

// ---------------------------------------------------------------------------
// Renderer + escenario
// ---------------------------------------------------------------------------
export function createRenderer(canvas, { width, height, pixelRatio = 1, shadows = true } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

const envCache = new WeakMap();
function environmentFor(renderer) {
  if (!envCache.has(renderer)) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envCache.set(renderer, pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture);
    pmrem.dispose();
  }
  return envCache.get(renderer);
}

export function createStage(renderer) {
  const scene = new THREE.Scene();
  scene.environment = environmentFor(renderer);

  const key = new THREE.DirectionalLight(PALETTE.key, 2.6);
  key.position.set(-5, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });

  const rim = new THREE.DirectionalLight(PALETTE.rim, 3.4);
  rim.position.set(7, 3, -6);

  const fill = new THREE.HemisphereLight(0xc4c9ff, 0x0a0b18, 0.55);

  // Brillo que sigue al cursor en la web (en los renders queda fijo)
  const glint = new THREE.PointLight(0xffffff, 5, 14, 2);
  glint.position.set(1.5, 1.2, 4);

  scene.add(key, rim, fill, glint);
  return { scene, lights: { key, rim, fill, glint } };
}

// ---------------------------------------------------------------------------
// Materiales
// ---------------------------------------------------------------------------
export function materials() {
  const env = 0.7;
  return {
    pearl: new THREE.MeshPhysicalMaterial({
      color: PALETTE.pearl, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.22,
      sheen: 0.5, sheenColor: new THREE.Color(0xc9c3ff), iridescence: 0.25, envMapIntensity: env,
    }),
    cobalt: new THREE.MeshPhysicalMaterial({
      color: PALETTE.cobalt, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.05, envMapIntensity: env,
    }),
    peach: new THREE.MeshPhysicalMaterial({
      color: 0xff9a74, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: env,
    }),
    graphite: new THREE.MeshPhysicalMaterial({
      color: PALETTE.graphite, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, metalness: 0.15, envMapIntensity: env,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xb9c3ff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.32, envMapIntensity: 1,
      depthWrite: false,
    }),
    rimGlow: new THREE.MeshBasicMaterial({ color: PALETTE.rim, toneMapped: false }),
    keyGlow: new THREE.MeshBasicMaterial({ color: PALETTE.key, toneMapped: false }),
    wire: new THREE.MeshBasicMaterial({ color: PALETTE.rim, wireframe: true, transparent: true, opacity: 0.85, toneMapped: false }),
  };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const rbox = (w, h, d, r = 0.08, seg = 5) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

function camera(fov, aspect, pos, target = [0, 0, 0]) {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  cam.position.set(...pos);
  cam.lookAt(new THREE.Vector3(...target));
  cam.userData.target = new THREE.Vector3(...target);
  cam.userData.base = cam.position.clone();
  return cam;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shadowCatcher(size = 30, y = 0, opacity = 0.32) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ color: 0x03040a, opacity }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

function castAll(obj) {
  obj.traverse((o) => { if (o.isMesh && !o.material.isShadowMaterial) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}

function dust(count, spread, color = PALETTE.rim, size = 0.05, opacity = 0.5) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647); // determinista: mismo render siempre
  for (let i = 0; i < count; i++) {
    p[i * 3] = (rnd() - 0.5) * spread[0];
    p[i * 3 + 1] = (rnd() - 0.5) * spread[1];
    p[i * 3 + 2] = (rnd() - 0.5) * spread[2];
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, toneMapped: false }));
}

function roundedRectLine(w, d, r, color, opacity = 0.9) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const pts = s.getPoints(12).map((v) => new THREE.Vector3(v.x, 0, v.y));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false }));
  return line;
}

// Proyecta puntos 3D a píxeles del canvas (para alinear etiquetas HTML con el render)
export function projectAnchors(anchors, cam, width, height) {
  return anchors.map(({ id, object, offset = [0, 0, 0] }) => {
    const v = new THREE.Vector3(...offset);
    object.updateWorldMatrix(true, false);
    object.localToWorld(v);
    v.project(cam);
    return { id, x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  });
}

// ---------------------------------------------------------------------------
// 1 · Hero: una web que se sale de la pantalla
// ---------------------------------------------------------------------------
function heroScreenTexture() {
  return canvasTexture(1400, 820, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1a1f5c'); g.addColorStop(1, '#0a0b1a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(91,228,255,0.10)'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 70) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 70) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const rg = ctx.createRadialGradient(w * 0.66, h * 0.42, 10, w * 0.66, h * 0.42, 420);
    rg.addColorStop(0, 'rgba(255,176,136,0.55)'); rg.addColorStop(1, 'rgba(255,176,136,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(236,233,247,0.9)';
    roundRect(ctx, 90, 70, 150, 26, 13); ctx.fill();
    ctx.fillStyle = 'rgba(236,233,247,0.35)';
    [0, 1, 2].forEach((i) => { roundRect(ctx, w - 520 + i * 140, 74, 110, 18, 9); ctx.fill(); });
    ctx.fillStyle = 'rgba(236,233,247,0.92)';
    roundRect(ctx, 90, 250, 560, 60, 18); ctx.fill();
    roundRect(ctx, 90, 330, 440, 60, 18); ctx.fill();
    ctx.fillStyle = 'rgba(236,233,247,0.35)';
    roundRect(ctx, 90, 430, 480, 20, 10); ctx.fill();
    roundRect(ctx, 90, 466, 400, 20, 10); ctx.fill();
    ctx.fillStyle = '#ff9a74';
    roundRect(ctx, 90, 540, 220, 64, 32); ctx.fill();
    ctx.strokeStyle = 'rgba(236,233,247,0.6)'; ctx.lineWidth = 3;
    roundRect(ctx, 330, 540, 200, 64, 32); ctx.stroke();
  });
}

export function hero(renderer, { aspect = 16 / 10 } = {}) {
  const { scene, lights } = createStage(renderer);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);

  const win = new THREE.Group();
  const frame = new THREE.Mesh(rbox(4.8, 3.1, 0.16, 0.14), M.graphite);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.56, 2.66),
    new THREE.MeshBasicMaterial({ map: heroScreenTexture(), toneMapped: false }));
  screen.position.set(0, -0.12, 0.082);
  win.add(frame, screen);
  [M.keyGlow, M.rimGlow, M.pearl].forEach((m, i) => {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), m);
    dot.position.set(-2.12 + i * 0.18, 1.39, 0.1);
    win.add(dot);
  });
  win.rotation.set(-0.06, -0.38, 0.015);
  win.position.set(-0.35, 0, -0.6);
  root.add(win);

  // Objetos que "salen" de la web
  const floaters = [];
  const add = (mesh, pos, rot = [0, 0, 0], speed = 1) => {
    mesh.position.set(...pos); mesh.rotation.set(...rot);
    mesh.userData = { base: mesh.position.clone(), rot: mesh.rotation.clone(), speed, phase: floaters.length * 1.7 };
    root.add(mesh); floaters.push(mesh); return mesh;
  };
  add(new THREE.Mesh(new THREE.SphereGeometry(0.82, 96, 64), M.pearl), [0.95, 0.38, 0.95], [0, 0, 0], 0.8);
  add(new THREE.Mesh(rbox(0.95, 0.95, 0.95, 0.18), M.cobalt), [-1.55, -0.72, 1.05], [0.5, 0.7, 0.2], 1.1);
  add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.17, 48, 120), M.peach), [2.25, -0.95, 0.55], [1.1, 0.3, 0.4], 0.9);
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.62, 12, 32), M.pearl), [-2.45, 1.0, 0.35], [0.2, 0, -0.8], 1.3);
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), M.cobalt), [2.55, 1.25, 0.2], [0.3, 0.6, 0], 1.2);
  [[-0.35, 1.35, 1.6, 0.09], [1.95, 0.15, 1.9, 0.07], [-2.1, -1.35, 0.6, 0.08], [0.25, -1.35, 1.7, 0.06]].forEach(([x, y, z, r], i) => {
    add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), i % 2 ? M.keyGlow : M.rimGlow), [x, y, z], [0, 0, 0], 1.6);
  });
  const motes = dust(70, [9, 6, 5], PALETTE.rim, 0.035, 0.45);
  root.add(motes);
  castAll(root);

  const cam = camera(30, aspect, [0.2, 0.25, 10.2], [0.1, 0, 0]);
  const pointer = new THREE.Vector2();
  return {
    scene, camera: cam, root, lights,
    setPointer(x, y) { pointer.set(x, y); },
    update(t, scrollP = 0) {
      floaters.forEach((m) => {
        const { base, rot, speed, phase } = m.userData;
        m.position.y = base.y + Math.sin(t * 0.9 * speed + phase) * 0.08;
        m.position.z = base.z + scrollP * 1.2 * speed;
        m.rotation.x = rot.x + Math.sin(t * 0.4 + phase) * 0.15;
        m.rotation.y = rot.y + t * 0.18 * speed;
      });
      motes.rotation.y = t * 0.02;
      lights.glint.position.set(pointer.x * 5, pointer.y * 3.5, 3);
      cam.position.x += (cam.userData.base.x + pointer.x * 0.6 - cam.position.x) * 0.05;
      cam.position.y += (cam.userData.base.y + pointer.y * 0.4 - cam.position.y) * 0.05;
      cam.position.z = cam.userData.base.z - scrollP * 1.7;
      cam.lookAt(cam.userData.target);
    },
  };
}

// ---------------------------------------------------------------------------
// 2 · Capas de skills (vista explosionada)
// ---------------------------------------------------------------------------
export const SKILL_COUNT = 6;

function skillGlyph(i, M) {
  const g = new THREE.Group();
  switch (i) {
    case 0: { // Dirección de arte y modelado: malla + volumen
      const solid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), M.pearl);
      const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.33, 1), M.wire);
      g.add(solid, wire); g.position.y = 0.36; break;
    }
    case 1: { // Materiales y luz: muestras de material
      [M.pearl, M.cobalt, M.peach].forEach((m, k) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 48, 32), m);
        s.position.set(-0.44 + k * 0.44, 0.22, 0); g.add(s);
      }); break;
    }
    case 2: { // Animación: aro con estela
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 32, 80), M.peach);
      t.rotation.set(0.25, 0.5, 0); t.position.set(0.32, 0.3, 0); g.add(t);
      [0.1, 0.075, 0.05].forEach((r, k) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M.keyGlow);
        s.position.set(-0.05 - k * 0.24, 0.3 - k * 0.05, 0); g.add(s);
      }); break;
    }
    case 3: { // Interacción: cursor + onda en el suelo
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0, -0.5); shape.lineTo(0.13, -0.38); shape.lineTo(0.22, -0.57);
      shape.lineTo(0.3, -0.53); shape.lineTo(0.21, -0.35); shape.lineTo(0.38, -0.35); shape.closePath();
      const cur = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 3 }), M.cobalt);
      cur.position.set(-0.12, 0.62, 0); cur.rotation.set(0, 0, 0.15);
      g.add(cur);
      [0.2, 0.34].forEach((r, k) => {
        const mat = M.rimGlow.clone(); mat.transparent = true; mat.opacity = 0.9 - k * 0.45;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 64), mat);
        ring.rotation.x = -Math.PI / 2; ring.position.set(-0.05, 0.06, 0);
        g.add(ring);
      }); break;
    }
    case 4: { // UX: pantallas en orden + botón
      [0, 1, 2].forEach((k) => {
        const c = new THREE.Mesh(rbox(0.56, 0.42, 0.035, 0.04), k === 2 ? M.pearl : M.glass);
        c.position.set(-0.32 + k * 0.2, 0.27, -0.2 + k * 0.18); g.add(c);
      });
      const btn = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 24), M.peach);
      btn.rotation.z = Math.PI / 2; btn.position.set(0.08, 0.17, 0.2); g.add(btn); break;
    }
    case 5: { // Rendimiento: medidor
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 20, 80, Math.PI), M.graphite);
      const fillArc = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 20, 80, Math.PI * 0.78), M.rimGlow);
      fillArc.rotation.z = Math.PI * 0.22;
      const needle = new THREE.Mesh(rbox(0.035, 0.26, 0.035, 0.012), M.peach);
      needle.position.set(0.08, 0.11, 0.02); needle.rotation.z = -0.62;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), M.pearl);
      g.add(arc, fillArc, needle, hub); g.position.y = 0.08; break;
    }
  }
  return g;
}

export function layers(renderer, { aspect = 1, spread = 1 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(3, 4, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);
  const slabs = [];
  const W = 3.0, D = 2.0, GAP = 0.9;
  for (let i = 0; i < SKILL_COUNT; i++) {
    const layer = new THREE.Group();
    const slabMat = new THREE.MeshPhysicalMaterial({
      color: i === 0 ? 0x2a2f6b : 0x1b1f48, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1,
      transparent: true, opacity: 0.96, envMapIntensity: 0.8, emissive: new THREE.Color(PALETTE.rim), emissiveIntensity: 0,
    });
    const slab = new THREE.Mesh(rbox(W, 0.09, D, 0.045), slabMat);
    const edge = roundedRectLine(W - 0.02, D - 0.02, 0.06, PALETTE.rim, 0.55);
    edge.position.y = 0.047;
    const glyph = skillGlyph(i, M);
    glyph.position.x += 0.75; glyph.position.z += 0.15; glyph.rotation.y += 1.3;
    layer.add(slab, edge, glyph);
    layer.userData = { index: i, slab, edge, baseY: 0 };
    root.add(layer); slabs.push(layer);
  }
  castAll(root);
  slabs.forEach((l) => { l.userData.edge.castShadow = false; });

  // Raíl vertical: une las capas en un solo "objeto"
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, GAP * (SKILL_COUNT - 1) + 0.4, 8), M.rimGlow);
  rail.material = rail.material.clone(); rail.material.transparent = true; rail.material.opacity = 0.35;
  rail.position.set(-W / 2 + 0.12, 0, D / 2 - 0.12);
  root.add(rail);

  const anchors = slabs.map((l, i) => ({ id: `skill-${i}`, object: l, offset: [W / 2, 0.02, -D / 2] }));
  let hi = -1, sp = spread;
  const layout = () => {
    slabs.forEach((l, i) => {
      const y = ((SKILL_COUNT - 1) / 2 - i) * GAP * sp;
      l.userData.baseY = y;
      l.position.y = y;
      l.position.x = i * 0.16 + (i === hi ? 0.45 : 0);
      l.userData.slab.material.emissiveIntensity = i === hi ? 0.18 : 0;
      l.userData.edge.material.opacity = hi === -1 || i === hi ? 0.75 : 0.25;
    });
    rail.scale.y = sp;
  };
  layout();
  root.rotation.y = -0.62;

  const cam = camera(24, aspect, [9.6, 3.3, 11.4], [0.2, -0.15, 0]);
  return {
    scene, camera: cam, root, lights, anchors, slabs,
    setSpread(s) { sp = s; layout(); },
    highlight(i) { hi = i; layout(); },
    update(t) {
      slabs.forEach((l, i) => {
        l.position.y = l.userData.baseY + Math.sin(t * 0.8 + i * 0.6) * 0.025;
        l.children[2].rotation.y = 1.3 + Math.sin(t * 0.5 + i) * 0.2;
      });
    },
  };
}

// ---------------------------------------------------------------------------
// 3 · Iconos 3D (un objeto, encuadre cuadrado)
// ---------------------------------------------------------------------------
export const ICON_KINDS = ['layers', 'target', 'spark', 'steps', 'chat', 'browser', 'console', 'coin', 'key', 'play', 'knot', 'cursor', 'gauge', 'cube', 'person', 'orb', 'shield'];

function iconObject(kind, M) {
  const g = new THREE.Group();
  switch (kind) {
    case 'layers':
      [0, 1, 2].forEach((k) => {
        const s = new THREE.Mesh(rbox(1.5, 0.14, 1.05, 0.06), [M.pearl, M.cobalt, M.peach][k]);
        s.position.y = 0.42 - k * 0.42; g.add(s);
      });
      g.rotation.set(0.5, -0.6, 0); break;
    case 'target':
      [[0.95, M.pearl], [0.62, M.cobalt]].forEach(([r, m]) => {
        const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.11, 32, 96), m); g.add(t);
      });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 32), M.peach));
      g.rotation.set(-0.35, 0.5, 0); break;
    case 'spark': {
      const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), M.cobalt);
      o.scale.set(0.7, 1.15, 0.7); g.add(o);
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), M.peach);
      s.position.set(0.85, 0.75, 0.2); g.add(s);
      const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), M.pearl);
      s2.position.set(-0.8, -0.6, 0.3); g.add(s2);
      g.rotation.set(0.2, 0.5, 0.1); break;
    }
    case 'steps':
      [0, 1, 2].forEach((k) => {
        const c = new THREE.Mesh(rbox(0.6, 0.35 + k * 0.38, 0.6, 0.08), [M.pearl, M.pearl, M.peach][k]);
        c.position.set(-0.65 + k * 0.65, (0.35 + k * 0.38) / 2 - 0.6, 0); g.add(c);
      });
      g.rotation.set(0.35, -0.55, 0); break;
    case 'chat': {
      const b = new THREE.Mesh(rbox(1.8, 1.2, 0.36, 0.3), M.pearl); g.add(b);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), M.pearl);
      tail.position.set(-0.5, -0.72, 0); tail.rotation.z = Math.PI + 0.5; g.add(tail);
      [-0.45, 0, 0.45].forEach((x, k) => {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 20), k === 1 ? M.peach : M.cobalt);
        d.position.set(x, 0, 0.2); g.add(d);
      });
      g.rotation.set(0.15, -0.45, 0); break;
    }
    case 'browser': {
      const f = new THREE.Mesh(rbox(1.9, 1.35, 0.14, 0.12), M.graphite); g.add(f);
      const sc = new THREE.Mesh(rbox(1.7, 1.0, 0.04, 0.05), M.cobalt); sc.position.set(0, -0.1, 0.07); g.add(sc);
      [M.keyGlow, M.rimGlow, M.pearl].forEach((m, k) => {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), m); d.position.set(-0.78 + k * 0.15, 0.55, 0.08); g.add(d);
      });
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.34, 48, 32), M.peach); s.position.set(0.35, -0.05, 0.42); g.add(s);
      g.rotation.set(0.12, -0.5, 0); break;
    }
    case 'console': {
      const base = new THREE.Mesh(rbox(1.7, 0.22, 1.2, 0.1), M.graphite); g.add(base);
      [[-0.4, 0.16, -0.2, M.pearl], [0.15, 0.16, -0.2, M.pearl], [0.6, 0.16, -0.2, M.peach], [-0.12, 0.16, 0.25, M.cobalt]].forEach(([x, y, z, m]) => {
        const k = new THREE.Mesh(rbox(0.4, 0.14, 0.36, 0.06), m); k.position.set(x, y, z); g.add(k);
      });
      g.rotation.set(0.6, -0.5, 0); break;
    }
    case 'coin':
      [0, 1, 2].forEach((k) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 64), k === 2 ? M.peach : M.pearl);
        c.position.set(k * 0.08, -0.4 + k * 0.2, 0); g.add(c);
      });
      { const up = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 64), M.peach);
        up.position.set(0.55, 0.55, 0.2); up.rotation.set(1.1, 0, 0.35); g.add(up); }
      g.rotation.set(0.25, -0.3, 0); break;
    case 'key': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 32, 80), M.peach);
      ring.position.x = -0.65; g.add(ring);
      const shaft = new THREE.Mesh(rbox(1.25, 0.2, 0.2, 0.08), M.peach); shaft.position.x = 0.35; g.add(shaft);
      [[0.62, -0.18], [0.85, -0.22]].forEach(([x, y]) => {
        const t = new THREE.Mesh(rbox(0.14, 0.32, 0.2, 0.05), M.peach); t.position.set(x, y, 0); g.add(t);
      });
      g.rotation.set(0.4, -0.5, 0.35); break;
    }
    case 'play': {
      const b = new THREE.Mesh(rbox(1.7, 1.15, 0.3, 0.22), M.cobalt); g.add(b);
      const tri = new THREE.Shape(); tri.moveTo(-0.22, -0.3); tri.lineTo(0.34, 0); tri.lineTo(-0.22, 0.3); tri.closePath();
      const p = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 }), M.pearl);
      p.position.z = 0.16; g.add(p);
      g.rotation.set(0.1, -0.5, 0); break;
    }
    case 'knot':
      g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.58, 0.2, 200, 32, 2, 3), M.pearl));
      g.rotation.set(0.3, 0.2, 0); break;
    case 'cursor': {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0, -1.2); shape.lineTo(0.3, -0.92); shape.lineTo(0.52, -1.36);
      shape.lineTo(0.72, -1.26); shape.lineTo(0.5, -0.84); shape.lineTo(0.88, -0.84); shape.closePath();
      const c = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 }), M.cobalt);
      c.position.set(-0.35, 0.65, 0); g.add(c);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 16, 64), M.peach); ring.position.set(-0.35, 0.65, -0.05); g.add(ring);
      g.rotation.set(0.15, -0.45, 0.1); break;
    }
    case 'gauge': {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.13, 24, 96, Math.PI), M.graphite);
      const fillArc = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.14, 24, 96, Math.PI * 0.72), M.rimGlow);
      fillArc.rotation.z = Math.PI * 0.28;
      const needle = new THREE.Mesh(rbox(0.1, 0.72, 0.1, 0.04), M.peach); needle.position.set(0.2, 0.3, 0.05); needle.rotation.z = -0.6;
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 20), M.pearl);
      g.add(arc, fillArc, needle, hub); g.position.y = -0.25; g.rotation.set(0.25, -0.35, 0); break;
    }
    case 'person': {
      const p = personObject(M); p.scale.setScalar(1.15); p.position.y = -0.1; g.add(p);
      g.rotation.set(0.1, -0.4, 0); break;
    }
    case 'orb': {
      const o = orbObject(M, 0.62); g.add(o); g.rotation.set(0.1, 0.2, 0); break;
    }
    case 'shield': {
      const sh = shieldObject(M); sh.scale.setScalar(2.6); sh.position.y = -1.3; g.add(sh); g.rotation.set(0.1, -0.35, 0); break;
    }
    default:
      g.add(new THREE.Mesh(rbox(1.2, 1.2, 1.2, 0.22), M.cobalt)); g.rotation.set(0.5, 0.7, 0.2);
  }
  return g;
}

export function icon(renderer, { kind = 'cube' } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(1.5, 2, 4);
  const M = materials();
  const obj = iconObject(kind, M);
  scene.add(obj);
  const cam = camera(30, 1, [0, 0, 5.2]);
  return { scene, camera: cam, root: obj, update(t) { obj.rotation.y += 0.004; } };
}

// ---------------------------------------------------------------------------
// 4 · Caso inmobiliaria: torre con unidad seleccionable
// ---------------------------------------------------------------------------
export function building(renderer, { aspect = 1, floors = 7 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.key.position.set(-6, 10, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(30, 0, 0.36));

  const podium = new THREE.Mesh(rbox(4.2, 0.3, 4.2, 0.1), M.graphite); podium.position.y = 0.15; root.add(podium);
  const units = [];
  const UW = 0.92, UH = 0.46, GAP = 0.08;
  const glassMat = M.glass;
  const unitMat = M.pearl;
  for (let f = 0; f < floors; f++) {
    const slab = new THREE.Mesh(rbox(2.25, 0.05, 2.25, 0.02), M.graphite);
    slab.position.y = 0.32 + f * (UH + GAP); root.add(slab);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], u) => {
      const unit = new THREE.Mesh(rbox(UW, UH, UW, 0.06), unitMat);
      unit.position.set(sx * (UW / 2 + 0.03), 0.32 + 0.025 + UH / 2 + f * (UH + GAP), sz * (UW / 2 + 0.03));
      unit.userData = { floor: f + 1, unit: u };
      const balcony = new THREE.Mesh(rbox(UW * 0.7, UH * 0.62, 0.04, 0.02), glassMat);
      balcony.position.set(0, -0.02, sz * (UW / 2 + 0.03));
      unit.add(balcony);
      root.add(unit); units.push(unit);
    });
  }
  // Remate de la torre
  const roof = new THREE.Mesh(rbox(1.2, 0.3, 1.2, 0.08), M.graphite);
  roof.position.y = 0.32 + floors * (UH + GAP) + 0.15; root.add(roof);

  // Árboles estilizados
  [[-1.75, 1.6], [1.7, 1.75], [-1.7, -1.65], [1.75, -1.5]].forEach(([x, z], k) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.35, 8), M.graphite);
    trunk.position.set(x, 0.47, z);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.2 + (k % 2) * 0.05, 32, 20), M.cobalt);
    crown.position.set(x, 0.75, z);
    root.add(trunk, crown);
  });

  // Marcador de la unidad elegida
  const pin = new THREE.Group();
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), M.peach);
  const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 32), M.peach);
  pinTip.rotation.x = Math.PI; pinTip.position.y = -0.2;
  pin.add(pinHead, pinTip);
  root.add(pin);
  castAll(root);

  const hiMat = new THREE.MeshPhysicalMaterial({
    color: 0xff8f66, emissive: new THREE.Color(0xff6a3d), emissiveIntensity: 0.55, roughness: 0.28, clearcoat: 1,
  });
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(UW + 0.06, UH + 0.06, UW + 0.06)),
    new THREE.LineBasicMaterial({ color: PALETTE.rim, toneMapped: false }));
  root.add(outline);
  const leader = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), M.rimGlow);
  root.add(leader);
  let selected = null;
  const select = (floor, unitIdx = 3) => {
    const u = units.find((x) => x.userData.floor === floor && x.userData.unit === unitIdx);
    if (!u) return;
    if (selected) selected.material = unitMat;
    selected = u; u.material = hiMat;
    outline.position.copy(u.position);
    const sx = Math.sign(u.position.x), sz = Math.sign(u.position.z);
    pin.position.set(u.position.x + sx * 1.1, u.position.y + 0.9, u.position.z + sz * 1.1);
    const from = u.position.clone().add(new THREE.Vector3(sx * 0.48, 0, sz * 0.48));
    const to = pin.position.clone().add(new THREE.Vector3(0, -0.36, 0));
    leader.position.copy(from).lerp(to, 0.5);
    leader.scale.y = from.distanceTo(to);
    leader.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  };
  select(Math.min(5, floors), 3);
  root.rotation.y = 0.18;

  const height = 0.32 + floors * (UH + GAP);
  const cam = camera(22, aspect, [10.2, 7.9, 11.9], [0.3, height * 0.42, 0.3]);
  return {
    scene, camera: cam, root, units,
    get selected() { return selected?.userData; },
    select,
    anchors: [{ id: 'unit', object: pin, offset: [0, 0.2, 0] }],
    update(t) {
      pinHead.position.y = Math.sin(t * 2) * 0.05;
      root.rotation.y = 0.18 + Math.sin(t * 0.25) * 0.12;
    },
  };
}

// ---------------------------------------------------------------------------
// 5 · Caso producto técnico: kit solar explosionado
// ---------------------------------------------------------------------------
function solarCellTexture() {
  return canvasTexture(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#c9cde6'; ctx.fillRect(0, 0, w, h);
    const cols = 10, rows = 6, pad = 6;
    const cw = (w - pad * (cols + 1)) / cols, ch = (h - pad * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = pad + c * (cw + pad), y = pad + r * (ch + pad);
      const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
      g.addColorStop(0, '#2433b8'); g.addColorStop(1, '#141a6b');
      ctx.fillStyle = g; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = 'rgba(200,210,255,0.35)'; ctx.lineWidth = 1.5;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + (cw * k) / 4, y); ctx.lineTo(x + (cw * k) / 4, y + ch); ctx.stroke(); }
    }
  });
}

export function solar(renderer, { aspect = 1, explode = 0.6 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.key.position.set(-6, 9, 6);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(30, -1.35, 0.2));

  const parts = [];
  const part = (obj, base, dir) => { obj.userData = { base: new THREE.Vector3(...base), dir: new THREE.Vector3(...dir) }; root.add(obj); parts.push(obj); return obj; };

  // Panel
  const panel = new THREE.Group();
  const frame = new THREE.Mesh(rbox(2.7, 0.09, 1.7, 0.035), M.pearl);
  const cells = new THREE.Mesh(new THREE.PlaneGeometry(2.58, 1.58), new THREE.MeshPhysicalMaterial({
    map: solarCellTexture(), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1,
  }));
  cells.rotation.x = -Math.PI / 2; cells.position.y = 0.047;
  panel.add(frame, cells);
  panel.rotation.set(0.42, 0, 0);
  part(panel, [-0.1, 1.15, -0.5], [0, 1.0, -0.3]);

  // Soporte
  const mount = new THREE.Group();
  [-0.9, 0.9].forEach((x) => {
    const leg = new THREE.Mesh(rbox(0.09, 0.9, 0.09, 0.03), M.graphite); leg.position.set(x, 0.45, -0.35);
    const leg2 = new THREE.Mesh(rbox(0.09, 0.45, 0.09, 0.03), M.graphite); leg2.position.set(x, 0.22, 0.35);
    const rail = new THREE.Mesh(rbox(0.09, 0.09, 1.0, 0.03), M.graphite); rail.position.set(x, 0.66, 0); rail.rotation.x = 0.42;
    mount.add(leg, leg2, rail);
  });
  part(mount, [-0.1, -0.15, -0.5], [0, 0.15, -0.15]);

  // Inversor
  const inverter = new THREE.Group();
  const invBody = new THREE.Mesh(rbox(0.85, 1.05, 0.34, 0.08), M.pearl);
  const invScreen = new THREE.Mesh(rbox(0.46, 0.22, 0.02, 0.02), M.rimGlow); invScreen.position.set(0, 0.22, 0.175);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), M.keyGlow); led.position.set(0.28, -0.32, 0.175);
  inverter.add(invBody, invScreen, led);
  inverter.rotation.y = -0.35;
  part(inverter, [1.2, -0.75, 0.8], [0.85, 0.25, 0.4]);

  // Batería
  const battery = new THREE.Group();
  const batBody = new THREE.Mesh(rbox(0.8, 1.15, 0.6, 0.1), M.graphite);
  const band = new THREE.Mesh(rbox(0.82, 0.12, 0.62, 0.04), M.peach); band.position.y = 0.28;
  const bars = [0, 1, 2, 3].map((k) => {
    const b = new THREE.Mesh(rbox(0.1, 0.18, 0.02, 0.02), M.rimGlow); b.position.set(-0.18 + k * 0.12, -0.12, 0.305); return b;
  });
  battery.add(batBody, band, ...bars);
  battery.rotation.y = 0.25;
  part(battery, [-1.25, -0.75, 0.9], [-0.9, 0.2, 0.45]);

  // Cables
  const cableMat = new THREE.MeshPhysicalMaterial({ color: 0x2b2f5c, roughness: 0.5, clearcoat: 0.4 });
  const cables = new THREE.Group(); root.add(cables);
  const rebuildCables = () => {
    cables.clear();
    const p = parts.map((o) => o.position);
    const mk = (a, b, lift) => {
      const mid = a.clone().lerp(b, 0.5); mid.y -= lift;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.028, 10, false), cableMat);
      m.castShadow = true; cables.add(m);
    };
    mk(p[0].clone().add(new THREE.Vector3(0.6, -0.3, 0.6)), p[2].clone().add(new THREE.Vector3(0, 0.52, 0)), 0.3);
    mk(p[2].clone().add(new THREE.Vector3(-0.3, -0.4, 0)), p[3].clone().add(new THREE.Vector3(0.3, -0.3, 0)), 0.5);
  };

  // Hotspots
  const hotspots = [panel, inverter, battery].map((obj, k) => {
    const h = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 12, 48), M.rimGlow);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), M.keyGlow);
    h.add(ring, core);
    h.userData.target = obj; h.userData.offset = [new THREE.Vector3(0.95, 0.45, 0.6), new THREE.Vector3(0.1, 0.78, 0.25), new THREE.Vector3(-0.05, 0.85, 0.3)][k];
    root.add(h); return h;
  });

  let e = explode;
  const layout = () => {
    parts.forEach((o) => o.position.copy(o.userData.base).addScaledVector(o.userData.dir, e));
    hotspots.forEach((h) => h.position.copy(h.userData.target.position).add(h.userData.offset));
    rebuildCables();
  };
  layout();
  castAll(root);
  root.rotation.y = -0.25;

  const cam = camera(26, aspect, [6.2, 4.2, 9.0], [0, 0.15, 0]);
  return {
    scene, camera: cam, root, hotspots,
    anchors: hotspots.map((h, k) => ({ id: `part-${k}`, object: h })),
    setExplode(v) { e = v; layout(); },
    update(t, pointer) {
      hotspots.forEach((h, k) => { h.lookAt(cam.position); h.scale.setScalar(1 + Math.sin(t * 2.4 + k) * 0.12); });
      root.rotation.y = -0.25 + Math.sin(t * 0.3) * 0.08;
    },
  };
}

// ---------------------------------------------------------------------------
// 6 · Caso servicio: el recorrido del dinero
// ---------------------------------------------------------------------------
export function flow(renderer, { aspect = 16 / 9 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.key.position.set(-4, 9, 7);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(40, -0.06, 0.28));

  const pts = [[-4.2, 0.45, 0.6], [-2.6, 0.95, -0.6], [-1.3, 0.55, 0.4], [0.2, 1.0, -0.4], [1.4, 0.6, 0.5], [2.8, 0.95, -0.3], [4.2, 0.5, 0.4]]
    .map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const tubeMat = new THREE.MeshBasicMaterial({ color: PALETTE.rim, transparent: true, opacity: 0.55, toneMapped: false });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.03, 10, false), tubeMat);
  root.add(tube);

  // Nodos: Envías → Cambio → Verificación → Recibe
  const nodeT = [0, 0.34, 0.67, 1];
  const nodes = nodeT.map((t, k) => {
    const n = new THREE.Group();
    const p = curve.getPointAt(t);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.14, 64), M.graphite);
    base.position.y = 0.01;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.018, 10, 96), M.rimGlow);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.09;
    n.add(base, ring);
    let top;
    if (k === 0 || k === 3) { // teléfono
      top = new THREE.Mesh(rbox(0.36, 0.66, 0.06, 0.07), M.pearl);
      top.position.y = 0.62; top.rotation.y = 0.4;
      const scr = new THREE.Mesh(rbox(0.3, 0.52, 0.01, 0.04), k === 0 ? M.cobalt : M.peach);
      scr.position.z = 0.032; top.add(scr);
    } else if (k === 1) { // cambio de divisa
      top = new THREE.Group();
      [M.pearl, M.peach].forEach((m, j) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 48), m);
        c.rotation.set(Math.PI / 2, 0, 0); c.position.set(-0.13 + j * 0.26, 0.45 + j * 0.12, j * 0.05); top.add(c);
      });
    } else { // verificación
      top = new THREE.Group();
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.32); sh.quadraticCurveTo(0.22, 0.28, 0.26, 0.22); sh.lineTo(0.24, -0.04);
      sh.quadraticCurveTo(0.18, -0.24, 0, -0.34); sh.quadraticCurveTo(-0.18, -0.24, -0.24, -0.04);
      sh.lineTo(-0.26, 0.22); sh.quadraticCurveTo(-0.22, 0.28, 0, 0.32);
      const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), M.cobalt);
      shield.position.y = 0.5; top.add(shield);
      const check = new THREE.Shape();
      check.moveTo(-0.12, 0.0); check.lineTo(-0.03, -0.09); check.lineTo(0.13, 0.09); check.lineTo(0.1, 0.12); check.lineTo(-0.03, -0.03); check.lineTo(-0.09, 0.03); check.closePath();
      const ck = new THREE.Mesh(new THREE.ExtrudeGeometry(check, { depth: 0.03, bevelEnabled: false }), M.pearl);
      ck.position.set(0, 0.5, 0.12); top.add(ck);
      top.rotation.y = 0.3;
    }
    top.scale.setScalar(1.5);
    n.add(top);
    n.position.set(p.x, 0, p.z);
    n.userData = { t, top, topY: top.position.y };
    root.add(n); return n;
  });

  // Monedas en tránsito (estela)
  const coins = [0, 1, 2].map((k) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 48), k === 0 ? M.peach : M.keyGlow);
    c.scale.setScalar(1 - k * 0.3);
    c.rotation.set(Math.PI / 2, 0, 0.4); root.add(c); return c;
  });
  const placeCoins = (t) => coins.forEach((c, k) => {
    const tt = Math.max(0, t - k * 0.035);
    c.position.copy(curve.getPointAt(tt)); c.position.y += 0.22;
    c.rotation.y = tt * 20;
  });
  placeCoins(0.5);
  root.add(dust(50, [10, 2.5, 3], PALETTE.rim, 0.035, 0.45));
  castAll(root);
  tube.castShadow = false;

  const cam = camera(25, aspect, [0, 5.4, 11.8], [0, 0.55, 0]);
  return {
    scene, camera: cam, root, nodes, curve,
    anchors: nodes.map((n, k) => ({ id: `node-${k}`, object: n, offset: [0, 1.15, 0] })),
    setProgress(t) { placeCoins(Math.min(1, Math.max(0, t))); },
    update(t) { nodes.forEach((n, k) => { n.userData.top.position.y = n.userData.topY + Math.sin(t * 1.4 + k) * 0.04; }); },
  };
}

// ---------------------------------------------------------------------------
// 7 · Pipeline de IA: imagen → video → 3D
// ---------------------------------------------------------------------------
function artTexture(variant = 0) {
  return canvasTexture(512, 640, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, ['#2b2f7a', '#3a2a6e', '#22306e'][variant % 3]); g.addColorStop(1, '#ff9a74');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,230,0.92)';
    ctx.beginPath(); ctx.arc(w * (0.62 - variant * 0.06), h * (0.36 + variant * 0.03), 70, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141838';
    ctx.beginPath(); ctx.moveTo(0, h * 0.78); ctx.lineTo(w * 0.3, h * 0.55); ctx.lineTo(w * 0.55, h * 0.72);
    ctx.lineTo(w * 0.78, h * 0.5); ctx.lineTo(w, h * 0.7); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
  });
}

export function pipeline(renderer, { aspect = 16 / 9 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(0, 2, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);

  // 1. Imagen
  const card = new THREE.Group();
  const cardBody = new THREE.Mesh(rbox(1.3, 1.62, 0.06, 0.06), M.pearl);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.5), new THREE.MeshBasicMaterial({ map: artTexture(0), toneMapped: false }));
  art.position.z = 0.032; card.add(cardBody, art);
  card.position.set(-3.1, 0.1, 0); card.rotation.set(0.05, 0.45, -0.06);
  root.add(card);

  // 2. Video (tira de fotogramas en arco)
  const strip = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Group();
    const body = new THREE.Mesh(rbox(0.62, 0.8, 0.04, 0.03), M.graphite);
    const img = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.66), new THREE.MeshBasicMaterial({ map: artTexture(k), toneMapped: false }));
    img.position.z = 0.022; f.add(body, img);
    const a = (k - 2) * 0.32;
    f.position.set(Math.sin(a) * 1.9, (k - 2) * 0.06, Math.cos(a) * 1.9 - 1.9);
    f.rotation.y = a;
    strip.add(f);
  }
  const play = new THREE.Shape(); play.moveTo(-0.14, -0.18); play.lineTo(0.2, 0); play.lineTo(-0.14, 0.18); play.closePath();
  const pl = new THREE.Mesh(new THREE.ExtrudeGeometry(play, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), M.peach);
  pl.position.set(0, 0, 0.18); strip.add(pl);
  strip.position.set(-0.1, 0.15, 0.3); strip.rotation.y = -0.15;
  root.add(strip);

  // 3. Objeto 3D (malla + volumen)
  const obj = new THREE.Group();
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.52, 0.18, 220, 32, 2, 3), M.pearl);
  const wire = new THREE.Mesh(new THREE.TorusKnotGeometry(0.52, 0.2, 60, 8, 2, 3), M.wire);
  wire.position.x = -0.05;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.16, 64), M.graphite); ped.position.y = -0.95;
  obj.add(knot, wire, ped);
  obj.position.set(3.0, 0.25, 0); obj.rotation.set(0.2, -0.3, 0);
  root.add(obj);

  // Flechas
  [[-1.75, 0.15], [1.65, 0.15]].forEach(([x, y]) => {
    const ch = new THREE.Group();
    [0, 1].forEach((j) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 32), j ? M.rimGlow : M.keyGlow);
      c.rotation.z = -Math.PI / 2; c.position.x = j * 0.22; ch.add(c);
    });
    ch.position.set(x, y, 0.3); root.add(ch);
  });
  root.add(dust(40, [9, 3.5, 2], PALETTE.rim, 0.03, 0.4));
  castAll(root);

  const cam = camera(28, aspect, [0, 0.6, 10.5], [0, 0.1, 0]);
  return {
    scene, camera: cam, root,
    anchors: [{ id: 'img', object: card, offset: [0, -1.05, 0] }, { id: 'video', object: strip, offset: [0, -0.75, 0] }, { id: '3d', object: obj, offset: [0, -1.25, 0] }],
    update(t) { knot.rotation.y = t * 0.4; wire.rotation.y = t * 0.4; strip.rotation.y = -0.15 + Math.sin(t * 0.5) * 0.08; },
  };
}

// ---------------------------------------------------------------------------
// 8 · Mockup de dispositivos con captura de la web
// ---------------------------------------------------------------------------
export async function devices(renderer, { aspect = 16 / 10, desktopShot, mobileShot } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.key.position.set(-5, 8, 7);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(30, 0, 0.34));
  const loader = new THREE.TextureLoader();
  const load = (url) => new Promise((res) => {
    if (!url) return res(null);
    loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null));
  });
  const [dTex, mTex] = await Promise.all([load(desktopShot), load(mobileShot)]);
  const screenMat = (tex) => tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : M.cobalt;

  // Portátil
  const laptop = new THREE.Group();
  const base = new THREE.Mesh(rbox(3.6, 0.12, 2.35, 0.06), M.graphite); base.position.y = 0.06;
  const deck = new THREE.Mesh(rbox(3.2, 0.01, 1.2, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x13152e, roughness: 0.6 }));
  deck.position.set(0, 0.125, -0.3);
  const pad = new THREE.Mesh(rbox(1.1, 0.01, 0.62, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x262a55, roughness: 0.4 }));
  pad.position.set(0, 0.125, 0.75);
  const lid = new THREE.Group();
  const lidBody = new THREE.Mesh(rbox(3.6, 2.3, 0.08, 0.06), M.graphite); lidBody.position.y = 1.15;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.125), screenMat(dTex)); scr.position.set(0, 1.17, 0.042);
  lid.add(lidBody, scr);
  lid.position.set(0, 0.12, -1.15); lid.rotation.x = -0.16;
  laptop.add(base, deck, pad, lid);
  laptop.rotation.y = 0.32; laptop.position.set(-0.7, 0, -0.3);
  root.add(laptop);

  // Teléfono
  const phone = new THREE.Group();
  const pBody = new THREE.Mesh(rbox(1.02, 2.1, 0.1, 0.16), M.graphite);
  const pScr = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.99), screenMat(mTex)); pScr.position.z = 0.052;
  phone.add(pBody, pScr);
  phone.position.set(2.1, 1.08, 1.05); phone.rotation.set(-0.05, -0.38, 0.03);
  root.add(phone);
  root.add(dust(40, [9, 4, 4], PALETTE.rim, 0.03, 0.35));
  castAll(root);

  const cam = camera(26, aspect, [1.2, 3.4, 9.6], [0.4, 1.0, 0]);
  return { scene, camera: cam, root, update() {} };
}

// ---------------------------------------------------------------------------
// Guía de negocio con IA: piezas reutilizables
// ---------------------------------------------------------------------------
function orbObject(M, r = 0.5) {
  // Agente: núcleo + órbita con un satélite (el bucle de trabajo)
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), M.pearl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.55, r * 0.07, 16, 120), M.cobalt);
  ring.rotation.set(1.2, 0.3, 0);
  const sat = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 24, 16), M.keyGlow);
  sat.position.set(r * 1.55, 0, 0);
  ring.add(sat);
  g.add(core, ring);
  g.userData = { ring };
  return g;
}

function personObject(M) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 32), M.pearl);
  head.position.y = 0.72;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.42, 12, 32), M.peach);
  body.position.y = -0.05;
  g.add(head, body);
  return g;
}

function shieldObject(M) {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.32); sh.quadraticCurveTo(0.22, 0.28, 0.26, 0.22); sh.lineTo(0.24, -0.04);
  sh.quadraticCurveTo(0.18, -0.24, 0, -0.34); sh.quadraticCurveTo(-0.18, -0.24, -0.24, -0.04);
  sh.lineTo(-0.26, 0.22); sh.quadraticCurveTo(-0.22, 0.28, 0, 0.32);
  const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4 }), M.cobalt);
  shield.position.y = 0.5;
  const check = new THREE.Shape();
  check.moveTo(-0.12, 0.0); check.lineTo(-0.03, -0.09); check.lineTo(0.13, 0.09); check.lineTo(0.1, 0.12); check.lineTo(-0.03, -0.03); check.lineTo(-0.09, 0.03); check.closePath();
  const ck = new THREE.Mesh(new THREE.ExtrudeGeometry(check, { depth: 0.03, bevelEnabled: false }), M.pearl);
  ck.position.set(0, 0.5, 0.12);
  g.add(shield, ck);
  return g;
}

function chatObject(M, mat) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(rbox(1.0, 0.68, 0.22, 0.17), mat ?? M.pearl);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), mat ?? M.pearl);
  tail.position.set(-0.28, -0.42, 0); tail.rotation.z = Math.PI + 0.5;
  g.add(b, tail);
  [-0.26, 0, 0.26].forEach((x, k) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), k === 1 ? M.peach : M.cobalt);
    d.position.set(x, 0, 0.12); g.add(d);
  });
  return g;
}

function cardsObject(M, n = 3) {
  // Documento / instrucciones: tarjetas de pie con líneas de texto
  const g = new THREE.Group();
  for (let k = 0; k < n; k++) {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(rbox(0.72, 0.92, 0.04, 0.05), k === n - 1 ? M.pearl : M.glass));
    if (k === n - 1) {
      [0.26, 0.12, -0.02, -0.16].forEach((y, j) => {
        const line = new THREE.Mesh(rbox(j === 0 ? 0.42 : 0.5 - j * 0.06, 0.05, 0.02, 0.02), j === 0 ? M.cobalt : M.graphite);
        line.position.set(-0.04 - (j === 0 ? 0.04 : 0), y, 0.03); c.add(line);
      });
    }
    c.position.set(-0.16 + k * 0.16, 0, -0.18 + k * 0.18);
    g.add(c);
  }
  return g;
}

function coinStack(M) {
  const g = new THREE.Group();
  [0, 1, 2].forEach((k) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 64), M.peach);
    c.position.set(k * 0.03, 0.05 + k * 0.11, 0); g.add(c);
  });
  const up = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 64), M.peach);
  up.position.set(0.32, 0.62, 0.12); up.rotation.set(1.15, 0, 0.3); g.add(up);
  return g;
}

function platform(M, r = 0.6) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 0.14, 64), M.graphite);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.018, 10, 96), M.rimGlow);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.075;
  g.add(base, ring);
  return g;
}

function bob(objs, t, amp = 0.05) {
  objs.forEach((o, k) => { o.position.y = o.userData.baseY + Math.sin(t * 1.3 + k) * amp; });
}
const remember = (o) => { o.userData.baseY = o.position.y; return o; };

// ---------------------------------------------------------------------------
// 9 · Portada de la guía: escalones que suben hacia un sistema (agente)
// ---------------------------------------------------------------------------
export function system(renderer, { aspect = 16 / 10 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(1.5, 2.2, 4.5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);
  const floor = -1.5;
  const steps = [[-2.1, 0.7, M.graphite], [-0.65, 1.35, M.graphite], [0.85, 2.0, M.cobalt]];
  steps.forEach(([x, h, mat]) => {
    const st = new THREE.Mesh(rbox(1.35, h, 1.5, 0.1), mat);
    st.position.set(x, floor + h / 2, 0);
    const edge = roundedRectLine(1.3, 1.45, 0.08, PALETTE.rim, 0.6);
    edge.position.set(x, floor + h + 0.005, 0);
    root.add(st, edge);
  });
  const chat = remember(Object.assign(chatObject(M), {}));
  chat.scale.setScalar(0.62); chat.position.set(-2.1, floor + 0.7 + 0.42, 0.1); chat.rotation.y = 0.35; remember(chat);
  const coins = coinStack(M); coins.scale.setScalar(0.85); coins.position.set(-0.65, floor + 1.35 + 0.02, 0.1); remember(coins);
  const orb = orbObject(M, 0.62); orb.position.set(0.85, floor + 2.0 + 0.9, 0); remember(orb);
  root.add(chat, coins, orb);
  // Piezas sueltas alrededor: lo que el sistema ordena
  const loose = [
    [new THREE.Mesh(rbox(0.42, 0.42, 0.42, 0.09), M.cobalt), [2.55, 1.55, -0.4], [0.5, 0.7, 0.2]],
    [new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), M.peach), [-1.35, 1.2, -0.6], [0.3, 0.4, 0]],
    [new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.38, 10, 24), M.pearl), [2.45, -0.35, 0.6], [0.2, 0, -0.9]],
    [new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 14), M.rimGlow), [-2.7, 0.8, 0.9], [0, 0, 0]],
    [new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 14), M.keyGlow), [1.95, 2.05, 0.8], [0, 0, 0]],
  ].map(([m, p, r]) => { m.position.set(...p); m.rotation.set(...r); root.add(m); return remember(m); });
  root.add(dust(70, [9, 6, 5], PALETTE.rim, 0.035, 0.45));
  castAll(root);
  root.rotation.y = -0.38;
  const cam = camera(30, aspect, [1.2, 1.4, 10.4], [0, 0.05, 0]);
  return {
    scene, camera: cam, root,
    update(t) {
      bob([chat, coins, orb, ...loose], t, 0.05);
      orb.userData.ring.rotation.z = t * 0.6;
    },
  };
}

// ---------------------------------------------------------------------------
// 10 · Enfoque: una diana, un dardo y las distracciones fuera
// ---------------------------------------------------------------------------
export function focus(renderer, { aspect = 1 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(2, 2, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);
  const target = new THREE.Group();
  [[1.45, M.pearl], [1.0, M.cobalt], [0.56, M.pearl]].forEach(([r, m]) => target.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.13, 32, 128), m)));
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32), M.peach);
  target.add(bull);
  target.rotation.set(-0.08, -0.42, 0);
  root.add(target);
  // Dardo clavado en el centro
  const start = new THREE.Vector3(2.4, 1.5, 2.6), end = new THREE.Vector3(0.05, 0.03, 0.18);
  const dir = start.clone().sub(end).normalize();
  const dart = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 16), M.graphite);
  shaft.position.y = 1.0;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 24), M.peach);
  tip.rotation.x = Math.PI; tip.position.y = -0.1;
  dart.add(shaft, tip);
  [0, 1, 2].forEach((k) => {
    const fin = new THREE.Mesh(rbox(0.02, 0.3, 0.16, 0.008), M.peach);
    fin.position.set(Math.cos(k * 2.09) * 0.07, 1.86, Math.sin(k * 2.09) * 0.07);
    fin.rotation.y = -k * 2.09;
    dart.add(fin);
  });
  dart.position.copy(end);
  dart.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  root.add(dart);
  // Distracciones: piezas apagadas y dispersas fuera de la diana
  const dim = new THREE.MeshPhysicalMaterial({ color: 0x3a3f72, roughness: 0.5, clearcoat: 0.3, transparent: true, opacity: 0.75 });
  const geos = [new THREE.IcosahedronGeometry(0.2, 0), rbox(0.3, 0.3, 0.3, 0.06), new THREE.CapsuleGeometry(0.09, 0.28, 8, 16), new THREE.TorusGeometry(0.16, 0.06, 12, 40), new THREE.OctahedronGeometry(0.2, 0)];
  const loose = [];
  for (let k = 0; k < 10; k++) {
    const a = k * 0.63 + 0.4, r = 2.25 + (k % 3) * 0.35;
    const m = new THREE.Mesh(geos[k % geos.length], dim);
    m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.8, -0.6 + (k % 4) * 0.3);
    m.rotation.set(k, k * 0.7, 0);
    root.add(m); loose.push(remember(m));
  }
  root.add(dust(40, [7, 6, 3], PALETTE.rim, 0.03, 0.35));
  castAll(root);
  const cam = camera(30, aspect, [1.0, 0.5, 10.4], [0.1, 0, 0]);
  return {
    scene, camera: cam, root,
    anchors: [{ id: 'bull', object: bull, offset: [0, 0, 0] }],
    update(t) { bob(loose, t, 0.06); },
  };
}

// ---------------------------------------------------------------------------
// 11 · Escalera Service-as-a-Software: a mano → escrito → agente → resultado
// ---------------------------------------------------------------------------
export function stairs(renderer, { aspect = 16 / 9 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(0, 3, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(40, -1.3, 0.25));
  const floor = -1.3;
  const xs = [-2.85, -0.95, 0.95, 2.85], hs = [0.45, 0.95, 1.45, 1.95];
  const glyphs = [];
  xs.forEach((x, i) => {
    const st = new THREE.Mesh(rbox(1.75, hs[i], 1.7, 0.1), i === 3 ? M.cobalt : M.graphite);
    st.position.set(x, floor + hs[i] / 2, 0);
    const edge = roundedRectLine(1.7, 1.65, 0.08, PALETTE.rim, 0.55);
    edge.position.set(x, floor + hs[i] + 0.005, 0);
    root.add(st, edge);
    let g;
    if (i === 0) { g = chatObject(M); g.scale.setScalar(0.7); g.position.y = 0.5; }
    else if (i === 1) { g = cardsObject(M); g.position.y = 0.48; g.rotation.y = 0.3; }
    else if (i === 2) { g = orbObject(M, 0.36); g.position.y = 0.62; }
    else { g = coinStack(M); g.position.y = 0.02; }
    g.position.x = x; g.position.y += floor + hs[i];
    remember(g); root.add(g); glyphs.push(g);
  });
  // Línea que sube por los peldaños
  const pts = glyphs.map((g, i) => new THREE.Vector3(xs[i], floor + hs[i] + 1.35, 0.2));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeMat = new THREE.MeshBasicMaterial({ color: PALETTE.rim, transparent: true, opacity: 0.45, toneMapped: false });
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.02, 8, false), tubeMat));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 24), M.rimGlow);
  head.position.copy(pts[3]).add(new THREE.Vector3(0.15, 0.05, 0)); head.rotation.z = -Math.PI / 2 + 0.25;
  root.add(head);
  root.add(dust(50, [10, 5, 3], PALETTE.rim, 0.03, 0.4));
  castAll(root);
  root.rotation.y = -0.18;
  const cam = camera(26, aspect, [0.8, 2.8, 13.2], [0, 0.1, 0]);
  return {
    scene, camera: cam, root,
    anchors: glyphs.map((g, i) => ({ id: `step-${i}`, object: root, offset: [xs[i], floor + hs[i] + 1.05, 0] })),
    update(t) { bob(glyphs, t, 0.04); glyphs[2].userData.ring.rotation.z = t * 0.8; },
  };
}

// ---------------------------------------------------------------------------
// 12 · Anatomía de un agente
// ---------------------------------------------------------------------------
export function agent(renderer, { aspect = 16 / 10 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.glint.position.set(0, 2, 5);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root);
  const ped = platform(M, 1.0); ped.position.y = -1.35; root.add(ped);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.78, 96, 64), M.pearl);
  const brain = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), M.wire);
  root.add(core, brain);
  // Bucle: anillo con flechas
  const loop = new THREE.Group();
  loop.add(new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.025, 12, 200), M.rimGlow));
  [0.3, 2.4, 4.5].forEach((a) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 24), M.keyGlow);
    c.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0);
    c.rotation.z = a; // tangente
    loop.add(c);
  });
  loop.rotation.set(Math.PI / 2 - 0.32, 0, 0);
  root.add(loop);
  // Satélites
  const cards = cardsObject(M); cards.scale.setScalar(0.85); cards.position.set(-2.75, 0.95, 0.2); cards.rotation.y = 0.45;
  const key = iconObject('key', M); key.scale.setScalar(0.55); key.position.set(2.75, 1.0, 0.2);
  const mem = new THREE.Group();
  [[0, 0, M.cobalt], [0.36, 0, M.pearl], [0.18, 0.34, M.peach]].forEach(([x, y, m]) => {
    const c = new THREE.Mesh(rbox(0.32, 0.32, 0.32, 0.07), m); c.position.set(x, y, 0); mem.add(c);
  });
  mem.position.set(-2.85, -0.85, 0.4); mem.rotation.y = 0.4;
  const shield = shieldObject(M); shield.scale.setScalar(1.5); shield.position.set(2.75, -1.55, 0.4);
  [cards, key, mem, shield].forEach((o) => { remember(o); root.add(o); });
  root.add(dust(50, [9, 5, 4], PALETTE.rim, 0.03, 0.4));
  castAll(root);
  const cam = camera(28, aspect, [0, 1.25, 10.6], [0, -0.05, 0]);
  return {
    scene, camera: cam, root,
    anchors: [
      { id: 'core', object: core, offset: [0, 0.8, 0] },
      { id: 'cards', object: cards, offset: [0, 0.5, 0] },
      { id: 'key', object: key, offset: [0, 0.4, 0] },
      { id: 'memory', object: mem, offset: [0.18, 0.55, 0] },
      { id: 'shield', object: shield, offset: [0, 0.86, 0] },
      { id: 'loop', object: loop, offset: [0, -1.75, 0] },
    ],
    update(t) { bob([cards, key, mem, shield], t, 0.05); brain.rotation.y = t * 0.3; loop.rotation.z = -t * 0.3; },
  };
}

// ---------------------------------------------------------------------------
// 13 · Bucle de calidad: hacedor → auditor → humano → cliente
// ---------------------------------------------------------------------------
export function audit(renderer, { aspect = 16 / 9 } = {}) {
  const { scene, lights } = createStage(renderer);
  lights.key.position.set(-4, 9, 7);
  const M = materials();
  const root = new THREE.Group();
  scene.add(root, shadowCatcher(40, -0.08, 0.26));
  const xs = [-3.9, -1.3, 1.3, 3.9];
  const tops = [];
  xs.forEach((x, i) => {
    const p = platform(M, 0.66); p.position.set(x, 0, 0); root.add(p);
    let g;
    if (i === 0) { g = orbObject(M, 0.38); g.position.y = 0.8; }
    else if (i === 1) { g = shieldObject(M); g.scale.setScalar(1.6); g.position.y = -0.2; }
    else if (i === 2) { g = personObject(M); g.scale.setScalar(0.75); g.position.y = 0.42; }
    else { g = chatObject(M); g.scale.setScalar(0.75); g.position.y = 0.75; }
    g.position.x = x; remember(g); root.add(g); tops.push(g);
  });
  // Camino hacia adelante
  const fwd = new THREE.CatmullRomCurve3(xs.map((x) => new THREE.Vector3(x, 0.12, 0.7)));
  root.add(new THREE.Mesh(new THREE.TubeGeometry(fwd, 200, 0.03, 8, false),
    new THREE.MeshBasicMaterial({ color: PALETTE.rim, transparent: true, opacity: 0.6, toneMapped: false })));
  [-2.6, 0, 2.6].forEach((x) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 24), M.rimGlow);
    c.position.set(x, 0.12, 0.7); c.rotation.z = -Math.PI / 2; root.add(c);
  });
  // Vuelta de corrección: del auditor al hacedor
  const back = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.3, 1.75, -0.2), new THREE.Vector3(-2.6, 2.45, -0.3), new THREE.Vector3(-3.9, 1.75, -0.2),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(back, 80, 0.03, 8, false),
    new THREE.MeshBasicMaterial({ color: PALETTE.key, transparent: true, opacity: 0.85, toneMapped: false })));
  const bh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 24), M.keyGlow);
  bh.position.set(-3.88, 1.66, -0.2); bh.rotation.z = Math.PI + 0.35; root.add(bh);
  root.add(dust(40, [11, 3, 3], PALETTE.rim, 0.03, 0.4));
  castAll(root);
  const cam = camera(25, aspect, [0, 4.3, 12.2], [0, 0.75, 0]);
  return {
    scene, camera: cam, root,
    anchors: [
      ...xs.map((x, i) => ({ id: `st-${i}`, object: root, offset: [x, -0.15, 0.9] })),
      { id: 'back', object: root, offset: [-2.6, 2.45, -0.3] },
    ],
    update(t) { bob(tops, t, 0.04); tops[0].userData.ring.rotation.z = t * 0.8; },
  };
}

export const SCENES = { hero, layers, icon, building, solar, flow, pipeline, devices, system, focus, stairs, agent, audit };
