import type { Metadata } from "next";
import Link from "next/link";
import ValueCalculator from "@/components/ValueCalculator";
import { Reveal } from "@/components/Motion";

export const metadata: Metadata = {
  title: "Calculadora de valor esperado y Kelly",
  description:
    "Calcula el valor esperado de una apuesta, la cuota justa y el stake óptimo con criterio de Kelly. Gratis y sin registro.",
  keywords: [
    "calculadora valor esperado apuestas",
    "calculadora kelly apuestas",
    "probabilidad implicita cuota",
    "calcular valor apuesta",
  ],
  alternates: { canonical: "/herramientas/calculadora-valor" },
};

const FAQ = [
  {
    q: "¿Cómo sé la probabilidad real?",
    a: "Coge las cuotas de una casa de margen bajo (Pinnacle, Betfair Exchange) y quítales el margen. La segunda pestaña lo hace por ti.",
  },
  {
    q: "¿Por qué el stake es tan bajo?",
    a: "Usa un cuarto del criterio de Kelly. Kelly completo asume que tu estimación de probabilidad es exacta; nunca lo es. El cuarto conserva el 75% del crecimiento con la mitad de volatilidad.",
  },
  {
    q: "Casi nunca sale valor. ¿Está rota?",
    a: "No. Lo normal es que no haya valor: para eso existe el margen de la casa. Encontrar las que sí lo tienen exige comparar decenas de operadores en tiempo real.",
  },
];

export default function CalculadoraPage() {
  return (
    <div className="container-x max-w-5xl py-14">
      <nav className="mb-5 text-sm text-muted">
        <Link href="/" className="hover:text-accent">Inicio</Link>
        <span className="mx-2">/</span>
        <span className="text-white">Calculadora</span>
      </nav>

      <Reveal>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Calculadora de valor
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted">
          Cuota, probabilidad, bankroll. Te dice si merece la pena y cuánto poner.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <ValueCalculator />
      </Reveal>

      <Reveal delay={120}>
        <section className="mt-14 max-w-3xl">
          <h2 className="mb-5 text-xl font-bold">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="mr-2 inline-block text-accent transition group-open:rotate-90">›</span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-5 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </Reveal>

      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link href="/guias/value-betting-que-es" className="card card-hover p-5">
          <div className="label">Guía</div>
          <div className="mt-1 font-semibold">Qué es el value betting</div>
        </Link>
        <Link href="/guias/criterio-de-kelly-gestion-de-bankroll" className="card card-hover p-5">
          <div className="label">Guía</div>
          <div className="mt-1 font-semibold">Criterio de Kelly</div>
        </Link>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
