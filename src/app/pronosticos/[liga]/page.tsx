import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leagueBySlug, SEO_LEAGUES } from "@/lib/config";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";

interface EventRow {
  id: string;
  home_team: string;
  away_team: string;
  slug: string;
  commence_time: string;
  home_score?: number | null;
  away_score?: number | null;
}

async function getLeagueEvents(liga: string) {
  const empty = { upcoming: [] as EventRow[], past: [] as EventRow[] };
  if (!isSupabaseConfigured()) return empty;

  try {
    const sb = supabasePublic();
    const now = new Date().toISOString();
    const [upcoming, past] = await Promise.all([
      sb.from("events")
        .select("id, home_team, away_team, slug, commence_time")
        .eq("league_slug", liga).gte("commence_time", now)
        .order("commence_time").limit(40),
      sb.from("events")
        .select("id, home_team, away_team, slug, commence_time, home_score, away_score")
        .eq("league_slug", liga).eq("completed", true)
        .order("commence_time", { ascending: false }).limit(20),
    ]);
    return {
      upcoming: (upcoming.data ?? []) as EventRow[],
      past: (past.data ?? []) as EventRow[],
    };
  } catch {
    return empty;
  }
}

export const revalidate = 1800;

// Pre-generamos las ligas SEO en build: entran al índice más rápido.
export function generateStaticParams() {
  return SEO_LEAGUES.map((l) => ({ liga: l.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ liga: string }> }
): Promise<Metadata> {
  const { liga } = await params;
  const l = leagueBySlug(liga);
  if (!l) return {};

  return {
    title: `Pronósticos ${l.name} · cuotas y análisis`,
    description: `Pronósticos de ${l.name} para los próximos partidos: análisis de cuotas, valor esperado y comparativa entre casas de apuestas. Actualizado cada 2 horas.`,
    alternates: { canonical: `/pronosticos/${l.slug}` },
    openGraph: {
      title: `Pronósticos ${l.name}`,
      description: `Análisis de cuotas y valor para ${l.name}.`,
    },
  };
}

export default async function LigaPage({
  params,
}: {
  params: Promise<{ liga: string }>;
}) {
  const { liga } = await params;
  const league = leagueBySlug(liga);
  if (!league) notFound();

  const { upcoming, past } = await getLeagueEvents(liga);

  return (
    <div className="container-x py-14">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/pronosticos" className="hover:text-accent">Pronósticos</Link>
        <span className="mx-2">/</span>
        <span className="text-white">{league.name}</span>
      </nav>

      <h1 className="text-4xl font-bold tracking-tight">
        Pronósticos {league.name}
      </h1>
      <p className="mt-4 max-w-3xl leading-relaxed text-muted">
        Analizamos cada partido de {league.name} comparando las cuotas de más de
        40 casas de apuestas. Eliminamos el margen del operador para calcular la
        probabilidad real de cada resultado y señalamos dónde el precio ofrecido
        está por encima de ese valor. Todos los análisis se actualizan
        automáticamente cada dos horas hasta el inicio del encuentro.
      </p>

      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">Próximos partidos</h2>
        {!upcoming.length ? (
          <div className="card p-6 text-sm text-muted">
            No hay partidos programados. Vuelve cuando arranque la jornada.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <Link
                key={e.id}
                href={`/pronosticos/${liga}/${e.slug}`}
                className="card flex items-center justify-between p-4 transition hover:border-accent/50"
              >
                <div>
                  <div className="font-semibold">{e.home_team} vs {e.away_team}</div>
                  <div className="mt-1 text-xs text-muted">
                    {new Date(e.commence_time).toLocaleString("es", {
                      weekday: "long", day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
                <span className="text-accent">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Resultados recientes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((e) => (
              <Link
                key={e.id}
                href={`/pronosticos/${liga}/${e.slug}`}
                className="card flex items-center justify-between p-4 transition hover:border-accent/40"
              >
                <span className="text-sm">{e.home_team} vs {e.away_team}</span>
                <span className="font-mono font-semibold tabular-nums">
                  {e.home_score}–{e.away_score}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-bold">Otras competiciones</h2>
        <div className="flex flex-wrap gap-2">
          {SEO_LEAGUES.filter((l) => l.slug !== liga).map((l) => (
            <Link
              key={l.slug}
              href={`/pronosticos/${l.slug}`}
              className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-muted transition hover:border-accent/50 hover:text-accent"
            >
              {l.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
