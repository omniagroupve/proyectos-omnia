// ═══════════════════════════════════════════════════════════════════════════
// CRON · FIXTURES Y RESULTADOS OFICIALES (API-Football)
// ═══════════════════════════════════════════════════════════════════════════
//
// The Odds API da precios y un endpoint de scores que no cubre bien LatAm.
// API-Football da el resultado oficial de cada partido con id estable. Este
// cron enlaza ambos mundos: encuentra el fixture correspondiente a cada evento
// nuestro por fecha + equipos normalizados, y escribe el marcador definitivo.
//
// La liquidación de picks y parlays sigue viviendo en /api/cron/settle; aquí
// sólo se establece la verdad del partido.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchRecentResults, fetchCurrentSeason, isApiFootballConfigured, sameTeam } from "@/lib/apifootball";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!isApiFootballConfigured()) {
    return NextResponse.json({ ok: false, error: "APIFOOTBALL_KEY no configurada" }, { status: 503 });
  }

  const sb = supabaseAdmin();
  const report = { leagues: 0, fixtures: 0, matched: 0, quotaRemaining: null as number | null, errors: [] as string[] };

  const { data: leagues } = await sb
    .from("leagues")
    .select("slug, apifootball_id")
    .eq("active", true)
    .not("apifootball_id", "is", null);

  // Eventos nuestros sin marcador cuya hora ya pasó: los candidatos a casar.
  const since = new Date(Date.now() - 4 * 86400_000).toISOString();
  const { data: openEvents } = await sb
    .from("events")
    .select("id, league_slug, home_team, away_team, commence_time")
    .eq("completed", false)
    .gte("commence_time", since)
    .lte("commence_time", new Date().toISOString())
    .limit(500);

  const byLeague = new Map<string, typeof openEvents>();
  for (const e of openEvents ?? []) {
    const arr = byLeague.get(e.league_slug) ?? [];
    arr.push(e);
    byLeague.set(e.league_slug, arr as never);
  }

  for (const l of leagues ?? []) {
    const pending = byLeague.get(l.slug);
    if (!pending?.length) continue;

    try {
      const season = await fetchCurrentSeason(l.apifootball_id as number);
      if (!season) { report.errors.push(`${l.slug}: sin temporada activa`); continue; }

      const { fixtures, quota } = await fetchRecentResults(l.apifootball_id as number, season, 4);
      report.leagues++;
      report.fixtures += fixtures.length;
      report.quotaRemaining = quota.remaining;

      for (const ev of pending) {
        // Ventana de 36 h: cubre aplazamientos de horario sin casar la jornada
        // siguiente entre los mismos equipos.
        const fx = fixtures.find(
          (f) =>
            Math.abs(new Date(f.date).getTime() - new Date(ev.commence_time).getTime()) < 36 * 3600_000 &&
            sameTeam(f.homeTeam.name, ev.home_team) &&
            sameTeam(f.awayTeam.name, ev.away_team)
        );
        if (!fx || fx.homeScore == null || fx.awayScore == null) continue;

        await sb.from("events").update({
          completed: true,
          home_score: fx.homeScore,
          away_score: fx.awayScore,
          apifootball_fixture_id: fx.id,
          updated_at: new Date().toISOString(),
        }).eq("id", ev.id);
        report.matched++;
      }
    } catch (e) {
      report.errors.push(`${l.slug}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
