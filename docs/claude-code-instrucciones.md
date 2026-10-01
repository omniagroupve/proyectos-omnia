# Claude Code · instrucciones desde cero

Prompts listos para copiar y pegar, en orden. **Tiempo total: ~3 horas.**

---

## PASO 0 · Instalar (5 min)

**macOS / Linux / WSL**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows PowerShell**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**macOS con Homebrew**
```bash
brew install --cask claude-code
```

Comprobar:
```bash
claude --version
```

---

## PASO 1 · Abrir el proyecto (2 min)

```bash
unzip omnia-picks.zip
cd omnia-picks
claude
```

La primera vez te pide login. Entra con tu cuenta de Claude (Pro o Max).

El repo ya trae un **`CLAUDE.md`** en la raíz: Claude Code lo lee solo al
arrancar. Contiene la arquitectura, los invariantes del motor y las reglas de
producto, así que no tienes que explicarle el proyecto cada sesión.

**Atajos que vas a usar:**

| Atajo | Para qué |
|---|---|
| `Shift+Tab` | Cambiar modo de permisos (auto / plan / manual) |
| `/` | Ver comandos disponibles |
| `↑` | Historial de prompts |
| `/clear` | Limpiar contexto cuando cambies de tarea |
| `claude -c` | Continuar la última conversación en esa carpeta |

---

## PASO 2 · Que se ponga al día (2 min)

Primer prompt:

```
Lee CLAUDE.md y docs/registro-del-proyecto.md. Después ejecuta
npm install, npm run build y npm run test:engine, y dime si
todo pasa. No cambies nada todavía.
```

Si el build pasa y los 37 tests están en verde, el proyecto está sano.

---

## PASO 3 · El backtest ⭐ (30 min)

**Esto es lo más importante del día.** Es gratis y te dice si el negocio
funciona.

```
Ejecuta npm run data para descargar el histórico completo de
football-data.co.uk. Cuando termine, corre npm run backtest y
npm run diagnose sobre data/raw/*.csv.

Después analiza los resultados y dime:
1. ¿El CLV medio sigue siendo positivo con la muestra grande?
2. ¿Qué porcentaje de picks bate la línea de cierre?
3. ¿Se confirma que el valor se concentra en los empates?
4. ¿Los picks a visitante siguen con CLV negativo?
5. ¿Qué pasa si bajo el tope de cuota de 8.00 a 4.50?

No modifiques el motor todavía. Solo el análisis.
```

Cuando tengas la respuesta:

```
Con estos datos, propón los cambios concretos al motor
(src/lib/model.ts y src/lib/config.ts). Para cada cambio dime
qué mejora y en qué métrica lo estás basando. Usa plan mode.
```

> **Truco:** pulsa `Shift+Tab` hasta llegar a **plan mode** antes de este
> prompt. Claude Code te enseña el plan y no toca nada hasta que apruebes.
> Para cambios en la matemática del motor, merece la pena.

---

## PASO 4 · Supabase (15 min)

Hazlo tú a mano, es más rápido que explicárselo:

1. [supabase.com](https://supabase.com) → nuevo proyecto
2. **SQL Editor** → pega entero `supabase/schema.sql` → **Run**
3. **Project Settings → API** → copia las tres claves
4. **Authentication → Providers** → activa **Email**

Luego, en Claude Code:

```
Crea .env.local a partir de .env.example. Voy a pegarte las
credenciales de Supabase ahora. Después arranca npm run dev y
comprueba que /login funciona.
```

---

## PASO 5 · Deploy (15 min)

```
Ayúdame a desplegar en Vercel. Necesito:
1. Inicializar git y hacer el primer commit
2. Desplegar con npx vercel --prod
3. La lista exacta de variables de entorno que tengo que
   configurar en el panel de Vercel

Recuérdame cuáles son secretas y no pueden llevar prefijo
NEXT_PUBLIC_.
```

---

## PASO 6 · The Odds API (20 min)

Regístrate en [the-odds-api.com](https://the-odds-api.com) y copia la key.

```
Configura ODDS_API_KEY. Para empezar barato pon ODDS_REGIONS=eu
y ODDS_MARKETS=h2h, que es 1 crédito por llamada en vez de 6.

Después lanza la primera ingesta contra producción con curl y
dime cuántos créditos ha consumido y cuántos picks ha generado.
```

---

## PASO 7 · Telegram (20 min)

1. [@BotFather](https://t.me/BotFather) → `/newbot` → copia el token
2. Crea dos canales: uno público y uno privado (bot como administrador)

```
Tengo el token del bot. Ayúdame a:
1. Configurar las variables TELEGRAM_* en local y en Vercel
2. Registrar el webhook con setWebhook
3. Probar que /start y /stats responden

Si algo falla, dime cómo depurarlo con getWebhookInfo.
```

---

## PASO 8 · Migrar las fuentes (10 min)

Deuda técnica que conviene saldar ya:

```
Migra las fuentes de <link> a Google Fonts a next/font/google
(Space Grotesk y JetBrains Mono), como indica el comentario en
src/app/layout.tsx. Actualiza tailwind.config.ts para usar las
variables CSS. Verifica con npm run build.
```

Esto no se podía hacer donde se construyó el proyecto porque el entorno no
tenía acceso a `fonts.googleapis.com`. En tu máquina sí.

---

## PASO 9 · SEO y pagos (30 min)

```
Ayúdame a verificar el dominio en Google Search Console y Bing
Webmaster Tools, y a enviar el sitemap. Dime exactamente qué
registro DNS tengo que crear.
```

Lemon Squeezy hazlo a mano (piden datos fiscales), y **solicita también Paddle
hoy** — la aprobación tarda semanas y no puedes empezar el trámite el día que
tengas un problema.

---

## Cómo trabajar con Claude Code en este proyecto

**Usa plan mode para la matemática.** `Shift+Tab` hasta *plan mode* antes de
tocar `devig.ts`, `model.ts` o `dixon-coles.ts`. Ahí un error silencioso te
cuesta dinero real.

**Deja que explore antes de pedirle cambios.** «Analiza cómo funciona el gating
por tier» antes de «cambia el gating» da resultados mucho mejores.

**Sé específico con los números.** Mal: «mejora el motor». Bien: «el diagnóstico
dice que los picks a visitante tienen CLV −2.17% sobre 7 casos; añade un flag
de configuración para excluirlos y mide el impacto en el backtest completo».

**`/clear` al cambiar de tarea.** Pasar de SEO a matemática con el contexto
lleno de lo anterior empeora las respuestas.

**Que corra los tests siempre.** `npm run test:engine` después de cualquier
cambio en el motor. Ya encontró un bug real de coma flotante en Kelly.

---

## Prompts útiles para más adelante

```
Analiza el resultado del cron de ingesta de las últimas 24h y
dime si hay ligas fallando o consumo anómalo de créditos.
```

```
Escribe la guía /guias/por-que-el-roi-engana usando los datos
reales de docs/backtest-hallazgos.md — las tres muestras donde
el ROI cambió de signo. Sigue el formato de src/lib/guides.ts.
```

```
Construye el dashboard de rendimiento personal del usuario:
su ROI, sus unidades y su CLV según los picks que ha seguido.
Es una feature del plan Pro.
```

```
Revisa toda la web y dime si hay algún mensaje que incumpla
las reglas de docs/restricciones-y-cumplimiento.md.
```

---

## Checklist de hoy

- [ ] Claude Code instalado y con login
- [ ] `npm install`, `npm run build`, `npm run test:engine` en verde
- [ ] **`npm run data` + backtest de 15.000 partidos** ⭐
- [ ] Supabase creado y schema ejecutado
- [ ] Dominio comprado
- [ ] Deploy en Vercel funcionando
- [ ] The Odds API configurado y primera ingesta hecha
- [ ] Bot de Telegram respondiendo
- [ ] Search Console y Bing verificados
- [ ] Lemon Squeezy configurado y Paddle solicitado
