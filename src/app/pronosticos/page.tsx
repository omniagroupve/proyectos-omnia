import type { Metadata } from "next";
import Link from "next/link";
import { SEO_LEAGUES } from "@/lib/config";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";

interface UpcomingEvent {
  id: string;
  home_team: string;
  away_team: string;
  league_slug: string;
  slug: string;
  commence_time: string;
  sport_title: string;
}

async function getUpcoming(): Promise<UpcomingEvent[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = supabasePublic();
    const { data } = await sb
      .from("events")
      .select("id, home_team, away_team, league_slug, slug, commence_time, sport_title")
      .gte("commence_time", new Date().toISOString())
      .order("commence_time")
      .limit(24);
    return (data ?? []) as UpcomingEvent[];
  } catch {
    return [];
  }
}

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Pronósticos deportivos de hoy",
  description:
    "Pronósticos y análisis de cuotas para LaLiga, Champions, Premier, Liga MX, NBA, NFL y 15 competiciones más. Actualizado cada 2 horas.",
  alternates: { canonical: "/pronosticos" },
};

export default async function PronosticosIndex() {
  const upcoming = await getUpcoming();

  const groups = new Map<string, typeof SEO_LEAGUES>();
  for (const l of SEO_LEAGUES) {
    groups.set(l.group, [...(groups.get(l.group) ?? []), l]);
  }

  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-bold tracking-tight">Pronósticos deportivos</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Análisis de cuotas y valor esperado para cada partido, generado
        automáticamente a partir del consenso de más de 40 casas de apuestas.
      </p>

      {upcoming.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Próximos partidos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <Link
                key={e.id}
                href={`/pronosticos/${e.league_slug}/${e.slug}`}
                className="card p-4 transition hover:border-accent/50"
              >
                <div className="label">{e.sport_title}</div>
                <div className="mt-1.5 font-semibold leading-snug">
                  {e.home_team} vs {e.away_team}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {new Date(e.commence_time).toLocaleString("es", {
                    weekday: "short", day: "2-digit", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14 space-y-10">
        {[...groups.entries()].map(([group, leagues]) => (
          <div key={group}>
            <h2 className="mb-4 text-xl font-bold">{group}</h2>
            <div className="flex flex-wrap gap-2">
              {leagues.map((l) => (
                <Link
                  key={l.slug}
                  href={`/pronosticos/${l.slug}`}
                  className="rounded-lg border border-line bg-panel px-4 py-2.5 text-sm transition hover:border-accent/50 hover:text-accent"
                >
                  {l.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
