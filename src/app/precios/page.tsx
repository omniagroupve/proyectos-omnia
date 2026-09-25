import type { Metadata } from "next";
import PricingTable from "@/components/PricingTable";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Precios y planes",
  description:
    "Plan gratuito con picks diarios, plan Pro con acceso en tiempo real y plan Elite con props y mercados en vivo. Sin permanencia.",
  alternates: { canonical: "/precios" },
};

const FAQ = [
  {
    q: "¿Garantizan que voy a ganar dinero?",
    a: "No, y desconfía de quien lo garantice. Las apuestas tienen varianza: incluso con ventaja matemática real hay rachas negativas de semanas. Lo que sí garantizamos es que cada pick se publica con fecha y hora, que nunca borramos los perdedores y que el CLV es verificable.",
  },
  {
    q: "¿Qué bankroll necesito?",
    a: "Como regla, la cuota mensual no debería superar el 4-5% de tu bankroll. Para Pro ($197) eso significa unos $5.000. Para Elite ($497), a partir de $25.000. Si tu bankroll es menor, quédate en el plan gratuito: pagar la suscripción te costaría más que el edge que puedes extraer.",
  },
  {
    q: "¿Por qué Elite tiene plazas limitadas?",
    a: "No es escasez artificial. Los picks de Elite son los de mayor ventaja, que suelen estar en mercados con límites bajos. Si demasiada gente apuesta lo mismo, la casa baja la cuota y el edge desaparece para todos. Limitar plazas protege el producto.",
  },
  {
    q: "¿Puedo cancelar cuando quiera?",
    a: "Sí, desde tu panel y en un clic. Al cancelar mantienes el acceso hasta el final del periodo que ya pagaste.",
  },
  {
    q: "¿En qué casas de apuestas necesito cuenta?",
    a: "Cuantas más, mejor. El modelo busca la mejor cuota disponible, y esa cuota está en una casa distinta cada día. Con 3-4 cuentas capturas la mayoría del valor.",
  },
  {
    q: "¿Es legal?",
    a: "Nosotros ofrecemos análisis, no gestionamos apuestas ni dinero. La legalidad de apostar depende de tu país y, en algunos casos, de tu región. Compruébalo antes de operar.",
  },
];

export default async function PreciosPage() {
  const user = await getSessionUser();

  return (
    <>
      <section className="container-x py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Elige tu nivel de acceso
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          El plan gratuito te da el track record completo para que juzgues por ti
          mismo. Solo paga si los números te convencen.
        </p>
      </section>

      <section className="container-x">
        <PricingTable currentTier={user?.tier} />
      </section>

      {/* FAQ con JSON-LD: gana rich snippets y captura long-tail conversacional */}
      <section className="container-x mt-24 max-w-3xl">
        <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">
          Preguntas frecuentes
        </h2>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                <span className="mr-2 text-accent transition group-open:rotate-90 inline-block">›</span>
                {f.q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
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
    </>
  );
}
