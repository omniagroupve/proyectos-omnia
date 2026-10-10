// Empaqueta las páginas web interactivas en dist/<página>/
//   index.html     → documento completo, listo para Vercel/Netlify/cualquier hosting estático
//   fragment.html  → misma página sin <html>/<head> (formato de publicación como Artifact)
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/server.mjs';

const PAGES = [
  { src: 'web/experiencia.html', out: 'dist/web', extra: ['web/scenes.js'], description: 'Diseño web 3D e inmersivo: experiencias que tus clientes pueden recorrer.' },
  { src: 'web/cuaderno.html', out: 'dist/cuaderno', extra: [], description: 'Cuaderno de trabajo: tu modelo de negocio con IA en una página.' },
];

const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const PUBLIC_KEYS = ['studio', 'service', 'guideService', 'email', 'whatsapp', 'calendarUrl', 'region', 'edition'];
const site = Object.fromEntries(PUBLIC_KEYS.map((k) => [k, config[k] ?? '']));

for (const page of PAGES) {
  const OUT = join(ROOT, page.out);
  let src = await readFile(join(ROOT, page.src), 'utf8');
  src = src.replace(/\/\*SITE\*\/[\s\S]*?\/\*\/SITE\*\//, `/*SITE*/${JSON.stringify(site)}/*/SITE*/`);
  // Valores visibles antes de que corra el script (y para lectores sin JS)
  for (const k of PUBLIC_KEYS) {
    if (config[k]) src = src.replace(new RegExp(`(data-cfg="${k}"[^>]*>)[^<]*<`, 'g'), `$1${config[k]}<`);
  }
  src = src.replace(/href="mailto:[^"?]*/g, `href="mailto:${config.email}`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'renders'), { recursive: true });
  await writeFile(join(OUT, 'fragment.html'), src);

  // Documento completo: <title>, <link> y <style> iniciales van al <head>
  const headEnd = src.indexOf('</style>') + '</style>'.length;
  await writeFile(join(OUT, 'index.html'), `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${page.description}">
${src.slice(0, headEnd)}
</head>
<body>
${src.slice(headEnd).trim()}
</body>
</html>
`);
  for (const f of page.extra) await copyFile(join(ROOT, f), join(OUT, f.split('/').pop()));
  const used = [...new Set([...src.matchAll(/renders\/([\w-]+\.png)/g)].map((m) => m[1]))];
  for (const f of used) await copyFile(join(ROOT, 'assets/renders', f), join(OUT, 'renders', f));
  console.log(`web → ${page.out} (index.html, fragment.html, ${used.length} imágenes)`);
}
