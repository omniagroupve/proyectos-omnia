// ═══════════════════════════════════════════════════════════════════════════
// /predicciones/[pais] · una página por país
// ═══════════════════════════════════════════════════════════════════════════
//
// SEO geográfico. Quien busca «predicciones deportivas con IA México» no
// quiere la portada genérica: quiere ver la Liga MX. Cada país tiene su URL,
// su título, sus competiciones y su texto.
//
// No son páginas clonadas con el nombre cambiado —eso Google lo penaliza como
// contenido duplicado— sino que cada una lista de verdad las ligas de ese
// país y explica cuándo se juega en su huso horario.

import Link from "next/link";
import { notFound } from "next/navigation";
import { PAISES, paisPorSlug, ligasDePais } from "@/lib/paises";
import { LEAGUES } from "@/lib/config";

export const revalidate = 86400;

export function generateStaticParams() {
  return PAISES.map((p) => ({ pais: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ pais: string }> }) {
  const { pais } = await params;
  const p = paisPorSlug(pais);
  if (!p) return {};
  return {
    title: `Predicciones deportivas con IA en ${p.nombre}`,
    description:
      `Predicciones con inteligencia artificial para ${p.gancho} y ${LEAGUES.length} competiciones más. ` +
      `Comparamos las cuotas de 40+ casas y te decimos dónde pagan por encima de lo que vale. Gratis, sin registro.`,
    alternates: { canonical: `/predicciones/${p.slug}` },
    openGraph: { title: `Predicciones deportivas con IA en ${p.nombre}`, locale: "es_ES" },
  };
}

export default async function PaisPage({ params }: { params: Promise<{ pais: string }> }) {
  const { pais } = await params;
  const p = paisPorSlug(pais);
  if (!p) notFound();

  const { locales, resto } = ligasDePais(p.codigo);

  // Migas de pan: ayudan a Google a entender la jerarquía y salen en el
  // resultado de búsqueda debajo del título.
  const migas = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "/" },
      { "@type": "ListItem", position: 2, name: "Predicciones por país", item: "/predicciones" },
      { "@type": "ListItem", position: 3, name: p.nombre },
    ],
  };

  return (
    <div className="container-x py-12 md:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(migas) }} />

      <nav aria-label="Migas de pan" className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-white">Inicio</Link>
        {" · "}
        <Link href="/predicciones" className="hover:text-white">Países</Link>
        {" · "}
        <span className="text-white">{p.nombre}</span>
      </nav>

      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Predicciones deportivas con IA
          <br />
          <span className="text-accent">en {p.nombre}</span>
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Pix calcula la probabilidad real de cada partido de {p.gancho} y la
          compara con lo que pagan más de 40 casas de apuestas. Cuando una
          cuota está por encima de lo que la jugada vale, te lo dice.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{p.husoNota}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/armar" className="btn-primary">Armar un parlay gratis</Link>
          <Link href="/rendimiento" className="btn-ghost">Ver el historial</Link>
        </div>
      </header>

      {locales.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">Competiciones de {p.nombre}</h2>
          <div className="flex flex-wrap gap-2">
            {locales.map((l) => (
              <Link
                key={l.slug}
                href={`/pronosticos/${l.slug}`}
                className="card px-4 py-2 text-sm transition hover:border-accent/60"
              >
                {l.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">
          Lo que también se sigue desde {p.nombre}
        </h2>
        <div className="flex flex-wrap gap-2">
          {resto.map((l) => (
            <Link
              key={l.slug}
              href={`/pronosticos/${l.slug}`}
              className="card px-4 py-2 text-sm text-muted transition hover:border-accent/60 hover:text-white"
            >
              {l.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-semibold">Cómo se calcula</h2>
          <p className="text-sm leading-relaxed text-muted">
            A cada casa se le quita su margen por separado y después se
            promedia, pesando más a las que mueven el mercado. Encima, un
            modelo propio calcula la probabilidad de los 121 marcadores
            posibles del partido.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-semibold">Todo queda registrado</h2>
          <p className="text-sm leading-relaxed text-muted">
            Cada predicción se publica con su hora y su cuota, y al acabar el
            partido se calcula el CLV automáticamente. Las que fallan se
            publican igual.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-semibold">Antes de jugar</h2>
          <p className="text-sm leading-relaxed text-muted">
            Pix analiza cuotas: no acepta apuestas ni mueve dinero. Comprueba
            qué operadores tienen licencia en {p.nombre} antes de jugar. Sólo
            para mayores de 18 años.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">Otros países</h2>
        <div className="flex flex-wrap gap-2">
          {PAISES.filter((o) => o.slug !== p.slug).map((o) => (
            <Link
              key={o.slug}
              href={`/predicciones/${o.slug}`}
              className="card px-4 py-2 text-sm text-muted transition hover:border-accent/60 hover:text-white"
            >
              {o.nombre}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
