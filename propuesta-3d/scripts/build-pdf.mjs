// Decks HTML → PDF (+ una imagen por diapositiva).
//   npm run pdf            → todos los decks
//   npm run pdf -- guia    → solo los decks cuyo nombre se indique
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import { readFile, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, CHROMIUM_ARGS, ROOT } from './lib/server.mjs';

const DECKS = [
  { name: 'guia', src: 'deck/guia.html', pdf: 'dist/Guia-Negocio-IA-Escalable.pdf', slides: 'dist/slides-guia' },
  { name: 'propuesta', src: 'deck/deck.html', pdf: 'dist/Propuesta-Web-3D-Inmersivo.pdf', slides: 'dist/slides' },
];

const args = process.argv.slice(2);
const noPreviews = args.includes('--no-previews');
const only = args.filter((a) => !a.startsWith('--'));
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));

const { server, url } = await startServer();
const browser = await chromium.launch({ args: CHROMIUM_ARGS });

for (const deck of DECKS.filter((d) => !only.length || only.includes(d.name))) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => { console.error(`[${deck.name}]`, e.message); process.exitCode = 1; });
  page.on('console', (m) => { if (m.type() === 'error') console.error(`[${deck.name}]`, m.text()); });

  await page.goto(`${url}/${deck.src}`);
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 });

  // Códigos QR: cada [data-qr="clave"] apunta a config[clave]
  const qrKeys = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-qr]')].map((el) => el.dataset.qr))]);
  for (const key of qrKeys) {
    if (!config[key]) continue;
    const svg = await QRCode.toString(config[key], { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#080912', light: '#f2f0fa' } });
    await page.evaluate(([k, s]) => document.querySelectorAll(`[data-qr="${k}"]`).forEach((el) => { el.innerHTML = s; }), [key, svg]);
  }

  // Comprobación: ningún texto se sale de su diapositiva
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.slide')].flatMap((s) => {
    const sr = s.getBoundingClientRect();
    return [...s.querySelectorAll('p, span, li, a, td, th, h2')].filter((el) => {
      if (!el.offsetParent) return false;
      const r = el.getBoundingClientRect();
      return r.width && (r.right > sr.right + 1 || r.bottom > sr.bottom + 1 || r.left < sr.left - 1);
    }).map((el) => `${s.id}: «${el.textContent.trim().slice(0, 50)}»`);
  }));
  if (overflow.length) console.warn(`[${deck.name}] texto fuera de la diapositiva:\n  ` + overflow.join('\n  '));

  if (!noPreviews) {
    const dir = join(ROOT, deck.slides);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const ids = await page.evaluate(() => [...document.querySelectorAll('.slide')].map((s) => s.id));
    for (const [i, id] of ids.entries()) {
      await page.locator(`#${id}`).screenshot({ path: join(dir, `${String(i + 1).padStart(2, '0')}-${id}.jpg`), type: 'jpeg', quality: 86 });
    }
  }

  const out = join(ROOT, deck.pdf);
  await mkdir(join(ROOT, 'dist'), { recursive: true });
  await page.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, outline: true, tagged: true, preferCSSPageSize: true });
  await page.close();
  console.log(`PDF → ${deck.pdf} (${((await stat(out)).size / 1e6).toFixed(1)} MB)`);
}

await browser.close();
server.close();
