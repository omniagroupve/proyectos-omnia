// Empaqueta la versión web interactiva en dist/web/
//   index.html     → documento completo, listo para Vercel/Netlify/cualquier hosting estático
//   fragment.html  → misma página sin <html>/<head> (formato de publicación como Artifact)
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/server.mjs';

const OUT = join(ROOT, 'dist/web');
const config = JSON.parse(await readFile(join(ROOT, 'config.json'), 'utf8'));
const site = Object.fromEntries(Object.entries(config).filter(([k]) => !k.startsWith('_') && k !== 'webUrl'));

let src = await readFile(join(ROOT, 'web/experiencia.html'), 'utf8');
src = src.replace(/\/\*SITE\*\/[\s\S]*?\/\*\/SITE\*\//, `/*SITE*/${JSON.stringify(site)}/*/SITE*/`);
// Valores por defecto visibles antes de que corra el script (y para lectores sin JS)
for (const k of ['studio', 'service', 'email', 'region', 'edition']) {
  src = src.replace(new RegExp(`(data-cfg="${k}"[^>]*>)[^<]*<`, 'g'), `$1${config[k] ?? ''}<`);
}
src = src.replace(/href="mailto:[^"]*"/g, `href="mailto:${config.email}"`);

await rm(OUT, { recursive: true, force: true });
await mkdir(join(OUT, 'renders'), { recursive: true });
await writeFile(join(OUT, 'fragment.html'), src);

// Documento completo: <title>, <link> y <style> iniciales van al <head>
const headEnd = src.indexOf('</style>') + '</style>'.length;
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Diseño web 3D e inmersivo: experiencias que tus clientes pueden recorrer.">
${src.slice(0, headEnd)}
</head>
<body>
${src.slice(headEnd).trim()}
</body>
</html>
`;
await writeFile(join(OUT, 'index.html'), html);
await copyFile(join(ROOT, 'web/scenes.js'), join(OUT, 'scenes.js'));

const used = [...new Set([...src.matchAll(/renders\/([\w-]+\.png)/g)].map((m) => m[1]))];
for (const f of used) await copyFile(join(ROOT, 'assets/renders', f), join(OUT, 'renders', f));
console.log(`web → dist/web (index.html, fragment.html, scenes.js, ${used.length} imágenes)`);
