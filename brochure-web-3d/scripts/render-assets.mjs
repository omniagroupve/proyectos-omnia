// Renderiza cada escena 3D a PNG transparente (Three.js en Chromium headless).
// Salida: web/assets/renders/*.png + anchors.json (posición de etiquetas sobre cada render).
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { serve, CHROMIUM_ARGS } from "./lib/server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "web/assets/renders");

import { RENDERS } from "./lib/renders.mjs";

const only = process.argv.slice(2);
await mkdir(OUT, { recursive: true });
const server = await serve(ROOT);
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("  [console]", m.text()));
page.on("pageerror", (e) => console.error("  [pageerror]", e.message));

const anchors = {};
for (const [name, w, h] of RENDERS) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${server.url}/src/render.html?scene=${name}&w=${w}&h=${h}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 120000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`${name}: ${err}`);
  anchors[name] = await page.evaluate(() => window.__anchors);
  await page.locator("#c").screenshot({ path: join(OUT, `${name}.png`), omitBackground: true });
  console.log(`✓ ${name} (${w}×${h}) ${Date.now() - t0} ms`);
}

if (!only.length) await writeFile(join(OUT, "anchors.json"), JSON.stringify(anchors, null, 2));
else {
  const { readFile } = await import("node:fs/promises");
  let prev = {};
  try { prev = JSON.parse(await readFile(join(OUT, "anchors.json"), "utf8")); } catch {}
  await writeFile(join(OUT, "anchors.json"), JSON.stringify({ ...prev, ...anchors }, null, 2));
}
await browser.close();
server.close();
