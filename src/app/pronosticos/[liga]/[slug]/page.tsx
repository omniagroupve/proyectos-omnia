// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA PROGRAMÁTICA POR PARTIDO · el motor de tráfico orgánico
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta ruta sola genera miles de URLs long-tail sin escribir una línea de
// contenido a mano. Cada partido de cada liga que ingestas = una página que
// puede posicionar para "[equipo A] [equipo B] pronóstico".
//
// LA CLAVE ESTÁ EN EL CICLO DE VIDA:
//   Antes del partido → previa + cuotas + análisis. Capta búsqueda transaccional.
//   Después           → resultado + si el pick acertó. Se vuelve EVERGREEN.
//
// La mayoría de sitios de pronósticos deja morir la página tras el partido.
// Actualizarla con el resultado le da vida útil indefinida, acumula enlaces
// internos y alimenta la autoridad del dominio. Ese es todo el juego.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leagueBySlug } from "@/lib/config";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { devig, edgePct, vigPct } from "@/lib/devig";
import { ENGINE } from "@/lib/config";

export const revalidate = 1800;
export const dynamicParams = true;

interface BookmakerPayload {
  key: string;
  title: string;
  markets: { key: string; outcomes: { name: string; price: number; point?: number }[] }[];
}

interface PickRow {
  selection: string;
  line: number | null;
  market: string;
  odds_taken: number;
  book: string;
  edge_pct: number;
  result: string;
  clv_pct: number | null;
  tier_required: string;
  rationale: string | null;
}

async function getEvent(liga: string, slug: string) {
  if (!isSupabaseConfigured()) return null;

  try {
    const sb = supabasePublic();
    const { data: event } = await sb
      .from("events")
      .select("*")
      .eq("league_slug", liga)
      .eq("slug", slug)
      .single();
    if (!event) return null;

    const [{ data: snap }, { data: picks }] = await Promise.all([
      sb.from("odds_snapshots").select("payload, captured_at")
        .eq("event_id", event.id).order("captured_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("picks")
        .select("selection, line, market, odds_taken, book, edge_pct, result, clv_pct, tier_required, rationale")
        .eq("event_id", event.id),
    ]);

    return { event, snapshot: snap, picks: (picks ?? []) as PickRow[] };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ liga: string; slug: string }> }
): Promise<Metadata> {
  const { liga, slug } = await params;
  const data = await getEvent(liga, slug);
  if (!data) return { title: "Partido no encontrado" };

  const { event } = data;
  const league = leagueBySlug(liga);
  const date = new Date(event.commence_time).toLocaleDateString("es", {
    day: "numeric", month: "long", year: "numeric",
  });

  // El title cambia después del partido: pasa de intención transaccional
  // ("pronóstico") a informacional ("resultado"), que es lo que se busca luego.
  const title = event.completed
    ? `${event.home_team} ${event.home_score}-${event.away_score} ${event.away_team} · resultado y análisis`
    : `${event.home_team} vs ${event.away_team}: pronóstico y cuotas · ${date}`;

  const description = event.completed
    ? `${event.home_team} ${event.home_score}-${event.away_score} ${event.away_team} (${league?.name}). Resultado, análisis de cuotas y cómo se comportó nuestro pronóstico.`
    : `Pronóstico de ${event.home_team} vs ${event.away_team} (${league?.name}, ${date}). Comparativa de cuotas entre casas, probabilidad real sin margen y dónde está el valor.`;

  return {
    title,
    description,
    alternates: { canonical: `/pronosticos/${liga}/${slug}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ liga: string; slug: string }>;
}) {
  const { liga, slug } = await params;
  const data = await getEvent(liga, slug);
  if (!data) notFound();

  const { event, snapshot, picks } = data;
  const league = leagueBySlug(liga);
  const books = (snapshot?.payload ?? []) as BookmakerPayload[];

  // ── Tabla comparativa de cuotas 1X2 ────────────────────────────────────
  const rows = books
    .map((b) => {
      const h2h = b.markets?.find((m) => m.key === "h2h");
      if (!h2h) return null;
      const home = h2h.outcomes.find((o) => o.name === event.home_team)?.price;
      const away = h2h.outcomes.find((o) => o.name === event.away_team)?.price;
      const draw = h2h.outcomes.find((o) => /draw|empate/i.test(o.name))?.price;
      if (!home || !away) return null;
      const prices = draw ? [home, draw, away] : [home, away];
      return { book: b.title, home, draw, away, margin: vigPct(prices) };
    })
    .filter(Boolean)
    .sort((a, b) => a!.margin - b!.margin) as {
      book: string; home: number; draw?: number; away: number; margin: number;
    }[];

  // ── Probabilidad real: consenso de las 5 casas con menor margen ────────
  const sample = rows.slice(0, 5);
  let fair: { home: number; draw: number | null; away: number } | null = null;
  if (sample.length) {
    const acc = { home: 0, draw: 0, away: 0, n: 0, dn: 0 };
    for (const r of sample) {
      const prices = r.draw ? [r.home, r.draw, r.away] : [r.home, r.away];
      const p = devig(prices, ENGINE.devigMethod);
      acc.home += p[0];
      if (r.draw) { acc.draw += p[1]; acc.away += p[2]; acc.dn++; }
      else { acc.away += p[1]; }
      acc.n++;
    }
    fair = {
      home: acc.home / acc.n,
      draw: acc.dn ? acc.draw / acc.dn : null,
      away: acc.away / acc.n,
    };
  }

  const bestHome = rows.length ? Math.max(...rows.map((r) => r.home)) : null;
  const bestAway = rows.length ? Math.max(...rows.map((r) => r.away)) : null;
  const bestDraw = rows.some((r) => r.draw)
    ? Math.max(...rows.filter((r) => r.draw).map((r) => r.draw!))
    : null;

  const fecha = new Date(event.commence_time);

  return (
    <div className="container-x py-12">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/pronosticos" className="hover:text-accent">Pronósticos</Link>
        <span className="mx-2">/</span>
        <Link href={`/pronosticos/${liga}`} className="hover:text-accent">{league?.name}</Link>
      </nav>

      <header>
        <div className="label">
          {league?.name} ·{" "}
          {fecha.toLocaleString("es", {
            weekday: "long", day: "numeric", month: "long",
            hour: "2-digit", minute: "2-digit",
          })}
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {event.home_team} vs {event.away_team}
        </h1>
        {event.completed && (
          <div className="mt-4 inline-flex items-baseline gap-3 rounded-xl border border-line bg-panel px-5 py-3">
            <span className="label">Final</span>
            <span className="font-mono text-2xl font-bold tabular-nums">
              {event.home_score} – {event.away_score}
            </span>
          </div>
        )}
      </header>

      {/* ── Probabilidad real ─────────────────────────────────────────── */}
      {fair && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Probabilidad real estimada</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: event.home_team, p: fair.home, best: bestHome },
              ...(fair.draw !== null ? [{ label: "Empate", p: fair.draw, best: bestDraw }] : []),
              { label: event.away_team, p: fair.away, best: bestAway },
            ].map((x) => {
              const edge = x.best ? edgePct(x.p, x.best) : 0;
              return (
                <div key={x.label} className="card p-5">
                  <div className="label truncate">{x.label}</div>
                  <div className="stat mt-1.5">{(x.p * 100).toFixed(1)}%</div>
                  <div className="mt-2 text-xs text-muted">
                    Cuota justa {(1 / x.p).toFixed(2)} · mejor disponible{" "}
                    <strong className="text-white">{x.best?.toFixed(2) ?? "—"}</strong>
                  </div>
                  {edge >= ENGINE.minEdgePct && (
                    <div className="mt-2 inline-block rounded-md bg-accent/15 px-2 py-1 text-xs font-bold text-accent">
                      +{edge.toFixed(1)}% de valor
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Calculado sobre el consenso de las {sample.length} casas con menor
            margen, eliminando el vig con el método {ENGINE.devigMethod}. La
            &laquo;cuota justa&raquo; es la que pagaría un mercado sin comisión:
            cualquier cuota por encima de ella tiene valor esperado positivo.
          </p>
        </section>
      )}

      {/* ── Nuestro pick ─────────────────────────────────────────────── */}
      {picks.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Nuestro pronóstico</h2>
          {picks.map((p, i) => (
            <div key={i} className="card border-accent/40 p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <div className="label">Selección</div>
                  <div className="font-semibold">
                    {p.selection}
                    {p.line !== null && ` ${Number(p.line) > 0 ? "+" : ""}${p.line}`}
                  </div>
                </div>
                <div>
                  <div className="label">Cuota</div>
                  <div className="font-mono font-semibold">{Number(p.odds_taken).toFixed(2)} · {p.book}</div>
                </div>
                <div>
                  <div className="label">Valor</div>
                  <div className="font-mono font-semibold text-accent">
                    +{Number(p.edge_pct).toFixed(1)}%
                  </div>
                </div>
                {p.result !== "pending" && (
                  <div>
                    <div className="label">Resultado</div>
                    <div className={`font-semibold ${p.result === "win" ? "text-accent" : "text-danger"}`}>
                      {p.result === "win" ? "Acertado" : p.result === "loss" ? "Fallado" : "Nulo"}
                    </div>
                  </div>
                )}
              </div>
              {p.rationale && (
                <p className="mt-4 text-sm leading-relaxed text-muted">{p.rationale}</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* ── Comparativa de cuotas: la tabla que capta el long-tail ───── */}
      {rows.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-2 text-xl font-bold">
            Comparativa de cuotas {event.home_team} vs {event.away_team}
          </h2>
          <p className="mb-4 text-sm text-muted">
            Ordenadas por margen del operador: cuanto más bajo, mejor precio para ti.
          </p>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-line text-left">
                <tr className="label">
                  <th className="p-4">Casa</th>
                  <th className="p-4 text-right">{event.home_team}</th>
                  {bestDraw !== null && <th className="p-4 text-right">Empate</th>}
                  <th className="p-4 text-right">{event.away_team}</th>
                  <th className="p-4 text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.book} className="border-b border-line/50 last:border-0">
                    <td className="p-4 font-medium">{r.book}</td>
                    <td className={`p-4 text-right font-mono tabular-nums ${r.home === bestHome ? "font-bold text-accent" : ""}`}>
                      {r.home.toFixed(2)}
                    </td>
                    {bestDraw !== null && (
                      <td className={`p-4 text-right font-mono tabular-nums ${r.draw === bestDraw ? "font-bold text-accent" : ""}`}>
                        {r.draw?.toFixed(2) ?? "—"}
                      </td>
                    )}
                    <td className={`p-4 text-right font-mono tabular-nums ${r.away === bestAway ? "font-bold text-accent" : ""}`}>
                      {r.away.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono tabular-nums text-muted">
                      {r.margin.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {snapshot?.captured_at && (
            <p className="mt-3 text-xs text-muted">
              Cuotas actualizadas el{" "}
              {new Date(snapshot.captured_at).toLocaleString("es")}. Verifica
              siempre el precio en la casa antes de apostar.
            </p>
          )}
        </section>
      )}

      <section className="card mt-12 border-accent/40 bg-accent/5 p-7 text-center">
        <h2 className="text-xl font-bold">¿Quieres los picks antes de que la cuota baje?</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          El plan gratuito te da acceso al track record completo. El plan Pro te
          avisa en el momento exacto en que aparece el valor.
        </p>
        <Link href="/precios" className="btn-primary mt-5">Ver planes</Link>
      </section>

      {/* ── JSON-LD ──────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: `${event.home_team} vs ${event.away_team}`,
            startDate: event.commence_time,
            eventStatus: event.completed
              ? "https://schema.org/EventScheduled"
              : "https://schema.org/EventScheduled",
            sport: event.sport_title,
            competitor: [
              { "@type": "SportsTeam", name: event.home_team },
              { "@type": "SportsTeam", name: event.away_team },
            ],
            location: { "@type": "Place", name: league?.name ?? event.sport_title },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Pronósticos", item: `${process.env.NEXT_PUBLIC_SITE_URL}/pronosticos` },
              { "@type": "ListItem", position: 2, name: league?.name, item: `${process.env.NEXT_PUBLIC_SITE_URL}/pronosticos/${liga}` },
              { "@type": "ListItem", position: 3, name: `${event.home_team} vs ${event.away_team}` },
            ],
          }),
        }}
      />
    </div>
  );
}
