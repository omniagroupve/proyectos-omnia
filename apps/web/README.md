# apps/web · el frontend de Pix (territorio de Codex)

Aquí va la app de producto (el parlay builder). El backend vive en la raíz del
repo y expone `/api/v1`; el contrato de tipos se comparte por alias, así que
**es imposible que frontend y backend se desincronicen sin que el build falle**.

---

## Traer pix-local aquí

Desde la raíz del repo, en tu máquina:

```bash
# 1. copia el código de pix-local (sin node_modules ni build)
rsync -a --exclude node_modules --exclude dist /ruta/a/pix-local/src/ apps/web/src/
cp /ruta/a/pix-local/public/* apps/web/public/ 2>/dev/null || true

# 2. instala y arranca
cd apps/web && npm install && npm run dev
```

Lo que **se queda** de este andamio (no lo borres):

- `src/lib/api.ts` — cliente tipado de la API
- `src/lib/supabase.ts` — sesión y magic link
- `vite.config.ts` — proxy a `/api` y alias `@pix/contract`
- `tsconfig.json` — las rutas del alias

Lo que **se reemplaza**: `src/App.tsx` (hoy es un banco de pruebas) y todo lo
demás de `src/`.

Si `pix-local` trae su propio `App.tsx`, `main.tsx` o `vite.config.ts`, gana el
suyo — pero conserva del nuestro el bloque `resolve.alias` y el `proxy`.

---

## Arrancar los dos motores

Dos terminales:

```bash
# terminal 1 · backend (raíz del repo)
npm run dev                 # → http://localhost:3000

# terminal 2 · frontend
cd apps/web && npm run dev   # → http://localhost:5173
```

Vite hace proxy de `/api` al backend, así que desde el navegador todo es el
mismo origen: sin CORS, sin cookies de terceros, sin sorpresas al desplegar.

---

## Usar la API

```ts
import { api, PixApiError } from "@/lib/api";

// Funciona sin base de datos ni claves — úsalo para maquetar hoy:
const { parlays } = await api.demo();

// Calculadora pública, tampoco necesita sesión:
const ev = await api.evaluateParlay({
  legs: [
    { eventId, market: "h2h", selection: "Club América", odds: 2.1, fairProb: 0.5 },
    { eventId: otro, market: "h2h", selection: "Boca", odds: 2.1, fairProb: 0.5 },
  ],
  bankroll: 1000,
});

// Construcción con IA (necesita sesión y consume cuota diaria):
try {
  const { parlays, intent } = await api.buildParlay({ prompt: "algo de Liga MX para hoy", legs: 3 });
} catch (e) {
  if (e instanceof PixApiError && e.needsUpgrade) mostrarPlanes(e.message);
  if (e instanceof PixApiError && e.needsAuth) mostrarLogin();
}
```

`PixApiError` trae `code`, `message` (en español, listo para enseñar), `status`
y dos atajos: `needsAuth` (401) y `needsUpgrade` (403 o 429).

Referencia completa de endpoints: [`docs/api-v1.md`](../../docs/api-v1.md).

---

## Reglas que no se rompen en el front

- **+18 y juego responsable visibles en todas las rutas**, también sobre los
  modales y en móvil. No es negociable.
- Nada de "ganancias garantizadas", "sistema infalible" ni "inversión".
- Los datos de `/parlays/demo` son ilustrativos: márcalos como tales, nunca los
  presentes como historial verificado.
- Cuando `/performance` venga vacío, enseña el estado "todavía sin historial".
  No inventes números de relleno.
