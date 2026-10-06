// deck/deck.html → dist/Propuesta-Web-3D-Inmersivo.pdf (+ una imagen por diapositiva en dist/slides/)
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { readFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, CHROMIUM_ARGS, ROOT } from './lib/server.mjs';

const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const PDF = join(ROOT, 'dist/Propuesta-Web-3D-Inmersivo.pdf');
const SLIDES = join(ROOT, 'dist/slides');
const noPreviews = process.argv.includes('--no-previews');

const { server, url } = await startServer();
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => { console.error('[deck]', e.message); process.exitCode = 1; });
page.on('console', (m) => { if (m.type() === 'error') console.error('[deck]', m.text()); });

await page.goto(`${url}/deck/deck.html`);
await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 });

if (config.webUrl) {
  const svg = await QRCode.toString(config.webUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#080912', light: '#f2f0fa' } });
  await page.evaluate((s) => { document.getElementById('qr').innerHTML = s; }, svg);
}

// Comprobación: ningún texto se sale de su diapositiva
const overflow = await page.evaluate(() => [...document.querySelectorAll('.slide')].flatMap((s) => {
  const sr = s.getBoundingClientRect();
  return [...s.querySelectorAll('p, span, li, a, td, th')].filter((el) => {
    if (el.closest('.sr') || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width && (r.right > sr.right + 1 || r.bottom > sr.bottom + 1 || r.left < sr.left - 1);
  }).map((el) => `${s.id}: «${el.textContent.trim().slice(0, 50)}»`);
}));
if (overflow.length) console.warn('Texto fuera de la diapositiva:\n  ' + overflow.join('\n  '));

if (!noPreviews) {
  await rm(SLIDES, { recursive: true, force: true });
  await mkdir(SLIDES, { recursive: true });
  const ids = await page.evaluate(() => [...document.querySelectorAll('.slide')].map((s) => s.id));
  for (const [i, id] of ids.entries()) {
    await page.locator(`#${id}`).screenshot({ path: join(SLIDES, `${String(i + 1).padStart(2, '0')}-${id}.jpg`), type: 'jpeg', quality: 86 });
  }
}

await mkdir(join(ROOT, 'dist'), { recursive: true });
await page.pdf({ path: PDF, width: '1920px', height: '1080px', printBackground: true, outline: true, tagged: true, preferCSSPageSize: true });
await browser.close();
server.close();
console.log(`PDF → ${PDF} (${((await stat(PDF)).size / 1e6).toFixed(1)} MB)`);
