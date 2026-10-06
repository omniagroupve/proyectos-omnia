// Construye el PDF interactivo:
//   1. Genera el HTML de las páginas (src/brochure.mjs) con los datos de config.json
//   2. Lo imprime con Chromium (texto vectorial, enlaces internos y externos)
//   3. Añade con pdf-lib: campos rellenables, marcadores laterales y metadatos
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PDFDocument, PDFName, PDFHexString, PDFDict, PDFArray, PDFNumber, StandardFonts, rgb } from "pdf-lib";
import { serve, CHROMIUM_ARGS } from "./lib/server.mjs";
import { brochureHTML } from "../src/brochure.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(await readFile(join(ROOT, "config.json"), "utf8"));
const anchors = JSON.parse(await readFile(join(ROOT, "web/assets/renders/anchors.json"), "utf8"));
const OUT = join(ROOT, "dist", cfg.pdfName || "OMNIA-Propuesta-Web-3D.pdf");
const PREVIEW = process.env.PREVIEW; // carpeta opcional para PNG de cada página

const html = await brochureHTML(cfg, anchors);
await writeFile(join(ROOT, "src/brochure.html"), html);

const server = await serve(ROOT);
const browser = await chromium.launch({ args: CHROMIUM_ARGS });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.error("[pageerror]", e.message));
page.on("requestfailed", (r) => console.error("[requestfailed]", r.url()));
await page.goto(`${server.url}/src/brochure.html`, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
});

// Revisión: fuentes cargadas y nada desbordado fuera de su página
const report = await page.evaluate(() => {
  const fonts = [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family);
  const overflow = [];
  document.querySelectorAll(".slide").forEach((s) => {
    const sr = s.getBoundingClientRect();
    s.querySelectorAll(".content *").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || el.closest(".render") || el.closest(".floor")) return;
      if (r.bottom > sr.bottom - 50 || r.right > sr.right - 40 || r.left < sr.left + 40) {
        overflow.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> ${Math.round(r.left - sr.left)},${Math.round(r.top - sr.top)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    });
  });
  return { fonts: [...new Set(fonts)], overflow };
});
console.log("Fuentes:", report.fonts.join(", "));
if (report.overflow.length) console.log("Revisar (cerca del borde):\n  " + report.overflow.slice(0, 30).join("\n  "));

// Posición de los campos rellenables (en px dentro de su página)
const fields = await page.evaluate(() =>
  [...document.querySelectorAll("[data-field]")].map((el) => {
    const s = el.closest(".slide");
    const sr = s.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { name: el.dataset.field, page: [...document.querySelectorAll(".slide")].indexOf(s), x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
  })
);

if (PREVIEW) {
  await mkdir(PREVIEW, { recursive: true });
  const n = await page.locator(".slide").count();
  for (let i = 0; i < n; i++) {
    await page.locator(".slide").nth(i).screenshot({ path: join(PREVIEW, `p${String(i + 1).padStart(2, "0")}.png`) });
  }
}

const pdfBytes = await page.pdf({ printBackground: true, preferCSSPageSize: true, tagged: true });
await browser.close();
server.close();

// ── Post-proceso con pdf-lib ──────────────────────────────────
const doc = await PDFDocument.load(pdfBytes);
const pages = doc.getPages();
const PX = 0.75; // 1 px CSS = 0.75 pt

// Campos de texto rellenables (ejercicio de la página 9)
const form = doc.getForm();
const helv = await doc.embedFont(StandardFonts.Helvetica);
const PAPER = rgb(0xee / 255, 0xf0 / 255, 0xf5 / 255);
for (const f of fields) {
  const p = pages[f.page];
  const inset = 8;
  const tf = form.createTextField(`caso.${f.name}`);
  tf.enableMultiline();
  tf.addToPage(p, {
    x: (f.x + inset) * PX,
    y: p.getHeight() - (f.y + f.h - inset) * PX,
    width: (f.w - inset * 2) * PX,
    height: (f.h - inset * 2) * PX,
    textColor: rgb(0.04, 0.05, 0.07),
    backgroundColor: PAPER,
    borderWidth: 0,
    font: helv,
  });
  tf.setFontSize(11);
}
form.updateFieldAppearances(helv);

// Marcadores laterales (outline)
const OUTLINE = [
  ["Portada", 1],
  ["Índice", 2],
  ["Por qué 3D", 3],
  ["01 · Lo que hago", 4],
  ["02 · Dolores que el 3D resuelve", 5],
  ["   Caso 1 · Inmobiliaria", 6],
  ["   Caso 2 · Tienda online", 7],
  ["   Caso 3 · Maquinaria", 8],
  ["   Ejercicio: tu caso", 9],
  ["03 · Higgsfield sin pagar (casi)", 10],
  ["   ¿Es gratis?", 11],
  ["   Cómo empezar", 12],
  ["04 · Cómo trabajamos", 13],
  ["Contacto", 14],
];
const ctx = doc.context;
const outlineRef = ctx.nextRef();
const refs = OUTLINE.map(() => ctx.nextRef());
OUTLINE.forEach(([title, n], i) => {
  const d = PDFDict.withContext(ctx);
  d.set(PDFName.of("Title"), PDFHexString.fromText(title.trim()));
  d.set(PDFName.of("Parent"), outlineRef);
  const dest = PDFArray.withContext(ctx);
  dest.push(pages[n - 1].ref);
  dest.push(PDFName.of("Fit"));
  d.set(PDFName.of("Dest"), dest);
  if (i > 0) d.set(PDFName.of("Prev"), refs[i - 1]);
  if (i < refs.length - 1) d.set(PDFName.of("Next"), refs[i + 1]);
  ctx.assign(refs[i], d);
});
const od = PDFDict.withContext(ctx);
od.set(PDFName.of("Type"), PDFName.of("Outlines"));
od.set(PDFName.of("First"), refs[0]);
od.set(PDFName.of("Last"), refs[refs.length - 1]);
od.set(PDFName.of("Count"), PDFNumber.of(refs.length));
ctx.assign(outlineRef, od);
doc.catalog.set(PDFName.of("Outlines"), outlineRef);
doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
doc.catalog.set(PDFName.of("PageLayout"), PDFName.of("SinglePage"));
const vp = PDFDict.withContext(ctx);
vp.set(PDFName.of("DisplayDocTitle"), ctx.obj(true));
doc.catalog.set(PDFName.of("ViewerPreferences"), vp);

doc.setTitle(`${cfg.brand} · ${cfg.service}`, { showInWindowTitleBar: true });
doc.setAuthor(cfg.brand);
doc.setSubject("Propuesta de diseño web 3D e inmersivo");
doc.setKeywords(["diseño web 3D", "experiencias inmersivas", "Three.js", "Higgsfield"]);
doc.setLanguage("es");
doc.setCreator("brochure-web-3d");
doc.setProducer("Chromium + pdf-lib");

await mkdir(dirname(OUT), { recursive: true });
const out = await doc.save();
await writeFile(OUT, out);
console.log(`✓ PDF: ${OUT} (${(out.length / 1024 / 1024).toFixed(2)} MB, ${pages.length} páginas, ${fields.length} campos)`);
