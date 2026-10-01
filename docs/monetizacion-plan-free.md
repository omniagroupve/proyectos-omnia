# Monetización del plan free

El plan gratuito no es caridad: es el activo que captura todo el tráfico SEO.
Cada punto de contacto monetiza de una de tres formas — **afiliación, publicidad
o conversión a pago** — sin manipular a nadie.

---

## Los cuatro flujos de ingreso del usuario gratuito

| Flujo | Cómo | Ingreso estimado |
|---|---|---|
| **Afiliación de casas** | Comparador de cuotas en cada página de partido | El mayor de los cuatro |
| **Display** | AdSense en páginas de contenido, nunca en el dashboard | Bajo pero constante |
| **Email** | Captura → secuencia educativa → conversión | Indirecto, alto |
| **Conversión a Pro** | Upsell contextual basado en valor demostrado | 2-4% del free |

**El orden importa.** La afiliación factura más que las suscripciones en la
mayoría de sitios de este tipo, y usa exactamente el mismo tráfico. No la
trates como secundaria.

---

## Puntos de contacto y qué hace cada uno

### 1. Página de partido (el volumen)

Es donde aterriza el tráfico SEO frío. Tres monetizaciones a la vez:

- **Comparador de cuotas con enlaces de afiliación.** Es contenido útil de
  verdad: enseña dónde está la mejor cuota aunque no pagues nada.
- **Bloque de display** entre el análisis y la comparativa.
- **CTA a registro gratuito** al final: "recibe el pick de este partido".

Componente listo: `OddsComparison` en `components/UpgradePrompt.tsx`.
Filtra por licencia del país del visitante y declara la afiliación.

### 2. Calculadora de valor (el imán)

`/herramientas/calculadora-valor` — gratis y sin registro.

Su mejor momento de conversión es contraintuitivo: **cuando el resultado es
negativo**. El usuario mete una cuota, ve "sin valor", y entiende por sí mismo
el problema. Ahí aparece la nota explicando que encontrar las cuotas con valor
exige comparar decenas de operadores en tiempo real.

No hay presión, no hay urgencia. La herramienta demuestra el problema y el
producto es la solución obvia.

### 3. Dashboard del usuario free (la conversión)

**Sin publicidad aquí.** El dashboard es el producto; llenarlo de banners lo
degrada y no compensa.

El argumento de venta es el retraso de 3 horas, y es honesto: cuando el usuario
free ve el pick, la cuota ya se movió. Ve que funcionaba y que no pudo cogerlo.
Esa es la demo del producto, no un truco.

### 4. Track record público (el cierre)

`/rendimiento` es donde alguien que llegó por una guía decide si paga. No lleva
publicidad ni afiliación: sólo datos y un CTA.

### 5. Guías (autoridad + email)

Display discreto y captura de email al final. La secuencia de bienvenida es
educativa, no comercial: cinco emails que enseñan CLV, vig, Kelly y varianza.
Al sexto se ofrece Pro — a quien ya entiende por qué lo necesita.

---

## Reglas que NO se rompen

Están implementadas en `UpgradePrompt.tsx` y no son opcionales:

1. **Regla del 5%.** Si el plan cuesta más del 5% del bankroll declarado, el
   componente **no vende**: dice explícitamente que no compense y sugiere
   quedarse en free. Pierdes ventas y ganas retención.
2. **Sin urgencia falsa.** Ninguna cuenta atrás, ningún "quedan 3 plazas"
   inventado. El cap de Elite es real y está en `config.ts`.
3. **Sin persecución.** Nadie que cancela recibe emails de recuperación ni
   remarketing. Está prohibido por el RD 958/2020 y además genera chargebacks.
4. **Cancelación en un clic.** La fricción produce disputas, y las disputas te
   cierran el procesador.
5. **Sin publicidad en el dashboard de pago.** Obvio, pero se olvida.

---

## Por qué esto factura más que la alternativa manipuladora

| | Producto manipulador | Este producto |
|---|---|---|
| Conversión inicial | Más alta | Más baja |
| Churn mensual | 35-50% | 10-15% |
| LTV a $197 | ~$450 | ~$1.400 |
| Chargebacks | 2-5% | <0.5% |
| Procesador | Cerrado en meses | Estable |
| SEO de marca | Reseñas destructivas | Neutro o positivo |
| Riesgo regulatorio | Sanción y cierre | Bajo |

El churn es la variable que decide, y es exactamente la que la manipulación
empeora. Un usuario presionado a comprar por encima de sus medios cancela en
6-8 semanas y a menudo disputa el cargo. Uno que compró entendiendo la
propuesta paga 18 meses.

---

## Métricas del embudo free

| Métrica | Objetivo | Señal de alarma |
|---|---|---|
| Visitante → registro free | 3-6% | <2% = el CTA no se ve |
| Free → Pro (90 días) | 2-4% | <1% = el track record no convence |
| RPM de afiliación | Depende del acuerdo | Compáralo con el display |
| Churn Pro mensual | <15% | >25% = vendiste a quien no debías |
| Ratio de chargebacks | <0.5% | >1% = riesgo de cierre del procesador |

Si la conversión free→Pro es baja pero el churn también, no fuerces el embudo:
el problema es que el track record aún no es lo bastante largo. Se arregla con
tiempo, no con presión.
