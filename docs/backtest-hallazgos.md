# Backtest con datos reales · hallazgos

**Fuente:** football-data.co.uk — gratis, sin API key, sin registro.
**Muestra:** 207 partidos · LaLiga + Premier League + Serie A · temporada 2024/25.
**Coste:** $0.

Los datos incluyen cuotas de **apertura** y de **cierre** de Pinnacle, más la
mejor cuota del mercado en ambos momentos. Eso permite simular exactamente lo
que hace el motor en producción y medir el CLV de verdad.

---

## Resultado principal

| | Valor | Lectura |
|---|---|---|
| Control (apostar todo a la mejor cuota) | **−4.94%** ROI | La línea base. El vig te mata. |
| Estrategia (edge ≥ 2%) | +9.73% ROI | **Ignóralo. n=40 es ruido.** |
| **CLV medio vs cierre real** | **+3.81%** | ← El hallazgo |
| **Picks que baten el cierre** | **83%** | ← El hallazgo |

El proceso **detecta precios que el mercado corrige después**. Eso es ventaja
real, y es lo único que se puede afirmar con esta muestra.

---

## Por qué el ROI de este backtest no vale nada (y es importante entenderlo)

El mismo backtest, según cuántos partidos incluía:

| Muestra | Picks | ROI |
|---|---|---|
| Solo LaLiga (69 partidos) | 17 | **+29.3%** |
| + Premier League (138) | 28 | **−10.4%** |
| + Serie A (207) | 40 | **+9.7%** |

El ROI cambió de signo dos veces añadiendo datos. Un solo pick movía el
resultado 30 puntos porcentuales.

Mientras tanto, el CLV se mantuvo entre +1.75% y +3.81% en las tres muestras,
y el % de picks que baten el cierre nunca bajó del 82%.

**Esto es exactamente por qué no puedes vender suscripciones con 50 picks de
muestra.** No es prudencia comercial: es que el número que enseñarías sería
literalmente aleatorio.

---

## Hallazgo secundario: el valor se concentra en los empates

Desglose de los 40 picks (edge ≥ 2%):

| Selección | n | CLV | % que bate el cierre |
|---|---|---|---|
| **Empate** | **27** | **+4.77%** | **93%** |
| Local | 5 | +1.74% | 60% |
| Visitante | 7 | −2.17% | 57% |

Tiene una explicación de mercado conocida: el público apuesta a que **gana**
un equipo, casi nunca al empate. Las casas recreativas ajustan la línea hacia
donde va el dinero, y el empate se queda estirado por encima de su valor real.

**Los picks a visitante salen con CLV negativo** en las tres muestras. Candidato
claro a filtro — pero con n=7 hay que confirmarlo con más datos antes de tocar
el motor.

Por rango de cuota, el valor está entre 3.00 y 4.50 (CLV +3.70%, bate el 90%),
que es justo donde caen los empates. Es el mismo hallazgo visto de otra forma.

---

## Cuidado con los edges altos

| Umbral | n | CLV | ROI |
|---|---|---|---|
| edge ≥ 4% | 11 | +6.84% | −19.2% |
| edge ≥ 5% | 4 | +10.47% | −35.1% |
| edge ≥ 7% | 1 | +30.21% | −100% |

CLV espectacular, resultados desastrosos. La explicación no es mala suerte:
un "edge" del 30% contra Pinnacle casi nunca es valor. Es **un precio que no
existe de verdad** — un error de línea, un límite de 5 dólares, o una cuota
desactualizada que la casa corrige en minutos.

El motor ya lleva el filtro anti-outlier (`best.price / consensusOdds > 1.25`
en `model.ts`). Los datos confirman que hace falta: aplicarlo cambió el ROI
de la muestra de −10.4% a +23.2%.

---

## Qué cambiar en el motor

Nada todavía. Con 207 partidos, cualquier cambio sería sobreajuste.

Pero hay tres hipótesis listas para contrastar con la muestra completa:

1. **Excluir o penalizar los picks a visitante** (CLV negativo consistente).
2. **Bajar el tope de cuota de 8.00 a 4.50** — el tramo alto no aporta CLV y
   dispara la varianza.
3. **Endurecer el filtro anti-outlier de 1.25× a 1.15×** y medir qué se pierde.

---

## Cómo correr el backtest completo (gratis, 5 minutos)

```bash
bash scripts/fetch-data.sh
node --experimental-strip-types scripts/backtest.ts data/raw/*.csv
node --experimental-strip-types scripts/diagnose.ts data/raw/*.csv
```

Descarga 15 ligas × 7 temporadas ≈ **15.000 partidos**. Con esa muestra el ROI
empieza a significar algo y las tres hipótesis de arriba se pueden resolver.

Las cuotas de cierre existen desde la temporada 2019/20 — antes de eso las
columnas `*C*` no están y el CLV no se puede calcular.

---

## Lo que esto significa para el negocio

**La buena noticia:** el motor no es humo. Detecta sistemáticamente precios que
el mercado corrige después, y lo hace en tres ligas distintas.

**La mala:** el edge que aparece vive en la mejor cuota disponible entre 40
casas. Explotarlo requiere cuentas en varias casas y, si ganas de forma
sostenida, te limitarán. Eso hay que decírselo al cliente antes de cobrarle
$197 al mes, no después.

**La accionable:** puedes construir todo el track record público con estos datos
históricos **antes de pagar el primer mes de API**. Un backtest de 15.000
partidos, publicado y auditable, es un argumento de venta mucho más fuerte que
50 picks en vivo — y no cuesta nada.
