# Red de Telegram y distribución orgánica

Telegram es el canal natural de este producto: es donde ya vive la audiencia
hispana de apuestas, es gratis, y la latencia importa (un pick a destiempo no
vale nada).

---

## 1. Arquitectura de canales

No hagas un solo canal. Haz un embudo de tres niveles.

```
  CANAL PÚBLICO (abierto, indexable)
  ├─ 1 pick gratis al día, con 3h de retraso
  ├─ Resultado de TODOS los picks de ayer (ganados y perdidos)
  ├─ Fragmentos de las guías → tráfico a la web
  └─ Objetivo: captar, demostrar, no vender
                 │
                 ▼
  CANAL PRO (privado, acceso por bot)
  ├─ Picks en tiempo real al publicarse
  ├─ Aviso de movimiento de línea
  └─ Objetivo: entregar el producto
                 │
                 ▼
  GRUPO ELITE (chat, no canal — conversación bidireccional)
  ├─ Props, live, discusión con el equipo
  ├─ 50 plazas: el chat deja de funcionar por encima de ~150 personas
  └─ Objetivo: retención y comunidad
```

**Por qué el canal público publica los resultados de todo:** es el mecanismo de
prueba. Cualquiera puede comprobar que el pick de ayer se publicó antes del
partido. Es tu diferenciador frente a los tipsters que borran los fallos, y no
cuesta nada.

**Por qué el retraso de 3h en el free:** el usuario ve que el pick era bueno
pero ya no puede aprovechar esa cuota. Eso convierte mucho mejor que ocultar
el pick entero. No es manipulación: es una demo honesta del producto.

---

## 2. El bot

Un bot de Telegram es gratis e ilimitado. Necesitas que haga cuatro cosas:

| Función | Por qué |
|---|---|
| Vincular cuenta web ↔ Telegram | Un código de un solo uso desde `/picks` |
| Verificar tier antes de cada envío | Consulta el `tier` en Supabase |
| Expulsar automáticamente al caducar | Sin esto regalas el producto a los que cancelan |
| `/stats` bajo demanda | Track record al instante, sin salir de la app |

**Implementación:** webhook de Telegram → una API route en el mismo Next.js.
Cero infraestructura extra, cero coste.

```
POST /api/telegram/webhook   ← recibe mensajes
POST /api/telegram/broadcast ← lo llama el cron de ingesta al publicar picks
```

El cron de ingesta ya existe. Sólo hay que añadir la llamada al broadcast
después de insertar los picks.

---

## 3. Comunidades donde distribuir

La regla que decide si esto funciona o te banean: **entra a aportar, no a
promocionar.** El spam en estos grupos se detecta en horas.

### Reddit
| Sub | Idioma | Cómo entrar |
|---|---|---|
| r/SportsBetting | EN | Publica el backtest con metodología. Ahí valoran los datos. |
| r/sportsbook | EN | Comunidad grande, hostil al autopromo. Aporta primero meses. |
| r/dequeva / r/futbol | ES | Contexto general, no apuestas. Cuidado. |
| r/algobetting | EN | **El mejor encaje.** Gente que backtestea. Tu contenido es exactamente su tema. |

**r/algobetting es tu punto de entrada.** Publica el análisis de Dixon-Coles y
el hallazgo del CLV en los empates. Es contenido técnico real, y esa comunidad
genera enlaces de calidad.

### Foros hispanos
- **Foro de ForoCoches (apuestas)** — enorme, muy escéptico. Sólo entra con datos.
- **Comunidades de Discord de trading deportivo** — más receptivas, menos ruido.
- **X/Twitter hispano de apuestas** — publica CLV semanal, no picks. Diferénciate.

### Lo que NO funciona
- Entrar a un grupo y pegar el enlace → ban inmediato
- Comprar shoutouts en canales de tipsters → audiencia quemada, cero conversión
- Grupos de "picks gratis VIP" → son de operadores, no tienen tu cliente

---

## 4. Contenido orgánico que sí funciona

Tienes una ventaja que ningún tipster tiene: **datos propios y verificables.**

| Formato | Frecuencia | Dónde |
|---|---|---|
| **Informe de CLV semanal** | Semanal | X, Telegram público, LinkedIn |
| **Análisis del backtest** | Puntual, alto impacto | Reddit, blog, foros |
| **"Por qué el ROI engaña"** con tus 3 muestras | Puntual | Todos lados. Es viral en nichos técnicos. |
| **Resultado diario, ganado o perdido** | Diaria | Telegram público |
| **Desmontar a un tipster con ROI imposible** | Ocasional | Genera debate y enlaces |

**El activo con más potencial de enlaces:** el estudio de los 15.000 partidos.
Un análisis abierto sobre dónde vive el valor en el 1X2, con metodología
publicada y datos reproducibles, es contenido que se cita. Ningún afiliado lo
va a producir porque no tiene el modelo.

---

## 5. Colaboraciones: cómo elegir

La mayoría de "recomendadores de apuestas" con audiencia grande viven de
afiliación de casas. Su interés es que apuestes mucho, no que ganes. Asociarte
con ellos contamina tu posicionamiento entero.

**Filtro antes de colaborar con alguien:**

| Señal | Verdicto |
|---|---|
| Publica su CLV | ✅ Habla tu idioma |
| Publica los picks perdedores | ✅ Colaboración posible |
| Sólo enseña capturas de ganadas | ❌ Descarta |
| "ROI +300% este mes" | ❌ Descarta e ignora |
| Vende "método infalible" | ❌ Descarta |
| Analista de datos deportivos sin picks | ✅ El mejor perfil: audiencia técnica |

**Formato de colaboración que funciona:** intercambio de contenido, no de
publicidad. Le das tu análisis del backtest para su canal, él te da un análisis
suyo. Ambos ganáis audiencia cualificada. Cero coste.

---

## 6. Calendario de arranque (12 semanas, $0)

| Semanas | Foco |
|---|---|
| **1-2** | Crear canal público. Publicar picks del backtest histórico como demostración, marcados claramente como backtest. Bot funcionando. |
| **3-4** | Publicar el estudio del backtest en r/algobetting y foros. Primer informe de CLV. |
| **5-8** | Ritmo diario en el canal público. Contactar 5-10 analistas para intercambio. Search Console vigilando indexación. |
| **9-12** | Con 300+ picks liquidados, abrir el pago. El canal público ya tiene audiencia que ha visto el track record construirse en directo. |

**El punto clave:** durante 8 semanas no vendes nada. Construyes la prueba en
público. Cuando abras el pago, la conversión será mucho más alta que empujando
un producto sin historial — y no habrás gastado un dólar en adquisición.

---

## 7. Cumplimiento en Telegram

Telegram es laxo, pero las reglas de publicidad de tu jurisdicción te siguen
aplicando:

- Descripción del canal con **+18** y aviso de juego responsable.
- Sin promesas de ganancias en el nombre ni en la descripción del canal.
- Enlace a recursos de ayuda fijado en el canal.
- Baja instantánea: nadie retenido en un canal de pago tras cancelar.
- Sin mensajes privados automáticos a quien deja de pagar.
