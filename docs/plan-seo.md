# Plan SEO · español (LatAm + España)

Basado en análisis de los SERPs reales de agosto 2026. Coste: $0.

---

## Lo que revela la competencia

**Términos de partido** (`real madrid vs barcelona pronóstico`) están copados por:
bwin.es, casasdeapuestas.com, sportytrader, betbrothers, 365scores, depor.com,
winsports. Portales de afiliación grandes y medios deportivos con autoridad de
dominio muy alta.

→ **No pelees aquí el primer año.** No vas a superar a un medio nacional en un
partido que cubre todo el mundo.

**Términos de método** (`value betting`, `closing line value`, `valor esperado
apuestas`) tienen SERPs mucho más blandos: sitios pequeños, blogs genéricos, un
par de portales especializados. Ninguno con autoridad aplastante.

→ **Aquí es donde entras.** Menos volumen, pero:
- La competencia es batible con contenido mejor.
- **El tráfico convierte muchísimo mejor.** Quien busca "closing line value"
  entiende de qué va esto y puede pagar $197. Quien busca "pronóstico Madrid
  Barça" busca un pick gratis.

---

## Arquitectura de contenido

### Cluster 1 · Método (prioridad máxima · ya construido)

Tu ventaja competitiva: eres el único que puede escribir esto **con datos
propios**. El backtest de `docs/backtest-hallazgos.md` es contenido único que
nadie más tiene.

| URL | Keyword objetivo | Estado |
|---|---|---|
| `/guias/que-es-el-clv-en-apuestas` | closing line value, clv apuestas | ✅ |
| `/guias/value-betting-que-es` | value betting, apuestas de valor | ✅ |
| `/guias/que-es-el-vig-y-como-quitarlo` | vig apuestas, margen casa | ✅ |
| `/guias/criterio-de-kelly-gestion-de-bankroll` | criterio kelly, cuánto apostar | ✅ |
| `/guias/por-que-el-roi-engana` | roi apuestas, muestra estadística | ⬜ |
| `/guias/donde-esta-el-valor-en-el-1x2` | apostar al empate, valor 1x2 | ⬜ |
| `/guias/limitacion-de-cuentas-apuestas` | me limitaron la cuenta, cuenta limitada | ⬜ |
| `/guias/probabilidad-implicita-calculadora` | calcular probabilidad cuota | ⬜ |

Las dos primeras pendientes salen **directamente del backtest**: el ROI que
cambia de signo y la concentración de valor en el empate. Datos propios, cero
coste, imposibles de copiar.

### Cluster 2 · Partidos (volumen · automático)

`/pronosticos/{liga}/{equipo-a}-vs-{equipo-b}-{fecha}` — ya implementado.

**Estrategia de entrada:** no ataques El Clásico. Ataca los partidos que los
portales grandes no cubren con contenido propio:

- Liga MX, Liga Profesional Argentina, Brasileirão → menos saturados en español
- Segunda división española, Serie B, Championship
- Jornadas entre semana y equipos pequeños

Un partido Getafe–Alavés tiene 50 veces menos búsquedas que un Clásico, pero
tú puedes ser el resultado #1. Multiplica eso por 3.000 partidos al año.

### Cluster 3 · Rendimiento (conversión)

`/rendimiento` no es solo prueba social: posiciona para búsquedas de marca y de
comparación (`[tu marca] opiniones`, `tipsters que publican resultados`). Es la
página que cierra la venta cuando alguien llega desde el cluster 1.

---

## Lo que se puede hacer ahora mismo sin gastar

| Acción | Coste | Impacto |
|---|---|---|
| Alta en Google Search Console + Bing Webmaster | $0 | Imprescindible |
| Backtest de 15.000 partidos → 2 artículos con datos propios | $0 | Alto |
| Escribir las 4 guías pendientes | $0 | Alto |
| Perfiles de marca (Reddit, foros de apuestas, X) | $0 | Medio |
| Publicar el backtest en r/SportsBetting, foros hispanos | $0 | Enlaces naturales |
| Analytics: Vercel Analytics free / Umami autoalojado | $0 | Medio |

**Enlaces:** el backtest público es tu mejor activo para conseguirlos. Un
análisis de 15.000 partidos con metodología abierta se cita solo. Es contenido
que ningún afiliado va a producir porque no tienen el modelo.

---

## Métricas y umbrales

| Métrica (Search Console) | A vigilar |
|---|---|
| **Páginas indexadas / enviadas** | <60% = problema serio de calidad |
| Impresiones cluster método | Debe crecer antes que el de partidos |
| CTR por posición | Top-10 con CTR <2% = arreglar el title |
| Consultas de marca | Señal de que el track record circula |

**El error clásico del SEO programático:** generar 10.000 URLs y que Google
indexe 300. El sitemap del proyecto solo incluye partidos con datos reales
justamente por eso — una página vacía indexada arrastra la calidad de todo
el dominio.

---

## Orden de ejecución

1. **Semanas 1–2** · Backtest completo + los 2 artículos con datos propios.
   Publicar antes que nada: es lo único que no pueden copiarte.
2. **Semanas 3–4** · Las 4 guías pendientes. Search Console dado de alta.
3. **Semanas 5+** · Los crons corriendo generan las páginas de partido solas.
   Vigilar el ratio de indexación semanalmente.
4. **Cuando haya 300+ picks liquidados** · Abrir el pago.
