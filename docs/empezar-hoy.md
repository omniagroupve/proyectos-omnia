# Empezar hoy · plan de arranque

Todo lo que sigue lo tienes que hacer tú porque requiere tus cuentas, tus
tarjetas y tu identidad. El código ya está.

**Tiempo total: unas 3 horas.** Coste hoy: **$0** — todo lo de hoy es gratis.

---

## BLOQUE 1 · Poner el proyecto en marcha (45 min)

### 1.1 · Arrancar en local (5 min)

```bash
unzip omnia-picks.zip && cd omnia-picks
npm install
cp .env.example .env.local
npm run dev
```

Abre `localhost:3000`. La web funciona sin credenciales — sin datos, pero
funciona. Si ves el landing, todo bien.

### 1.2 · Supabase (15 min) · gratis

1. Crea cuenta en [supabase.com](https://supabase.com) → nuevo proyecto.
2. **SQL Editor** → pega entero `supabase/schema.sql` → **Run**.
3. **Project Settings → API** → copia a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← **nunca** con prefijo `NEXT_PUBLIC_`
4. **Authentication → Providers** → activa **Email**.

### 1.3 · Dominio (10 min) · ~$1–12

Cómpralo hoy. **La antigüedad del dominio cuenta para SEO**, y cada día que
pasa sin registrarlo es un día perdido.

Sugerencia: algo corto en `.com`, con la palabra picks o el nombre de marca.
Evita meter "apuestas" en el dominio — limita el alcance y complica el
posicionamiento fuera del nicho.

### 1.4 · Deploy (15 min) · gratis

```bash
npx vercel --prod
```

Sube todas las variables de `.env.local` en el panel de Vercel. Conecta el
dominio. **Ya tienes la web en producción.**

---

## BLOQUE 2 · Validar el modelo con datos reales (30 min)

Esto es lo más importante del día y no cuesta nada.

```bash
npm run data       # descarga ~15.000 partidos, 30 segundos
npm run backtest
npm run diagnose
```

**Qué mirar en el resultado:**

| Métrica | Qué significa |
|---|---|
| **CLV medio** | Si sale positivo, el modelo tiene ventaja real. Es lo único fiable. |
| **% que bate el cierre** | Por encima del 55% sostenido = proceso ganador |
| ROI | Ahora sí es interpretable con 15.000 partidos |
| Desglose por selección | ¿Se confirma que el valor está en los empates? |
| Desglose por cuota | ¿Merece la pena bajar el tope de 8.00 a 4.50? |

**Manda el resultado y ajustamos el motor con esos datos.** Ahí es donde se
decide si el negocio funciona, y lo sabes hoy en vez de en tres meses.

---

## BLOQUE 3 · Búscate la fuente de datos (20 min)

### The Odds API · $30–59/mes

[the-odds-api.com](https://the-odds-api.com) → regístrate → copia la key.

**Empieza barato.** En `.env.local`:

```
ODDS_REGIONS=eu
ODDS_MARKETS=h2h
```

Eso es 1 crédito por llamada en vez de 6. Con el plan de $30 te sobra para
arrancar. Amplía a `eu,us` y `h2h,spreads,totals` cuando factures.

Primera ingesta:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://tudominio.com/api/cron/ingest
```

Mira `creditsRemaining` en la respuesta. Vigílalo la primera semana.

---

## BLOQUE 4 · Canal de distribución (40 min) · gratis

### 4.1 · Bot de Telegram (20 min)

1. [@BotFather](https://t.me/BotFather) → `/newbot` → copia el token.
2. Crea dos canales:
   - **Público** — picks con 3h de retraso. Es tu motor de captación.
   - **Privado Pro** — tiempo real. Añade el bot como administrador.
3. Rellena las variables `TELEGRAM_*` en Vercel.
4. Registra el webhook (una sola vez):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://tudominio.com/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
```

### 4.2 · Search Console y Bing (20 min) · gratis

1. [Google Search Console](https://search.google.com/search-console) → añade el dominio → verifica por DNS.
2. Envía `https://tudominio.com/sitemap.xml`.
3. Lo mismo en [Bing Webmaster Tools](https://www.bing.com/webmasters).

**Hazlo hoy aunque no haya contenido.** Google tarda semanas en confiar en un
dominio nuevo; el reloj empieza cuando lo registras, no cuando publicas.

---

## BLOQUE 5 · Abrir los pagos (30 min) · gratis hasta que vendas

### Lemon Squeezy

1. Cuenta en [lemonsqueezy.com](https://lemonsqueezy.com). Piden datos fiscales.
2. Crea dos productos de suscripción: **Pro $197/mes** y **Elite $497/mes**.
3. Copia los **variant IDs** a las variables de Vercel.
4. **Settings → Webhooks** → `https://tudominio.com/api/webhooks/lemonsqueezy`,
   eventos `subscription_*`. Copia el signing secret.

### Y abre Paddle también

En [paddle.com](https://paddle.com), aunque no lo uses. **La aprobación tarda
días o semanas.** El día que Lemon Squeezy te dé un problema no puedes
permitirte empezar el trámite desde cero.

---

## LO QUE NO DEBES HACER HOY

❌ **Vender.** No tienes track record. Con 50 picks el ROI que enseñarías sería
literalmente aleatorio, y quemarías tu reputación con los primeros clientes.

❌ **Pagar publicidad.** Google Ads exige certificación por país para este
sector y Meta requiere autorización previa. Tu canal es SEO y comunidad.

❌ **Comprar prompts de plantillas.** Te lo explico abajo.

---

## PRÓXIMAS 8 SEMANAS

| Semanas | Qué |
|---|---|
| **1–2** | Crons corriendo. Publicar el análisis del backtest de 15.000 partidos en r/algobetting y foros hispanos. Es tu mejor imán de enlaces. |
| **3–4** | Canal público publicando picks a diario, ganados y perdidos. Escribir las guías pendientes. Vigilar el ratio de indexación en Search Console. |
| **5–8** | Ritmo. Contactar analistas para intercambio de contenido. El track record se construye solo. |
| **9** | Con 300+ picks liquidados y CLV positivo publicado: **abrir el pago**. |

Durante 8 semanas no vendes nada: construyes la prueba en público. Cuando
abras, la conversión será mucho más alta que empujando un producto sin
historial, y no habrás gastado un dólar en adquisición.

---

## CHECKLIST DE HOY

- [ ] `npm install` y web corriendo en local
- [ ] Supabase creado y schema ejecutado
- [ ] Dominio comprado
- [ ] Deploy en Vercel con dominio conectado
- [ ] **Backtest de 15.000 partidos ejecutado** ← lo más importante
- [ ] The Odds API contratado y primera ingesta hecha
- [ ] Bot de Telegram creado y webhook registrado
- [ ] Search Console y Bing verificados, sitemap enviado
- [ ] Lemon Squeezy configurado
- [ ] Paddle solicitado como plan B
- [ ] Resultado del backtest enviado para ajustar el motor

---

## ANTES DE COBRAR EL PRIMER EURO

No es para hoy, pero que no se te olvide:

- [ ] Abogado especializado en juego online revisa términos y privacidad
- [ ] Verificación +18 en el registro
- [ ] US bloqueado en el registro
- [ ] Enlaces de afiliación sólo a operadores con licencia en el país del visitante
- [ ] 300+ picks liquidados con CLV positivo publicado

El detalle completo está en `docs/restricciones-y-cumplimiento.md`. Las
sanciones en España llegan a €1M y cierre: no es un trámite opcional.
