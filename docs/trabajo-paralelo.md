# Dos motores a la vez · Claude Code (backend) + Codex (frontend)

Cómo trabajar los dos en el mismo repo sin pisarnos y sin merges dolorosos.

---

## 1 · El reparto de territorio

La regla es simple: **cada motor es dueño de unas carpetas y no toca las del otro.**

| Carpeta | Dueño | Qué es |
|---|---|---|
| `apps/web/**` | **Codex** | La app de producto: parlay builder, dashboard, diseño |
| `src/lib/**`, `src/app/api/**`, `supabase/**`, `scripts/**` | **Claude** | Motor, IA, API, base de datos, ingesta |
| `src/app/**` (páginas Next) | **Claude** | Sitio de marketing y SEO programático |
| `src/lib/api-types.ts` | **Claude escribe, Codex lee** | El contrato |
| `docs/**`, `CLAUDE.md` | Ambos, con cuidado | Documentación |

La única excepción: `apps/web/src/lib/api.ts` y `supabase.ts` los escribí yo,
pero a partir de ahora son de Codex. Si necesitan un endpoint nuevo, lo añado
yo al backend y Codex añade el método al cliente.

## 2 · El contrato es la frontera

`src/lib/api-types.ts` es el único punto de contacto. `apps/web` lo importa por
alias (`@pix/contract`), no por copia.

Consecuencia práctica, y es la que hace que esto funcione: **si yo cambio el
backend de forma incompatible, el build de Codex falla al instante** con un
error de tipos, en vez de romperse en producción tres días después.

Cuando necesites un campo nuevo:

1. Codex lo pide (o lo pides tú) → yo lo añado a `api-types.ts` y al endpoint.
2. Yo hago push.
3. Codex hace `git pull` y ya lo tiene tipado.

Nunca al revés: si Codex inventa un tipo en el front, se desincroniza.

## 3 · Ramas

```
main                        ← nada se rompe aquí
└── claude/desarrollo-…     ← backend (yo)
└── codex/frontend-…        ← frontend (Codex)
```

Ambas salen de `main` y vuelven a `main` por PR. Como tocan carpetas distintas,
los conflictos son casi imposibles: sólo pueden aparecer en `package.json` de la
raíz y en `docs/`.

Ritmo recomendado, dos o tres veces al día:

```bash
git checkout main && git pull
git checkout tu-rama && git merge main     # traes lo del otro motor
```

## 4 · Arrancar los dos en local

Dos terminales, siempre:

```bash
# backend
npm run dev                  # → :3000

# frontend
cd apps/web && npm run dev   # → :5173
```

Abre **siempre `http://localhost:5173`**, no `:3000`. Vite hace proxy de `/api`
al backend, así que el navegador cree que todo vive en el mismo sitio: sin CORS,
sin cookies de terceros, y se comporta igual que en producción.

## 5 · Comprobar que nada se rompió

```bash
npm run build         # el backend compila
npm run test:engine   # 72 tests: matemática + parlays
npm run test:api      # 40 pruebas de integración (con el server arrancado)
cd apps/web && npm run build   # el frontend compila contra el contrato
```

Si los cuatro pasan, el sistema está sano. Ponlo en la rutina antes de cada push.

## 6 · Cómo darle contexto a cada motor

- **Claude** lee `CLAUDE.md` solo al arrancar. Ahí están los invariantes del
  motor y las reglas de producto.
- **Codex** debería leer `apps/web/README.md` y `docs/api-v1.md` al empezar
  cada sesión. Pégaselos si no los coge solo.

Un prompt que funciona bien para Codex al abrir sesión:

> Lee `apps/web/README.md` y `docs/api-v1.md`. El backend ya existe y expone
> `/api/v1`; los tipos vienen de `@pix/contract` y no se redefinen. Trabaja solo
> dentro de `apps/web/`. Arranca con `npm run dev` y verifica contra
> `http://localhost:5173`.

## 7 · Qué NO hacer

- **No dupliques tipos** en el front. Si te falta un campo, se pide al backend.
- **No llames a Supabase directamente desde el front** para leer picks o
  parlays: el gating por tier vive en RLS y en la API. El front usa Supabase
  sólo para la sesión (login, token).
- **No metas `SUPABASE_SERVICE_ROLE_KEY` en `apps/web`.** Ese bundle va al
  navegador. Sólo `VITE_SUPABASE_ANON_KEY`.
- **No dejes que los dos motores toquen el mismo archivo el mismo día.** Si hace
  falta, avisa y lo hace uno solo.

## 8 · Despliegue (dos proyectos, ambos gratis para empezar)

| Qué | Dónde | Dominio |
|---|---|---|
| Backend + sitio SEO (Next.js, raíz) | Vercel · proyecto 1 | `pix.com` |
| App de producto (Vite, `apps/web`) | Vercel · proyecto 2, root `apps/web` | `app.pix.com` |

Ambos apuntan al mismo Supabase. En el proyecto 2 pones `VITE_API_URL=https://pix.com`
y en el 1 añades `https://app.pix.com` a `CORS_ORIGINS`.

Por qué separados y no todo en uno: el sitio SEO necesita renderizado en
servidor (miles de páginas de partidos indexables) y la app de producto no
necesita indexarse. Mezclarlos obliga a elegir, y perder el SEO sería perder el
canal de adquisición más barato que tienes.
