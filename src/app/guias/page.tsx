import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guías de apuestas basadas en matemáticas",
  description:
    "CLV, vig, criterio de Kelly y value betting explicados sin humo. Los conceptos que separan a un apostador con ventaja de uno que va a perder.",
  alternates: { canonical: "/guias" },
};

export default function GuiasIndex() {
  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-bold tracking-tight">Guías</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Los conceptos que hacen que apostar sea una decisión de inversión y no
        una corazonada. Sin trucos, sin sistemas infalibles.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => (
          <Link key={g.slug} href={`/guias/${g.slug}`} className="card p-6 transition hover:border-accent/50">
            <h2 className="text-lg font-bold leading-snug">{g.h1}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{g.description}</p>
            <span className="mt-4 inline-block text-sm text-accent">Leer →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
