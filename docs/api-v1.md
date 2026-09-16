# Pix · API v1 (contrato para el frontend)

Base: `https://<backend>/api/v1` · en desarrollo `http://localhost:3000/api/v1`.
Los tipos TypeScript de todo lo que aparece aquí están en
`src/lib/api-types.ts`. **Impórtalos, no los redefinas.**

---

## Reglas generales

- **Formato de error**, siempre igual:
  ```json
  { "error": { "code": "unauthorized", "message": "Inicia sesión para continuar." } }
  ```
  Códigos: `unauthorized` (401), `forbidden` (403), `not_found` (404),
  `bad_request` (400), `rate_limited` (429), `not_configured` (503),
  `internal` (500).

- **Autenticación**: JWT de Supabase en `Authorization: Bearer <access_token>`.
  El backend también acepta la cookie de sesión de Next, pero desde un
  frontend en otro origen usa siempre el Bearer.

- **CORS**: el middleware permite los orígenes de `CORS_ORIGINS`
  (por defecto `http://localhost:5173`). Añade el dominio de producción del
  front antes de desplegar.

- **País**: casi todos los endpoints de catálogo filtran por jurisdicción.
  Orden de resolución: `?country=MX` (selector manual) → cabecera
  `x-vercel-ip-country` → sin filtro. El idioma nunca cuenta como ubicación.

- **Sin base de datos configurada** la mayoría responde `503 not_configured`.
  Las excepciones, pensadas para que el front avance hoy, son
  `/parlays/demo` (siempre) y `/parlays/build` + `/parlays/evaluate`
  (caen a datos de ejemplo / cálculo puro).

---

## Catálogo

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/sports` | `{ items: Sport[] }` |
| GET | `/leagues?sport=soccer&country=MX` | `{ items: League[], country }` |
| GET | `/jurisdictions` | `{ items: Jurisdiction[], detected }` |

`League.featured` marca la liga local del país del visitante.

## Partidos y cuotas

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/events?league=liga-mx&from=…&to=…&limit=50` | `{ items: EventSummary[] }` |
| GET | `/events/{id}/odds?country=MX` | `EventOdds` |

`EventSummary.markets` trae, por mercado (`h2h`/`spreads`/`totals`), la mejor
cuota disponible, la cuota justa del consenso y el valor en %. Eso es lo que
pinta la tarjeta de partido.

`/events/{id}/odds` es el comparador: una fila por casa **disponible en el país
del visitante**, con `affiliateUrl` y `licensed`. Las casas sin disponibilidad
registrada para ese país no se devuelven.

## Picks

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/picks?status=open\|settled\|all&league=…` | `{ items: Pick[] }` |

Qué picks ve cada usuario lo decide **RLS en la base de datos**, no el front:
liquidados → públicos; pendientes → según tier o tras la ventana de retraso
del plan free. Mandar el Bearer cambia lo que devuelve.

## Parlays

| Método | Ruta | Cuerpo | Notas |
|---|---|---|---|
| GET | `/parlays?status=open\|settled` | — | Parlays publicados, gateados por RLS |
| POST | `/parlays/build` | `BuildParlayRequest` | Construye con IA. Requiere sesión |
| POST | `/parlays/evaluate` | `EvaluateParlayRequest` | Calculadora pública |
| POST | `/parlays/{id}/explain` | `ExplainParlayRequest` | Pregunta a la IA. Plan Pro |
| GET | `/parlays/demo` | — | Datos de ejemplo, siempre disponibles |

**`/parlays/build`** acepta filtros explícitos (`sports`, `leagues`, `legs`,
`risk`) y/o texto libre en `prompt` ("algo de Liga MX y NBA para esta noche").
Devuelve `BuildParlayResponse`: los parlays, el `intent` interpretado — úsalo
para mostrar *"entendí: 3 piernas, riesgo medio, Liga MX"* — y `aiRequestId`.

Cuota diaria por plan: free 1, pro 20, elite sin límite. Al superarla llega un
`429 rate_limited` con mensaje listo para enseñar.

**`/parlays/evaluate`** es la calculadora: el usuario manda sus piernas y
recibe probabilidad conjunta, cuota combinada, cuota justa, valor esperado,
stake sugerido y — lo importante — `warnings` y `errors` en español para
pintar tal cual. Si mandas `fairProb` en cada pierna funciona sin base de
datos; si no, el backend la resuelve desde el último snapshot de cuotas.

Un parlay con valor negativo **responde 200 con `valid: true` y un aviso**:
la calculadora tiene que poder enseñar que algo no conviene. Sólo los
problemas estructurales (una sola pierna, cuota imposible) llenan `errors` y
ponen `valid: false`.

## Usuario

| Método | Ruta | Notas |
|---|---|---|
| GET | `/me` | Perfil, tier, país, bankroll, cuota de IA usada hoy |
| PATCH | `/me` | `countryCode`, `locale`, `bankroll`, `displayName`. El tier nunca |
| GET | `/me/parlays` | Parlays guardados por el usuario |
| POST | `/me/parlays` | `SaveUserParlayRequest` → guarda uno nuevo |

## Rendimiento

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/performance` | `Performance` — picks y parlays liquidados |

Ambos bloques pueden ser `null` mientras no haya histórico. **No inventes
números en el front cuando lleguen vacíos**: enseña el estado "todavía sin
historial". Los resultados de `/parlays/demo` son ilustrativos y deben ir
marcados como tales.

---

## Aviso obligatorio

`+18` y juego responsable tienen que estar visibles en **todas** las rutas del
frontend, incluidas las nuevas y por encima de los modales. No es negociable y
no depende de la API.
