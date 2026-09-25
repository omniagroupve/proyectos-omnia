# Registro del proyecto · Omnia IA Picks

Todo lo construido hasta hoy, qué hace cada pieza y qué está validado.

---

## Estado

| | |
|---|---|
| **Build** | Limpio · 38 rutas |
| **Tests del motor** | 37/37 en verde |
| **Modelo propio** | Validado (recupera parámetros con r=0.91–0.94) |
| **Backtest** | 207 partidos reales · CLV +3.81% · 83% bate el cierre |
| **Coste mensual** | ~$35–60 para arrancar |
| **Falta para facturar** | Credenciales + 6–8 semanas de track record |

---

## 1. Motor matemático

| Archivo | Qué hace |
|---|---|
| `src/lib/devig.ts` | Eliminación de margen (3 métodos), edge, Kelly fraccionado, CLV, conversión de formatos |
| `src/lib/model.ts` | Consenso ponderado por casa, detección de valor, filtro anti-outlier, mezcla con modelo propio |
| `src/lib/dixon-coles.ts` | Modelo propio: Poisson bivariante con ratings de equipo, ventaja de campo, corrección ρ y decaimiento temporal |
| `src/lib/odds.ts` | Cliente de The Odds API con control de créditos |
| `src/lib/config.ts` | Precios, 21 ligas, pesos de casas, umbrales del motor |

**Decisiones que importan:**

- Se de-viga **cada casa por separado antes de promediar**. Al revés introduce un sesgo sistemático porque cada operador carga un margen distinto.
- Casas de margen bajo (Pinnacle, Circa, Betfair) pesan **5×** las recreativas.
- Kelly al **0.25** con tope de 5 unidades por pick.
- Filtro anti-outlier a **1.25×**: una cuota muy por encima del consenso casi nunca es valor, es un error de línea o un límite de $5.
- Peso máximo del modelo propio: **35%**, y baja cuanto más discrepa del mercado.

---

## 2. Producto web

38 rutas. Las que importan:

| Ruta | Función |
|---|---|
| `/` | Landing con canvas de datos vivos, visualización del devig y narrativa por scroll |
| `/precios` | Pricing sándwich + FAQ con JSON-LD |
| `/rendimiento` | Track record público — **el activo real del negocio** |
| `/picks` | Dashboard gateado por tier + conexión de Telegram |
| `/pronosticos/[liga]/[slug]` | SEO programático: miles de URLs automáticas |
| `/guias/[slug]` | Contenido pilar (CLV, vig, Kelly, value betting) |
| `/herramientas/calculadora-valor` | Herramienta gratuita e imán de SEO |
| `/legal/*` | Términos, privacidad, juego responsable |

**Diseño:** Space Grotesk + JetBrains Mono, animaciones con IntersectionObserver y canvas (cero librerías), grano de película, y respeto a `prefers-reduced-motion`.

**La pieza distintiva** es la visualización del devig del landing: la barra desborda la marca del 100%, colapsa, y aparece el valor. Los números salen de la función `devig()` real, no están escritos a mano.

---

## 3. Infraestructura

| Pieza | Estado |
|---|---|
| Base de datos + RLS | `supabase/schema.sql`, idempotente |
| Auth por magic link | Listo |
| Pagos (Lemon Squeezy) | Checkout + webhook con verificación HMAC |
| Cron de ingesta | Cada 2h: cuotas → snapshot → análisis → picks |
| Cron de liquidación | Cada 3h: resultados → settle → CLV |
| Bot de Telegram | `/vincular` `/stats` `/plan` `/baja` + broadcast |

**El gating por tier vive en RLS**, no en el front. Aunque alguien manipule la interfaz, la base de datos no devuelve picks que no le corresponden.

---

## 4. Qué está validado y qué no

### ✅ Validado con datos reales

- **El motor detecta ineficiencias.** 207 partidos de LaLiga, Premier y Serie A: CLV medio +3.81%, y el 83% de los picks batieron la línea de cierre. El grupo de control (apostar todo) pierde −4.94%.
- **El modelo propio funciona.** Sobre una liga simulada con fuerzas conocidas recupera ataque (r=0.91), defensa (r=0.94), ventaja de campo (0.258 vs 0.26 real) y ρ (−0.084 vs −0.08 real).
- **El mercado es un rival duro.** Log loss medido: 0.946 frente a 1.090 de la frecuencia base. Por eso el modelo propio va con peso bajo.

### ⚠️ Sin validar

- **El ROI.** 40 picks no dicen nada. Cambió de signo dos veces al ampliar la muestra: +29% → −10% → +9.7%. Se resuelve con `npm run data` (15.000 partidos, gratis).
- **La conversión.** No hay usuarios todavía.
- **La retención.** Íd.

### 🔴 Riesgo que no se arregla con código

Si ganas de forma sostenida, las casas recreativas te limitarán o cerrarán la cuenta. Es estructural en el value betting. Hay que decírselo al cliente **antes** de cobrarle.

---

## 5. Hallazgos del backtest

1. **El ROI con muestra corta es ruido puro.** Un solo pick movía el resultado 30 puntos.
2. **El valor se concentra en los empates.** 27 de 40 picks, CLV +4.77%, batiendo el cierre el 93%. El público apuesta a que gana alguien, casi nunca al empate, y las casas dejan esa línea estirada.
3. **Los picks a visitante salen con CLV negativo** en las tres muestras. Candidato a filtro.
4. **Los edges altos son trampa.** Con edge ≥7%, el CLV parece espectacular (+30%) y el resultado es −100%. Son precios que no existen de verdad.

---

## 6. Documentación

| Documento | Contenido |
|---|---|
| `docs/backtest-hallazgos.md` | Resultados y metodología del backtest |
| `docs/plan-seo.md` | Keywords, competencia real y arquitectura de contenido |
| `docs/restricciones-y-cumplimiento.md` | España, LatAm, US, procesadores, publicidad, RGPD |
| `docs/red-telegram-y-distribucion.md` | Canales, bot y distribución orgánica |
| `docs/monetizacion-plan-free.md` | Los cuatro flujos de ingreso del usuario gratuito |
| `docs/empezar-hoy.md` | **Tu plan de arranque** |

---

## 7. Comandos

```bash
npm run dev              # desarrollo
npm run build            # producción
npm run test:engine      # 37 tests del motor
npm run validate:model   # valida Dixon-Coles
npm run data             # descarga ~15.000 partidos (gratis)
npm run backtest         # backtest sobre datos reales
npm run diagnose         # diagnóstico por segmento
```

---

## 8. Decisiones de producto que conviene no revertir

1. **Lemon Squeezy, no Stripe.** Stripe cierra cuentas de este sector reteniendo saldo 90–180 días. Ten Paddle abierto como plan B.
2. **El CLV en portada, no el ROI.** Filtra curiosos y atrae al cliente que paga.
3. **Publicar los picks perdedores.** Es el diferenciador entero.
4. **La regla del 5%.** Si el plan cuesta más del 5% del bankroll del usuario, el producto le dice que no lo compre. Baja la conversión y sube el LTV ~3×.
5. **Sin mecánicas de compulsión.** Ni cuentas atrás falsas, ni plazas inventadas, ni emails de recuperación. Riesgo regulatorio real y peor negocio.
6. **No vender hasta tener 300+ picks liquidados.**
