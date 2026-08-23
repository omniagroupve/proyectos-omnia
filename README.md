# Omnia Picks · MVP end-to-end

Plataforma de picks de apuestas con modelo cuantitativo, suscripciones en 3 tiers
y motor de SEO programático. Next.js 15 + Supabase + Lemon Squeezy.

**Estado:** compila en limpio, 38 rutas, 37 tests del motor en verde, modelo
propio validado y backtest con datos reales (CLV +3.81%, 83% bate el cierre).

👉 **Empieza por [`docs/empezar-hoy.md`](docs/empezar-hoy.md).**

---

## Puesta en marcha (30–40 min)

### 1. Dependencias

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan free sirve para arrancar).
2. SQL Editor → pega el contenido de `supabase/schema.sql` → Run.
3. Project Settings → API → copia a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← **nunca** con prefijo `NEXT_PUBLIC_`
4. Authentication → Providers → activa Email (magic link).

### 3. The Odds API

Regístrate en [the-odds-api.com](https://the-odds-api.com) y copia la key.

> **Elige bien el plan.** Una llamada a `/odds` cuesta `nº mercados × nº regiones`
> créditos. Con `h2h,spreads,totals` en `eu,us` son 6 créditos por liga y llamada.
> 20 ligas cada 2h = ~43.000 créditos/mes. **El plan de $30 (20k) se queda corto
> en la primera semana; necesitas el de $59 (100k).**
>
> Para arrancar más barato: pon `ODDS_REGIONS=eu` y `ODDS_MARKETS=h2h` (1 crédito
> por llamada) y usa `?priority=1` en el cron. Entras con el plan de $30.

### 4. Lemon Squeezy

1. Crea la tienda y dos productos de suscripción: Pro ($197/mes) y Elite ($497/mes).
2. Copia los **variant IDs** a `.env.local`.
3. Settings → Webhooks → apunta a `https://tudominio.com/api/webhooks/lemonsqueezy`
   con los eventos `subscription_*`. Copia el signing secret.

### 5. Bot de Telegram

1. Habla con [@BotFather](https://t.me/BotFather) → `/newbot` → copia el token.
2. Crea dos canales:
   - **Público** (`@tucanal`) — picks diferidos 3h. Es el motor de captación.
   - **Privado Pro** — picks en tiempo real. Añade el bot como administrador.
3. Rellena en `.env.local`:
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `TELEGRAM_CHANNEL_PUBLIC`, `TELEGRAM_CHANNEL_PRO`
4. Registra el webhook (una sola vez, tras el deploy):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://tudominio.com/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

**Comandos del bot:** `/vincular CÓDIGO` · `/stats` · `/plan` · `/baja`

El usuario genera su código en *Picks → Conectar Telegram*. Caduca en 15 min y
es de un solo uso. Al vincular, si tiene plan de pago recibe además un enlace de
invitación al canal privado válido para una sola persona.

**Flujo de envío:** el cron de ingesta llama a `/api/telegram/broadcast` en
cuanto publica picks, así la alerta sale en segundos. Un segundo cron cada 30
min publica en el canal público los picks cuya ventana de 3h ya venció.

### 6. Cron secret

```bash
openssl rand -hex 32   # → CRON_SECRET
```

### 7. Arrancar

```bash
npm run dev
npm run test:engine       # 37 tests del motor matemático
npm run validate:model    # valida el modelo Dixon-Coles
npm run data              # descarga ~15.000 partidos (gratis)
npm run backtest          # backtest sobre datos reales
npm run diagnose          # diagnóstico por segmento
```

### 8. Primera ingesta

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
```

### 9. Deploy

```bash
vercel --prod
```

Sube todas las variables a Vercel. Los crons de `vercel.json` se activan solos
(ingesta cada 2h, liquidación cada 3h). En plan Hobby de Vercel solo se permite
1 cron diario: para el MVP eso basta, pero al facturar pasa a Pro ($20/mes).

---

## Arquitectura

```
src/lib/
  devig.ts      ← Matemática pura. Devig (3 métodos), Kelly, CLV, edge.
  model.ts      ← Estrategia: consenso ponderado → detección de valor
  odds.ts       ← Cliente The Odds API + control de créditos
  config.ts     ← Precios, ligas, pesos de casas, umbrales
  guides.ts     ← Contenido pilar SEO
  dixon-coles.ts ← Modelo propio: Poisson bivariante con ratings de equipo
  telegram.ts   ← Cliente del bot y formateo de picks
  payments.ts   ← Lemon Squeezy
  auth.ts       ← Sesión + tier efectivo

src/app/
  page.tsx                          Landing
  precios/                          Pricing sándwich + FAQ con JSON-LD
  rendimiento/                      Track record público  ← el activo real
  picks/                            Dashboard gateado por tier
  pronosticos/[liga]/[slug]/        ★ SEO programático (miles de URLs)
  guias/[slug]/                     Contenido pilar
  api/cron/ingest                   Ingesta + generación de picks
  api/cron/settle                   Liquidación + cálculo de CLV
  api/webhooks/lemonsqueezy         Alta/baja de tier
  api/telegram/webhook              Comandos del bot
  api/telegram/broadcast            Envío de picks (directo + canal)
  api/telegram/link                 Código de vinculación
```

### Cómo funciona el modelo

No predice partidos. Detecta cuándo **una casa se desvía del precio del mercado**:

1. Lee las cuotas de 40+ casas.
2. Quita el vig de **cada casa por separado** (el orden importa: promediar cuotas
   con vig y de-vigar después introduce sesgo).
3. Promedia ponderando: Pinnacle y otras de margen bajo pesan 5×, las
   recreativas 1×.
4. Compara esa probabilidad real con la mejor cuota disponible.
5. Si hay ≥2% de ventaja, publica el pick con stake de Kelly fraccionado (0.25).

Es un modelo honesto y auditable. Para v2, `blendWithModel()` en `model.ts` es el
punto de entrada para mezclar un modelo propio (Dixon-Coles, Elo, xG) — con peso
bajo (0.15–0.30), porque el mercado es muy bueno y un modelo que lo ignora pierde.

### Por qué el CLV está en portada

El ROI de 200 picks es ruido: puedes tener +25% con un modelo malo. El CLV
converge mucho antes y es la prueba objetiva de si vas por delante del mercado.
Ponerlo en portada filtra curiosos y atrae exactamente al cliente que paga $197.

---

## El pricing sándwich

| | Free | **Pro** | Elite |
|---|---|---|---|
| Precio | $0 | **$197/mes** | $497/mes |
| Rol | captura tráfico SEO | **el que quieres vender** | el ancla |
| Monetización | ads + afiliados | suscripción | suscripción |

Elite a 2.5× el precio de Pro hace que $197 se lea como "la opción sensata" en
vez de "197 dólares al mes". Sin Elite, Pro es el plan caro. Ese es todo el truco,
y es la razón de que Elite exista aunque venda poco.

El cap de 50 plazas en Elite **no es escasez artificial**: los picks de mayor edge
viven en mercados con límites bajos, y si demasiada gente apuesta lo mismo la casa
corrige la cuota y el edge desaparece para todos.

Los precios están en `src/lib/config.ts` — cambiarlos es un solo archivo.

---

## Estrategia SEO

### Programático (el volumen)

`/pronosticos/{liga}/{equipo-a}-vs-{equipo-b}-{fecha}` genera una URL por partido
ingestado. Con 20 ligas activas son **miles de páginas long-tail** sin escribir
contenido a mano.

**La clave está en el ciclo de vida**, y es donde casi todos fallan:

- **Antes del partido** → previa, cuotas, análisis de valor. Intención transaccional.
- **Después** → el `title` cambia de "pronóstico" a "resultado", se añade el
  marcador y si el pick acertó. **La página se vuelve evergreen** en lugar de morir.

La mayoría de sitios deja morir la página tras el partido. Mantenerla viva acumula
enlaces internos y autoridad de dominio de forma compuesta.

### Pilar (la autoridad)

`/guias/` cubre CLV, vig, Kelly y value betting. Captura intención informacional,
no caduca nunca y construye E-E-A-T. Además educa al visitante en el vocabulario
que hace que tu producto tenga sentido: alguien que entiende qué es el CLV es
alguien que puede pagar $197.

### Métricas a vigilar en Search Console

| Métrica | Por qué |
|---|---|
| **Ratio de páginas indexadas** | El asesino del pSEO. Genera 10.000 URLs, Google indexa 300 |
| Impresiones por tipo de página | Separa `/pronosticos/` de `/guias/` |
| CTR por posición | Si estás en top-10 con CTR bajo, el problema es el title |
| Core Web Vitals | Ya optimizado: sin JS de terceros, sin fuentes externas |

### Segundo revenue stream

Los afiliados de casas de apuestas suelen facturar **más que las suscripciones** y
usan exactamente el mismo tráfico. La tabla comparativa de cuotas de cada página
de partido es el sitio natural para esos enlaces. Estructura preparada
(`NEXT_PUBLIC_AFFILIATE_ENABLED`), falta firmar los acuerdos.

---

## Costes reales de arranque

| Servicio | Mes 1 | Con tracción |
|---|---|---|
| Vercel | $0 | $20 |
| Supabase | $0 | $25 |
| The Odds API | $30–59 | $59 |
| Dominio | ~$1 | ~$1 |
| Lemon Squeezy | 0 (comisión ~5% sobre ventas) | ídem |
| **Total** | **~$35–60/mes** | **~$105/mes** |

---

## Lo que puede matar el proyecto

**1. El procesador de pagos.** Stripe clasifica los servicios de pronósticos como
negocio restringido. Es habitual que aprueben la cuenta, dejen operar unos meses y
la cierren reteniendo el saldo 90–180 días — justo cuando ya facturas. Por eso el
código usa Lemon Squeezy (merchant of record: son ellos el vendedor legal y asumen
el riesgo). Cuesta ~2% más que Stripe. Es el seguro más barato del proyecto.
**Ten una cuenta de Paddle abierta desde el día 1 como plan B.**

**2. Los créditos del Odds API.** El cron para solo si quedan <2.000 créditos.
Vigila `creditsRemaining` en la respuesta de `/api/cron/ingest` la primera semana.

**3. Indexación.** Da igual generar 10.000 URLs si Google indexa 300. El sitemap
solo incluye partidos con datos reales por ese motivo — una página vacía indexada
daña la calidad de todo el dominio.

**4. Track record corto.** Necesitas 300–500 picks liquidados antes de que las
métricas signifiquen algo. **Corre el cron 6–8 semanas antes de cobrarle a nadie.**
Vender con 50 picks de muestra es cómo se destruye la reputación de estos
proyectos.

---

## Roadmap sugerido

**Semanas 1–2 — construir el activo**
Deploy, crons corriendo, sin vender nada. Backtest con `fetchHistoricalOdds()`
(cuesta 10× créditos, úsalo solo aquí).

**Semanas 3–8 — track record + SEO**
Los crons acumulan picks liquidados. Search Console + Bing Webmaster. Vigila el
ratio de indexación. Escribe 4–6 guías más.

**Semana 9 — abrir el pago**
Con 300+ picks y CLV positivo publicado, activa Pro. Empieza captando emails del
tráfico SEO, no con anuncios.

**Mes 3+ — escalar**
Alertas por Telegram, afiliados, props para Elite, y mezcla de modelo propio en
`blendWithModel()`.

---

## Documentación

| Documento | Contenido |
|---|---|
| **`docs/empezar-hoy.md`** | **Empieza por aquí: plan de arranque paso a paso** |
| `docs/registro-del-proyecto.md` | Registro completo de todo lo construido |
| `docs/backtest-hallazgos.md` | Backtest con datos reales. CLV +3.81%, 83% bate el cierre. |
| `docs/plan-seo.md` | Mapa de keywords y arquitectura de contenido |
| `docs/restricciones-y-cumplimiento.md` | España, LatAm, US, procesadores, publicidad |
| `docs/red-telegram-y-distribucion.md` | Canales, bot y distribución orgánica |
| `docs/monetizacion-plan-free.md` | Los cuatro flujos de ingreso del usuario gratuito |

---

## Legal

Incluye plantillas de términos, privacidad y juego responsable, más avisos +18 en
el footer de todas las páginas. **Son plantillas base: revísalas con un abogado
antes de facturar**, especialmente si operas en España (mercado regulado con
restricciones publicitarias fuertes) o en EE. UU. (regulación por estado).

Google Ads restringe fuertemente el contenido de gambling — otra razón por la que
el SEO orgánico es la vía correcta aquí, no una limitación de presupuesto.
