// Renderiza todas las escenas 3D a PNG para el PDF (assets/renders) + anchors.json
import { chromium } from 'playwright';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, routeThreeToLocal, CHROMIUM_ARGS, ROOT } from './lib/server.mjs';

const OUT = join(ROOT, 'assets/renders');
const only = process.argv.slice(2);

const SHOTS = [
  { file: 'hero', scene: 'hero', width: 1500, height: 940 },
  { file: 'layers', scene: 'layers', width: 1000, height: 1080, spread: 1 },
  { file: 'building', scene: 'building', width: 1000, height: 1000 },
  { file: 'solar', scene: 'solar', width: 1100, height: 900 },
  { file: 'flow', scene: 'flow', width: 1600, height: 640 },
  { file: 'pipeline', scene: 'pipeline', width: 1600, height: 700 },
  // Guía de negocio con IA
  { file: 'system', scene: 'system', width: 1500, height: 940 },
  { file: 'focus', scene: 'focus', width: 900, height: 900 },
  { file: 'stairs', scene: 'stairs', width: 1700, height: 760 },
  { file: 'agent', scene: 'agent', width: 1500, height: 940 },
  { file: 'audit', scene: 'audit', width: 1700, height: 640 },
  ...['layers', 'target', 'spark', 'steps', 'chat', 'browser', 'console', 'coin', 'key', 'play', 'knot', 'cursor', 'gauge', 'cube', 'person', 'orb', 'shield']
    .map((kind) => ({ file: `icon-${kind}`, scene: 'icon', kind, width: 360, height: 360, pixelRatio: 1.5 })),
];

const exists = (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
const { server, url } = await startServer();
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

// Capturas de la versión web para el mockup de dispositivos (si ya está construida)
const webIndex = join(ROOT, 'dist/web/index.html');
const shots = [...SHOTS];
if (await exists(webIndex) && (!only.length || only.includes('devices'))) {
  for (const [name, vp, scale] of [['web-desktop', { width: 1440, height: 900 }, 1], ['web-mobile', { width: 390, height: 844 }, 2]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await routeThreeToLocal(p);
    await p.goto(`${url}/dist/web/index.html`);
    await p.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(600);
    await p.screenshot({ path: join(OUT, `${name}.png`) });
    await ctx.close();
    console.log('captura', name);
  }
  shots.push({ file: 'devices', scene: 'devices', width: 1500, height: 940, desktopShot: '/assets/renders/web-desktop.png', mobileShot: '/assets/renders/web-mobile.png' });
}

await page.goto(`${url}/render/render.html`);
await page.waitForFunction(() => window.ready === true);

const anchorsPath = join(OUT, 'anchors.json');
let anchors = {};
try { anchors = JSON.parse(await (await import('node:fs/promises')).readFile(anchorsPath, 'utf8')); } catch {}

for (const s of shots) {
  if (only.length && !only.includes(s.file) && !only.includes(s.scene)) continue;
  const t0 = Date.now();
  const { file, scene, ...opts } = s;
  const res = await page.evaluate(([n, o]) => window.shot(n, o), [scene, opts]);
  await writeFile(join(OUT, `${file}.png`), Buffer.from(res.png.split(',')[1], 'base64'));
  if (res.anchors.length) anchors[file] = res.anchors;
  console.log(`render ${file}.png ${s.width}x${s.height} (${Date.now() - t0} ms)`);
}
await writeFile(anchorsPath, JSON.stringify(anchors, null, 2));
await browser.close();
server.close();
