# Encender el motor · de las llaves a Pix funcionando solo

`EMPIEZA-AQUI.md` te deja con el proyecto corriendo en tu computador. Esta guía
sigue desde ahí: **poner Pix en internet y que trabaje sin ti**.

Al terminar, cada dos horas Pix va a bajar cuotas, calcular qué tiene valor,
publicar picks y —cuando los partidos acaben— liquidarlos y apuntar el CLV.
Sin que tú toques nada. Eso es el track record, y es lo único del negocio que
no se puede comprar ni acelerar: sólo se acumula con el tiempo.

Calcula **una tarde**. No hace falta saber programar.

---

## Lo que vas a gastar

| Servicio | Coste | Para qué |
|---|---|---|
| The Odds API | **$30/mes** | Las cuotas. El único gasto obligatorio |
| Dominio | ~$12/año | Tu dirección en internet |
| Supabase | $0 | La base de datos |
| Vercel | $0 | Donde vive el backend |
| GitHub Actions | $0 | El reloj que despierta al motor |
| Anthropic | $0 | Sin clave, Pix escribe con plantillas |

**~$31 al mes.** Si alguien (yo incluido) te dijo $59 de The Odds API: el de
$30 alcanza. Son 6.750 llamadas al mes con el sondeo escalonado que ya está
programado, y ese plan trae 20.000. Lo comprueba `npm run doctor` con tu
configuración real, no de memoria.

---

## Paso 1 · Las cuatro cuentas

Ninguna la puedo abrir yo: todas piden correo, aceptar condiciones y, una de
ellas, tarjeta.

1. **Supabase** — supabase.com → New project.
   Región: **São Paulo (sa-east-1)**, la más cercana a LatAm.
   Guarda: la *URL del proyecto*, la *anon key* y la *service_role key*.
2. **The Odds API** — the-odds-api.com → plan de $30.
   Guarda: la *API key*.
3. **Vercel** — vercel.com, entrando con tu cuenta de GitHub.
4. **Un dominio** — donde quieras (Namecheap, Cloudflare, Porkbun…).

Telegram, Anthropic y Lemon Squeezy son para después. Pix arranca sin ellos.

---

## Paso 2 · Crear las tablas

En Supabase, pestaña **SQL Editor**. Pega y ejecuta estos tres archivos, **en
este orden**, uno cada vez:

1. `supabase/schema.sql`
2. `supabase/migrations/002_pix.sql`
3. `supabase/migrations/003_latam.sql`

Si te saltas el orden dará error, porque cada uno se apoya en el anterior.

---

## Paso 3 · Tu archivo de claves

En tu computador, dentro de la carpeta del proyecto:

```bash
cp .env.example .env.local
```

Abre `.env.local` y rellena lo imprescindible:

```
NEXT_PUBLIC_SUPABASE_URL=      (de Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY= (de Supabase)
SUPABASE_SERVICE_ROLE_KEY=     (de Supabase · NUNCA con NEXT_PUBLIC_ delante)
ODDS_API_KEY=                  (de The Odds API)
CRON_SECRET=                   (invéntalo, largo · ver abajo)
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

Para el `CRON_SECRET`, en la terminal:

```bash
openssl rand -hex 32
```

Copia lo que salga. **Apúntalo aparte**: lo vas a necesitar dos veces más.

> `.env.local` nunca se sube a GitHub. Ya está bloqueado.

Ahora comprueba que no falta nada:

```bash
npm run doctor
```

Te dice servicio por servicio qué está puesto y qué falta. Nunca imprime el
valor de una clave, así que puedes pegar su salida donde quieras. Cuando diga
*"Todo lo imprescindible está puesto"*, sigue.

---

## Paso 4 · Poner Pix en internet

1. En **vercel.com** → *Add New Project* → elige este repositorio.
2. Antes de darle a *Deploy*, abre **Environment Variables** y pega ahí **las
   mismas líneas** de tu `.env.local`. Una por una, o con *Import .env*.
3. *Deploy*. Tarda un par de minutos.
4. *Settings → Domains* → añade tu dominio y sigue las instrucciones.

Comprueba que está vivo abriendo en el navegador:

```
https://tu-dominio.com/api/v1/parlays/demo
```

Si ves un montón de texto con llaves y corchetes, funciona.

Y ahora con tus claves de verdad:

```bash
npm run doctor -- --online
```

Esto sí pregunta a los proveedores: cuántos créditos te quedan, si las tablas
existen, si el bot responde. Consultar el saldo no gasta créditos.

---

## Paso 5 · El reloj

Falta lo importante: **algo que despierte a Pix cada dos horas**.

Vercel en su plan gratuito sólo ejecuta un cron **al día** — inútil para esto.
Por eso el reloj vive en GitHub Actions, que es gratis y ya tienes el repo ahí.

En **GitHub → tu repositorio → Settings → Secrets and variables → Actions →
New repository secret**, crea dos:

| Nombre | Valor |
|---|---|
| `PIX_URL` | `https://tu-dominio.com` (sin barra al final) |
| `CRON_SECRET` | el mismo que pusiste en Vercel |

**Tienen que ser idénticos a los del despliegue.** Si no coinciden, cada
ejecución fallará con un 401 y te lo dirá con esas palabras.

### Encenderlo

Los horarios de GitHub **sólo se disparan desde la rama principal**. Mientras
el trabajo esté en una rama aparte, el reloj está dormido. Para encenderlo:
fusiona el pull request a `main`.

### Probarlo sin esperar

No hace falta esperar a la hora en punto:

**Actions → Motor → Run workflow** → elige `ingest` → *Run*.

Se ejecuta al momento y te enseña qué respondió el backend. Eso sí funciona
desde cualquier rama.

### Tres cosas que conviene saber

- **GitHub no es puntual.** Con carga alta retrasa los horarios 10-15 minutos.
  Para la ingesta cada 2 h da igual.
- **Se apaga solo tras 60 días sin actividad** en el repositorio, y avisa por
  correo. Se reactiva con un clic.
- **Si algún día pasas a Vercel Pro**, borra `.github/workflows/cron.yml` o
  desactívalo. Si no, cada ruta se llamaría dos veces y gastarías el doble de
  créditos.

---

## Paso 6 · La primera carga de datos

Esto se hace una sola vez, desde tu computador:

```bash
npm run leagues:verify   # ¿las ligas configuradas existen ahora mismo?
npm run books:verify     # ¿con qué casas puedes hacer afiliación de verdad?
npm run data             # baja el histórico (tarda)
npm run data:seed        # lo mete en Supabase
npm run backtest         # y ahora el backtest significa algo
```

`books:verify` es el que decide un pedazo del negocio: la afiliación sólo
funciona con casas cuya cuota puedes enseñar. Si Caliente o Betano no salen en
la lista, el enlace sería a ciegas.

---

## Ya está

A partir de aquí, sin que hagas nada:

| Cada | Pasa esto |
|---|---|
| 2 h | Baja cuotas, busca valor, publica picks |
| 3 h | Trae resultados oficiales |
| 3 h | Liquida lo que terminó y calcula el CLV |
| 6 h | Arma los parlays del día |
| 30 min | Publica en el canal público de Telegram |

Dale **6-8 semanas**. Con 300 picks liquidados tienes un track record que se
puede enseñar. Con 40 no: cualquier número que saques es ruido.

Mientras tanto, Codex termina el salón.

---

## Cuando algo no va

| Síntoma | Qué mirar |
|---|---|
| Actions sale en rojo con **401** | `CRON_SECRET` distinto en GitHub y en Vercel |
| Actions sale en amarillo con **503** | Faltan variables en Vercel · corre `npm run doctor` |
| Actions dice *"faltan los secretos"* | No creaste `PIX_URL` / `CRON_SECRET` en GitHub |
| No se publica ningún pick | Normal si no hay valor. Mira la respuesta de `ingest` |
| Se acaban los créditos | El motor se frena solo por debajo de 2.000. Baja `ODDS_MARKETS` a `h2h` |
| Quiero parar todo ya | Pon `PIX_PAUSE_EXTERNAL=1` en Vercel · ninguna llamada de pago sale |
