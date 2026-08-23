// ═══════════════════════════════════════════════════════════════════════════
// CRON · INGESTA
// Cada 2h: baja cuotas → guarda snapshot → analiza → publica picks
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchOdds, eventSlug, isNearClose } from "@/lib/odds";
import { analyzeEvent, selectDailyPortfolio, assignTier } from "@/lib/model";
import { LEAGUES, ENGINE, FREE_DELAY_HOURS } from "@/lib/config";
import type { CandidatePick } from "@/lib/model";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const url = new URL(req.url);
  // ?priority=1 permite ingestas escalonadas para ahorrar créditos
  const maxPriority = Number(url.searchParams.get("priority") ?? 3);

  const report = {
    leagues: 0,
    events: 0,
    candidates: 0,
    published: 0,
    creditsRemaining: null as number | null,
    errors: [] as string[],
  };

  const allCandidates: CandidatePick[] = [];
  const targets = LEAGUES.filter((l) => l.priority <= maxPriority);

  for (const league of targets) {
    try {
      const { data: events, quota } = await fetchOdds(league.key);
      report.creditsRemaining = quota.remaining;
      report.leagues++;

      // Freno de emergencia: si quedan menos de 2000 créditos, parar.
      // Quedarse sin créditos a mitad de mes es peor que cubrir menos ligas.
      if (quota.remaining !== null && quota.remaining < 2000) {
        report.errors.push(`Créditos bajos (${quota.remaining}). Ingesta detenida.`);
        break;
      }

      for (const ev of events) {
        // Guardar/actualizar evento
        await sb.from("events").upsert(
          {
            id: ev.id,
            sport_key: ev.sport_key,
            sport_title: ev.sport_title,
            league_slug: league.slug,
            home_team: ev.home_team,
            away_team: ev.away_team,
            slug: eventSlug(ev),
            commence_time: ev.commence_time,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        // Snapshot de cuotas. Marcar como cierre si el partido es inminente:
        // esa foto es la que después usamos para calcular el CLV.
        await sb.from("odds_snapshots").insert({
          event_id: ev.id,
          payload: ev.bookmakers,
          is_closing: isNearClose(ev.commence_time, 30),
        });

        report.events++;
        allCandidates.push(...analyzeEvent(ev));
      }
    } catch (e) {
      report.errors.push(`${league.slug}: ${(e as Error).message}`);
    }
  }

  report.candidates = allCandidates.length;

  // Cartera del día: 1 pick por evento, ordenado por convicción
  const portfolio = selectDailyPortfolio(allCandidates, ENGINE.maxPicksPerDay);
  const now = new Date();
  const freeVisible = new Date(now.getTime() + FREE_DELAY_HOURS * 3600_000);

  for (const p of portfolio) {
    const tier = assignTier(p);
    const { error } = await sb.from("picks").upsert(
      {
        event_id: p.eventId,
        market: p.market,
        selection: p.selection,
        line: p.line,
        odds_taken: p.oddsTaken,
        book: p.bookTitle,
        model_prob: p.modelProb,
        fair_prob: p.fairProb,
        edge_pct: p.edge,
        stake_units: p.stake,
        confidence: p.confidence,
        rationale: p.rationale,
        tier_required: tier,
        published_at: now.toISOString(),
        // El pick de mayor convicción del día también alimenta el plan free
        // (con retraso). Es el anzuelo: ven que funcionó, no pudieron usarlo.
        free_visible_at: freeVisible.toISOString(),
      },
      { onConflict: "event_id,market,selection,line", ignoreDuplicates: true }
    );
    if (!error) report.published++;
  }

  // Notificar por Telegram los picks recién publicados.
  // Se hace aquí y no en un cron aparte para que la alerta salga en segundos:
  // en este producto la latencia es el producto.
  if (report.published > 0 && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/broadcast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
    } catch (e) {
      report.errors.push(`broadcast: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
