import Link from "next/link";
import { PAISES, ligasDePais } from "@/lib/paises";

export const revalidate = 86400;

export const metadata = {
  title: "Predicciones deportivas con IA por país",
  description:
    "Elige tu país y mira las predicciones con inteligencia artificial de tus ligas: México, Argentina, Colombia, Chile, Perú, Venezuela, Brasil y España.",
  alternates: { canonical: "/predicciones" },
};

export default function PaisesPage() {
  return (
    <div className="container-x py-12 md:py-16">
      <header className="mb-10 max-w-2xl">
        <div className="label mb-3">Por país</div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Elige dónde juegas
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Las mismas predicciones, ordenadas por las competiciones que
          realmente sigues en tu país.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAISES.map((p) => {
          const { locales } = ligasDePais(p.codigo);
          return (
            <Link
              key={p.slug}
              href={`/predicciones/${p.slug}`}
              className="card card-hover p-5 transition hover:border-accent/60"
            >
              <div className="font-semibold">{p.nombre}</div>
              <div className="mt-1 text-xs text-muted">
                {locales.length > 0
                  ? locales.map((l) => l.name).join(" · ")
                  : "Ligas internacionales"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
