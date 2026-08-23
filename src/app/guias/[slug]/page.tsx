import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "@/lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: `/guias/${g.slug}` },
    openGraph: { title: g.title, description: g.description, type: "article" },
  };
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();

  return (
    <article className="container-x max-w-3xl py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/guias" className="hover:text-accent">Guías</Link>
      </nav>

      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{g.h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{g.description}</p>

      <div className="mt-12 space-y-10">
        {g.body.map((s) => (
          <section key={s.h2}>
            <h2 className="text-xl font-bold">{s.h2}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="mt-3 leading-relaxed text-white/85">{p}</p>
            ))}
          </section>
        ))}
      </div>

      <div className="card mt-14 border-accent/40 bg-accent/5 p-6 text-center">
        <p className="text-sm text-muted">
          Aplicamos todo esto automáticamente sobre 20+ competiciones y
          publicamos el resultado, acierte o falle.
        </p>
        <Link href="/rendimiento" className="btn-primary mt-4">Ver el track record</Link>
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-lg font-bold">Otras guías</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDES.filter((x) => x.slug !== g.slug).map((x) => (
            <Link key={x.slug} href={`/guias/${x.slug}`} className="card p-4 text-sm transition hover:border-accent/50">
              {x.h1}
            </Link>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.h1,
            description: g.description,
            dateModified: g.updated,
            author: { "@type": "Organization", name: process.env.NEXT_PUBLIC_BRAND ?? "Omnia Picks" },
          }),
        }}
      />
    </article>
  );
}
