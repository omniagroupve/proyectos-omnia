// ═══════════════════════════════════════════════════════════════════════════
// /preguntas · la página que responden los buscadores por nosotros
// ═══════════════════════════════════════════════════════════════════════════
//
// Sirve a dos públicos a la vez:
//
//  · Google, con datos estructurados FAQPage, que es lo que habilita los
//    resultados enriquecidos y el bloque «Otras preguntas de los usuarios».
//  · ChatGPT, Perplexity y AI Overviews, que citan casi literalmente respuestas
//    cortas y autocontenidas. Por eso cada respuesta se entiende sola, sin
//    haber leído las anteriores, y lleva sus cifras dentro.
//
// Las respuestas son largas a propósito: un párrafo de 40 palabras se cita
// mejor que una frase suelta, y contestar de verdad es lo que hace que quien
// llega desde una respuesta generada se quede.

import Link from "next/link";
import { LEAGUES } from "@/lib/config";

export const revalidate = 86400;

export const metadata = {
  title: "Preguntas frecuentes sobre predicciones deportivas con IA",
  description:
    "Cómo funciona Pix, qué es el CLV, por qué no prometemos aciertos, en qué se diferencia de un tipster y si es legal. Respuestas directas, con los números del modelo.",
  alternates: { canonical: "/preguntas" },
};

interface QA {
  q: string;
  a: string[];
}

/**
 * Orden deliberado: primero lo que pregunta alguien que acaba de llegar y no
 * sabe qué somos, después lo técnico, y al final lo legal.
 */
const PREGUNTAS: QA[] = [
  {
    q: "¿Qué es Pix?",
    a: [
      "Pix es una app de predicciones deportivas con inteligencia artificial. Calcula la probabilidad real de cada partido y la compara con las cuotas que pagan más de 40 casas de apuestas, para señalar los casos en los que la cuota está por encima de lo que la jugada vale de verdad.",
      "No es una casa de apuestas: Pix no acepta apuestas, no procesa dinero y no custodia fondos de nadie. Arma el análisis y el boleto lo juegas tú en el operador que prefieras.",
    ],
  },
  {
    q: "¿Cómo predice Pix los partidos?",
    a: [
      "Primero le quita a cada casa su margen por separado —lo que se llama de-vigar— y sólo después promedia, dando más peso a las casas que mueven el mercado, como Pinnacle o Betfair, que a una casa recreativa. Ese consenso limpio es la probabilidad del mercado.",
      "En paralelo, un modelo propio de tipo Dixon-Coles calcula la probabilidad exacta de los 121 marcadores posibles de un partido de fútbol, del 0-0 al 10-10. No son simulaciones al azar: es la distribución completa.",
      "Las dos probabilidades se mezclan, con el modelo propio pesando como mucho un 35% y menos cuanto más se aleja del mercado. El motivo es medido: el mercado tiene un log loss de 0.946 frente a 1.090 de la frecuencia base, o sea que es un predictor muy bueno y llevarle la contraria suele salir caro.",
    ],
  },
  {
    q: "¿Qué es el CLV y por qué Pix lo pone por delante del porcentaje de aciertos?",
    a: [
      "El CLV, o Closing Line Value, mide si la cuota que tomaste era mejor que la cuota a la que el mercado cerró ese partido. Si tomaste 2.10 y cerró en 1.95, ganaste valor aunque el partido lo pierdas.",
      "Importa porque la cuota de cierre es el precio más informado que existe: incorpora las alineaciones, las lesiones y todo el dinero que entró. Batirla de forma sistemática es la única señal fiable de que el método funciona.",
      "El porcentaje de aciertos y el ROI, en cambio, con pocas apuestas son ruido. En el backtest de Pix el ROI cambió de signo dos veces al ampliar la muestra: +29%, luego −10%, luego +9.7%. Por eso publicamos el CLV y no prometemos aciertos.",
    ],
  },
  {
    q: "¿Qué resultados tiene el modelo?",
    a: [
      "Sobre un backtest de 207 partidos reales con cuotas de cierre históricas: CLV medio de +3.81% y el 83% de las predicciones batieron la cuota de cierre. El grupo de control, que consiste en apostar todos los partidos sin filtro de valor, dio −4.94% en la misma muestra.",
      "Es una muestra corta y lo decimos claro: sirve para ver que el método tiene señal, no para proyectar cuánto se gana. El historial público en vivo es el que hay que mirar, y se construye solo con el tiempo.",
    ],
  },
  {
    q: "¿Pix garantiza que voy a ganar dinero?",
    a: [
      "No, y desconfía de quien lo diga. Ninguna herramienta puede garantizar el resultado de un partido. Lo que Pix puede hacer es identificar cuándo una cuota paga más de lo que la jugada vale, que es lo único que a largo plazo juega a tu favor.",
      "Hasta una apuesta con valor pierde a menudo. La diferencia se ve en cientos de apuestas, no en una tarde.",
    ],
  },
  {
    q: "¿En qué se diferencia Pix de un tipster?",
    a: [
      "En que puedes comprobarlo. Cada predicción queda registrada con la hora exacta de publicación, la cuota tomada y la casa que la pagaba. Cuando el partido termina se guarda la cuota de cierre y se calcula el CLV de forma automática.",
      "Las predicciones que fallan se publican igual. No hay selección manual de resultados ni se edita el historial hacia atrás, que es exactamente lo que hace imposible verificar a un tipster de redes sociales.",
    ],
  },
  {
    q: "¿Hay que pagar para usar Pix?",
    a: [
      "No. El constructor de parlays, la calculadora de valor y el historial completo son gratis y no piden registro. Puedes comprobar si el método te convence antes de dar un correo.",
      "Los planes de pago adelantan las predicciones al momento en que se publican, que es cuando la cuota todavía tiene el valor detectado. En el plan gratuito llegan con tres horas de retraso, para entonces el mercado ya corrigió. El plan de pago no mejora la predicción: la adelanta.",
    ],
  },
  {
    q: "¿Qué deportes y ligas cubre?",
    a: [
      `Actualmente ${LEAGUES.length} competiciones. Fútbol de LatAm —Liga MX, Liga Profesional Argentina, Brasileirão, Liga BetPlay, Primera de Chile, Liga 1 de Perú, Libertadores y Sudamericana—, las grandes ligas europeas, y deportes de Estados Unidos: NBA, NFL, MLB, NHL y UFC.`,
      "La cobertura está pensada para que siempre haya algo jugándose a cualquier hora, incluida la madrugada latinoamericana.",
    ],
  },
  {
    q: "¿Qué es un parlay y por qué Pix no repite partido dentro de uno?",
    a: [
      "Un parlay o combinada junta varias selecciones en un solo boleto: si todas aciertan, las cuotas se multiplican; si falla una, se pierde todo.",
      "Pix nunca mete dos selecciones del mismo partido porque la probabilidad conjunta se calcula multiplicando las de cada pierna, y eso sólo es válido si son independientes. Dos apuestas al mismo partido están correlacionadas, así que multiplicarlas da un número falso, y casi siempre demasiado optimista.",
    ],
  },
  {
    q: "¿Cuánto debería apostar en cada jugada?",
    a: [
      "Pix sugiere el tamaño con el criterio de Kelly fraccionado al 0.25, con un tope de 5 unidades por apuesta. Kelly completo maximiza el crecimiento teórico pero tiene oscilaciones que casi nadie aguanta en la práctica; usar una cuarta parte reduce muchísimo la variación a cambio de muy poco crecimiento.",
      "Es una sugerencia calculada, no una instrucción. Nunca apuestes dinero que no puedas permitirte perder.",
    ],
  },
  {
    q: "¿Es legal usar Pix?",
    a: [
      "Pix ofrece información y análisis, que es legal. Lo que cambia según el país es la legalidad de apostar y qué operadores tienen licencia donde vives: comprueba las normas de tu jurisdicción antes de jugar.",
      "El servicio es sólo para mayores de 18 años. Si el juego ha dejado de ser un entretenimiento para ti, en la página de juego responsable están los recursos de ayuda.",
    ],
  },
];

export default function PreguntasPage() {
  // Datos estructurados: es lo que convierte esta página en un resultado
  // enriquecido y lo que leen los motores generativos.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PREGUNTAS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a.join(" ") },
    })),
  };

  return (
    <div className="container-x py-12 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-12 max-w-2xl">
        <div className="label mb-3">Preguntas frecuentes</div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Todo lo que suelen preguntar
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Sin rodeos y con los números del modelo. Si algo no está aquí, está en
          las <Link href="/guias" className="text-accent hover:underline">guías</Link>.
        </p>
      </header>

      <div className="max-w-3xl space-y-8">
        {PREGUNTAS.map(({ q, a }) => (
          <section key={q} className="card p-6">
            <h2 className="text-lg font-semibold leading-snug">{q}</h2>
            <div className="mt-3 space-y-3">
              {a.map((p, i) => (
                <p key={i} className="leading-relaxed text-muted">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="card mt-12 max-w-3xl border-accent/40 bg-accent/5 p-6">
        <h2 className="font-semibold">Pruébalo en un minuto</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          La forma más rápida de entender si esto te sirve es armar un parlay y
          ver qué dice. Es gratis y no pide registro.
        </p>
        <Link href="/armar" className="btn-primary mt-4 inline-flex">
          Armar mi parlay
        </Link>
      </div>
    </div>
  );
}
