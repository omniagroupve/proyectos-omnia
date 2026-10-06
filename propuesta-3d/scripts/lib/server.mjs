// Servidor estático mínimo: los módulos ES y fetch() no funcionan desde file://
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
};

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      let file = join(ROOT, path);
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

// Redirige las peticiones de Three.js al CDN hacia node_modules (este contenedor no tiene salida a CDN;
// así probamos el mismo HTML que se publica).
export async function routeThreeToLocal(page) {
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/, async (route) => {
    const rel = route.request().url().replace(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\//, '');
    try {
      const body = await readFile(join(ROOT, 'node_modules/three', rel));
      await route.fulfill({ status: 200, contentType: 'text/javascript', body, headers: { 'access-control-allow-origin': '*' } });
    } catch { await route.abort(); }
  });
}

export const CHROMIUM_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
