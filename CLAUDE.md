# Pix · contexto del proyecto

Plataforma donde el usuario **arma su parlay con ayuda de IA**: picks de un
modelo cuantitativo, comparador de cuotas, suscripciones en 3 tiers y SEO
programático. Next.js 15 · Supabase · Lemon Squeezy · Telegram · Anthropic.

Marca vigente: **Pix** (antes Omnia Picks). No rotular nada como Omnia.

Reparto de trabajo: **Codex hace el frontend** (`pix-local`, React + Vite),
**este repo es el backend** y expone `/api/v1`. El contrato vive en
`src/lib/api-types.ts` y `docs/api-v1.md`; el front lo importa tal cual.

---

## Qué es esto (y qué no)

Es un **servicio de información y análisis de pago**. No es una casa de
apuestas: no aceptamos apuestas, no custodiamos dinero de terceros y no
prometemos rentabilidad.

La referencia de producto es la experiencia de **Novig** (armar tu boleto),
no su licencia: Novig es un operador regulado con custodia de dinero. Pix
construye el parlay y el usuario lo juega en la casa que prefiera.

**Nunca uses en el producto las palabras** *inversión*, *rentabilidad*,
*ganancias garantizadas* ni *gestión de capital* referidas a dinero del
cliente. Cruzar esa línea nos convierte en servicio de inversión no autorizado
(competencia de la CNMV en España), que es un problema legal mucho peor que el
del juego.

---

## Comandos

```bash
npm run dev              # desarrollo
npm run build            # producción — debe pasar antes de cualquier commit
npm run test:engine      # 72 tests: 37 del motor matemático + 35 de parlays
npm run test:parlay      # sólo los del motor de parlays
npm run validate:model   # valida Dixon-Coles por recuperación de parámetros
npm run data             # descarga el histórico (Europa + ARG/BRA/MEX/USA + tenis)
npm run data:seed        # carga ese histórico en Supabase (hist_matches/hist_odds)
npm run backtest         # backtest sobre datos reales
npm run diagnose         # desglose por selección, cuota y configuración
```

---

## Arquitectura

```
src/lib/
  devig.ts        Matemática pura: devig (3 métodos), edge, Kelly, CLV
  model.ts        Consenso ponderado → detección de valor → mezcla con modelo propio
  parlay.ts       Motor de parlays: prob. conjunta, EV, Kelly, guardas, liquidación
  ai.ts           Capa Anthropic: intención, narración y preguntas (nunca calcula)
  dixon-coles.ts  Modelo propio: Poisson bivariante con ratings de equipo
  odds.ts         Cliente The Odds API + control de créditos
  apifootball.ts  Cliente API-Football: fixtures y resultados oficiales (LatAm)
  market-summary.ts  Snapshot de cuotas → mejor cuota y cuota justa por selección
  api-types.ts    CONTRATO de /api/v1 — el frontend importa de aquí
  api/http.ts     Respuestas uniformes, auth por Bearer/cookie, país del request
  config.ts       Precios, 21 ligas, pesos de casas, umbrales
  telegram.ts     Cliente del bot y formateo de picks
  auth.ts         Sesión + tier efectivo

src/app/api/v1/    ← lo que consume Codex
  sports · leagues · jurisdictions        Catálogo filtrado por país
  events · events/[id]/odds              Partidos y comparador de cuotas
  picks                                   Picks del motor (RLS por tier)
  parlays · parlays/build                 Listado y construcción con IA
  parlays/evaluate · parlays/demo         Calculadora pública y datos de ejemplo
  parlays/[id]/explain                    Preguntas a la IA (Pro)
  me · me/parlays · performance           Perfil, parlays guardados, track record

src/app/
  api/cron/ingest       Cada 2h: cuotas → snapshot → análisis → picks → broadcast
  api/cron/fixtures     Cada 3h: resultados oficiales de API-Football
  api/cron/settle       Cada 3h: liquidación de picks y parlays → CLV
  api/telegram/*        Webhook, broadcast, código de vinculación
  api/webhooks/lemonsqueezy   Alta/baja de tier
  pronosticos/[liga]/[slug]/  SEO programático

supabase/
  schema.sql            Base original (profiles, events, odds_snapshots, picks…)
  migrations/002_pix.sql  Catálogo, jurisdicciones, histórico propio, parlays, IA
```

---

## Invariantes del motor · no romper sin re-validar

1. **De-vigar cada casa por separado ANTES de promediar.** Al revés introduce
   sesgo sistemático porque cada operador carga un margen distinto.
2. **Kelly siempre fraccionado** (0.25) con tope de 5 unidades por pick.
3. **Filtro anti-outlier a 1.25×.** Una cuota muy por encima del consenso casi
   nunca es valor: es error de línea o límite de $5. Quitarlo destroza el ROI.
4. **Peso máximo del modelo propio: 35%**, y baja cuanto más discrepa del
   mercado. El log loss medido del mercado es 0.946 frente a 1.090 de la
   frecuencia base: es un predictor muy fuerte.
5. **Renormalizar siempre después de mezclar probabilidades.** Si no, el edge
   calculado después sale inflado.
6. **`published_at`, `closing_odds` y `clv_pct` son sagrados.** Son lo que hace
   auditable el track record, que es el activo del negocio. Vale igual para
   `parlays`: cuota combinada tomada, cierre combinado y CLV del conjunto.
7. **Un parlay no repite evento.** La probabilidad conjunta es el producto de
   las de cada pierna, y eso sólo vale si son independientes. Correlaciones
   intra-partido (same-game parlay) son fase 2 y necesitan modelo conjunto.
8. **La IA no calcula.** `ai.ts` recibe candidatos ya evaluados por el motor y
   devuelve selección y texto en JSON validado. Nunca toca probabilidades ni
   stakes. Cada llamada queda registrada en `ai_requests`.

Si tocas la matemática, `npm run test:engine` tiene que seguir en verde.

---

## Reglas de producto · no negociables

- **Publicar los picks perdedores.** Sin selección manual de resultados.
- **El CLV en portada, no el ROI.** Con muestra corta el ROI es ruido: cambió
  de signo dos veces en el backtest (+29% → −10% → +9.7%) al ampliar la muestra.
- **Regla del 5%.** Si el plan cuesta más del 5% del bankroll declarado del
  usuario, el producto le dice que NO lo compre (`UpgradePrompt.tsx`).
- **Sin mecánicas de compulsión.** Nada de cuentas atrás falsas, plazas
  inventadas, rachas que se pierden, emails de recuperación ni remarketing a
  quien canceló. Es ilegal en España (RD 958/2020) y dispara los chargebacks,
  que es lo que te cierra el procesador de pagos.
- **Cancelación en un clic.** La fricción genera disputas.
- **El cap de 50 plazas de Elite es real**, no marketing: los picks mueven la
  línea y el edge desaparece si demasiada gente apuesta lo mismo.
- **+18 y juego responsable visibles en todas las páginas.**

---

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** con prefijo `NEXT_PUBLIC_`.
- El gating por tier vive en **RLS**, no en el front.
- Los webhooks verifican firma: HMAC en Lemon Squeezy, `secret_token` en Telegram.
- Las rutas de cron exigen `Authorization: Bearer $CRON_SECRET`.

---

## Estado actual

- Build limpio, 38 rutas, 37/37 tests en verde.
- Backtest sobre 207 partidos reales: **CLV +3.81%, 83% bate el cierre**,
  control (apostar todo) −4.94%.
- Modelo validado: recupera ataque r=0.91, defensa r=0.94, ventaja de campo
  0.258 (real 0.26), ρ −0.084 (real −0.08).
- **Pendiente:** correr el backtest con 15.000 partidos (`npm run data`) para
  que el ROI signifique algo.

### Hipótesis abiertas · resolver con la muestra completa

1. ¿Excluir los picks a visitante? Salen con CLV negativo en las 3 muestras.
2. ¿Bajar el tope de cuota de 8.00 a 4.50? El tramo alto no aporta CLV.
3. ¿Endurecer el anti-outlier de 1.25× a 1.15×?

No toques el motor por estas hipótesis hasta tener la muestra grande: con 40
picks cualquier cambio es sobreajuste.

---

## Fuentes de datos

- **The Odds API** — cuotas en vivo. De pago. Una llamada a `/odds` cuesta
  `nº mercados × nº regiones` créditos. Vigila `creditsRemaining`.
- **football-data.co.uk** — histórico con cuotas de cierre de Pinnacle. Gratis,
  sin API key. Es lo que usa el backtest.

---

## Deuda técnica conocida

- Las fuentes cargan por `<link>` a Google Fonts. **Migrar a
  `next/font/google`** para autoalojarlas: quita la petición externa y el salto
  de layout. Está comentado en `src/app/layout.tsx`.
- Vercel Hobby sólo permite 1 cron diario. Para producción hace falta Pro.
