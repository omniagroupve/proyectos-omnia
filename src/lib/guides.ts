// ═══════════════════════════════════════════════════════════════════════════
// CONTENIDO PILAR · captura búsqueda informacional y construye autoridad
// ═══════════════════════════════════════════════════════════════════════════
//
// Las páginas de partido capturan intención transaccional pero caducan.
// Estas guías capturan intención informacional, no caducan nunca y son las
// que Google usa para decidir si tu dominio sabe del tema (E-E-A-T).
//
// Además hacen algo más importante: educan al visitante en el vocabulario
// (CLV, vig, Kelly) que hace que tu producto tenga sentido. Un lector que
// entiende qué es el CLV es un lector que puede convertirse en cliente de $197.

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  updated: string;
  body: { h2: string; p: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "que-es-el-clv-en-apuestas",
    title: "Qué es el CLV en apuestas y por qué es la única métrica que importa",
    h1: "CLV (Closing Line Value): la métrica que separa suerte de habilidad",
    description:
      "El CLV compara tu cuota con la cuota de cierre del mercado. Explicamos qué es, cómo se calcula y por qué predice tus resultados mejor que el ROI.",
    keywords: ["clv apuestas", "closing line value", "que es clv", "cuota de cierre"],
    updated: "2026-01-15",
    body: [
      {
        h2: "Qué es exactamente el CLV",
        p: [
          "El CLV, o Closing Line Value, mide la diferencia entre la cuota a la que apostaste y la cuota a la que ese mismo mercado cerró justo antes de empezar el evento. Si cogiste el 2.10 y el mercado cerró en 1.95, tu CLV es de +7.7%.",
          "La fórmula es simple: CLV = (cuota_tomada / cuota_cierre - 1) × 100.",
        ],
      },
      {
        h2: "Por qué importa más que el ROI",
        p: [
          "La cuota de cierre es el precio más eficiente que existe en un mercado deportivo. Refleja toda la información disponible: alineaciones, lesiones de última hora, condiciones del terreno y, sobre todo, el dinero de los apostadores mejor informados del mundo.",
          "Si de forma sistemática coges cuotas mejores que el cierre, significa que estás detectando información antes que el mercado. Eso no puede ser suerte sostenida.",
          "El ROI, en cambio, tarda muchísimo en volverse fiable. Con 200 apuestas puedes tener un ROI de +25% siendo un apostador mediocre, o de -10% teniendo una ventaja real. La varianza domina. El CLV converge mucho antes porque no depende de si el balón entró.",
        ],
      },
      {
        h2: "Qué CLV es bueno",
        p: [
          "Un CLV medio positivo, por pequeño que sea, ya es señal de ventaja. Entre +1% y +2% de media sostenida a lo largo de cientos de apuestas es el rango de un apostador ganador profesional.",
          "Igual de útil es el porcentaje de apuestas que baten el cierre. Por encima del 55% indica un proceso con ventaja real; alrededor del 50% indica que estás replicando el mercado sin aportar nada.",
        ],
      },
      {
        h2: "Cómo usarlo en la práctica",
        p: [
          "Registra la cuota de cierre de todas tus apuestas, ganadas y perdidas. Si tu CLV es positivo y llevas una racha mala, el proceso funciona y la varianza se corregirá. Si tu CLV es negativo y vas ganando, disfrútalo pero no aumentes stakes: esa ventaja no existe.",
          "Cualquier servicio de pronósticos que no publique su CLV te está pidiendo que confíes en su ROI. Y el ROI de una muestra pequeña no demuestra nada.",
        ],
      },
    ],
  },
  {
    slug: "que-es-el-vig-y-como-quitarlo",
    title: "Qué es el vig (margen de la casa) y cómo calcular la probabilidad real",
    h1: "El vig: por qué las cuotas mienten sobre la probabilidad",
    description:
      "Las probabilidades implícitas de un mercado suman más del 100%. Ese exceso es el margen de la casa. Aprende a eliminarlo para saber la probabilidad real.",
    keywords: ["vig apuestas", "margen casa apuestas", "overround", "probabilidad implicita"],
    updated: "2026-01-15",
    body: [
      {
        h2: "El error que comete casi todo el mundo",
        p: [
          "Una cuota de 2.00 parece decir 50%. No lo dice. Si sumas las probabilidades implícitas de todas las opciones de un mercado, el resultado es mayor que 100%: puede ser 104%, 107% o más.",
          "Ese exceso sobre 100 es el vig, el margen que la casa cobra por operar. Y mientras no lo elimines, absolutamente todas las apuestas parecerán tener valor cuando en realidad ninguna lo tiene.",
        ],
      },
      {
        h2: "Los tres métodos para eliminarlo",
        p: [
          "Multiplicativo: divides cada probabilidad implícita entre la suma total. Es el más rápido pero asume que la casa carga el mismo margen a favoritos y a underdogs, lo cual es falso.",
          "Power: buscas el exponente k que hace que la suma de las probabilidades elevadas a k sea exactamente 1. Al ser k mayor que 1, penaliza más las cuotas altas, que es justo donde las casas cargan más margen.",
          "Shin: modela qué proporción del dinero apostado viene de gente con información privilegiada. Es el que mejor replica los precios de cierre según la literatura académica, y el que usamos por defecto para mercados de dos y tres vías.",
        ],
      },
      {
        h2: "Qué margen es normal",
        p: [
          "Las casas de margen bajo, que aceptan a apostadores ganadores, operan entre el 2% y el 3% en mercados principales. Las casas recreativas se mueven entre el 5% y el 8%, y en mercados secundarios o apuestas combinadas superan fácilmente el 15%.",
          "Consecuencia práctica: buscar la mejor cuota entre varias casas no es una optimización menor. Es la diferencia entre tener ventaja y no tenerla.",
        ],
      },
    ],
  },
  {
    slug: "criterio-de-kelly-gestion-de-bankroll",
    title: "Criterio de Kelly: cuánto apostar en cada apuesta",
    h1: "Criterio de Kelly y gestión de bankroll",
    description:
      "Kelly calcula la fracción óptima del bankroll para cada apuesta. Explicamos la fórmula, por qué nadie usa Kelly completo y qué fracción usar en la práctica.",
    keywords: ["criterio de kelly", "gestion de bankroll", "cuanto apostar", "stake apuestas"],
    updated: "2026-01-15",
    body: [
      {
        h2: "La fórmula",
        p: [
          "f* = (b × p − q) / b, donde b es la cuota decimal menos 1, p es la probabilidad real de ganar y q es 1 − p.",
          "Ejemplo: cuota 2.50 (b = 1.5) con probabilidad real del 45%. f* = (1.5 × 0.45 − 0.55) / 1.5 = 0.083, es decir el 8.3% del bankroll.",
        ],
      },
      {
        h2: "Por qué nadie apuesta Kelly completo",
        p: [
          "Kelly maximiza el crecimiento del capital a largo plazo, pero asume que tu estimación de la probabilidad es exacta. Nunca lo es. Y el coste del error no es simétrico: sobreestimar tu ventaja te lleva a la ruina mucho más rápido de lo que subestimarla te frena.",
          "Con Kelly completo, caídas del 50% del bankroll son estadísticamente esperables incluso teniendo ventaja real. Muy poca gente aguanta eso psicológicamente.",
        ],
      },
      {
        h2: "Kelly fraccionado: el estándar real",
        p: [
          "La práctica habitual es usar un cuarto de Kelly (0.25) o la mitad (0.5). Un cuarto de Kelly conserva alrededor del 75% del crecimiento esperado reduciendo la volatilidad a la mitad. Es el mejor intercambio disponible.",
          "En nuestro modelo usamos 0.25 con un tope duro de 5 unidades por apuesta. Ninguna apuesta individual merece más riesgo, por muy evidente que parezca el valor.",
        ],
      },
      {
        h2: "Definir tu unidad",
        p: [
          "Una unidad debería ser entre el 0.5% y el 2% de tu bankroll. Con un bankroll de 5.000 dólares y unidad al 1%, una apuesta de 2 unidades son 100 dólares.",
          "Regla práctica sobre suscripciones: si el coste mensual del servicio supera el 5% de tu bankroll, el gasto se come la ventaja. En ese caso lo racional es no pagar.",
        ],
      },
    ],
  },
  {
    slug: "value-betting-que-es",
    title: "Value betting: qué es y cómo encontrar apuestas con valor",
    h1: "Value betting: apostar cuando la cuota paga de más",
    description:
      "El value betting no consiste en acertar más partidos, sino en apostar solo cuando el precio ofrecido supera la probabilidad real. Cómo funciona y cómo detectarlo.",
    keywords: ["value betting", "apuestas de valor", "valor esperado apuestas", "ev positivo"],
    updated: "2026-01-15",
    body: [
      {
        h2: "La idea central",
        p: [
          "Puedes acertar el 70% de tus apuestas y perder dinero. Puedes acertar el 40% y ganarlo. Lo que determina el resultado a largo plazo no es el porcentaje de acierto sino si el precio que te pagaron era superior al riesgo que asumiste.",
          "Hay valor cuando probabilidad_real × cuota > 1. Con una probabilidad real del 52% y una cuota de 2.10, el cálculo da 1.092: por cada 100 apostados esperas recuperar 109.2 a largo plazo.",
        ],
      },
      {
        h2: "De dónde sale el valor",
        p: [
          "No de predecir partidos mejor que el mercado; eso es extraordinariamente difícil y casi nadie lo consigue de forma sostenida.",
          "Sale de las diferencias de precio entre operadores. Las casas recreativas ajustan sus líneas según dónde va el dinero de sus clientes, no según la probabilidad real. Cuando el público carga sobre un equipo popular, la cuota del rival se estira por encima de su valor. Ahí está la ineficiencia.",
        ],
      },
      {
        h2: "Qué hace falta para explotarlo",
        p: [
          "Cuentas en varias casas: la mejor cuota está en un operador distinto cada día. Con tres o cuatro cuentas capturas la mayor parte del valor disponible.",
          "Disciplina de registro: anota cuota tomada, casa, stake y cuota de cierre. Sin datos no puedes distinguir un modelo bueno de una buena racha.",
          "Paciencia con la varianza: rachas de 15 apuestas perdidas seguidas ocurren con ventaja real. El único error grave es cambiar el sistema en mitad de una mala racha.",
        ],
      },
      {
        h2: "El límite: la limitación de cuentas",
        p: [
          "Si ganas de forma sostenida, las casas recreativas te limitarán el importe máximo o te cerrarán la cuenta. Es el coste estructural del value betting y conviene planificarlo desde el principio, no descubrirlo a los seis meses.",
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
