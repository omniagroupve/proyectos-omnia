// ═══════════════════════════════════════════════════════════════════════════
// CRON · LIQUIDACIÓN
// Baja resultados → liquida picks → calcula CLV contra la closing line
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta ruta es la que construye tu activo más valioso: el track record.
// Se ejecuta sola, no se puede editar a mano, y publica también los fallos.
// Ese es exactamente el argumento de venta.

import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { fetchScores, externalPaused } from "@/lib/odds";
import { clvPct, profitUnits } from "@/lib/devig";
import { settleParlay, parlayProfitUnits } from "@/lib/parlay";
import { LEAGUES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Res = "win" | "loss" | "push";

/** Determina el resultado de un pick según el marcador final. */
function resolvePick(
  market: string,
  selection: string,
  line: number | null,
  home: string,
  away: string,
  hs: number,
  as: number
): Res {
  if (market === "h2h") {
    if (hs === as) return "push";              // empate: en 3-vías gana "Draw"
    const winner = hs > as ? home : away;
    if (selection.toLowerCase() === "draw" || selection.toLowerCase() === "empate") {
      return "loss";
    }
    return selection === winner ? "win" : "loss";
  }

  if (market === "spreads") {
    const l = line ?? 0;
    const margin = selection === home ? hs - as : as - hs;
    const adj = margin + l;
    if (Math.abs(adj) < 1e-9) return "push";
    return adj > 0 ? "win" : "loss";
  }

  if (market === "totals") {
    const total = hs + as;
    const l = line ?? 0;
    if (Math.abs(total - l) < 1e-9) return "push";
    const isOver = /^over$/i.test(selection) || /más|mas/i.test(selection);
    return (isOver ? total > l : total < l) ? "win" : "loss";
  }

  return "push";
}

/** Cuota de cierre de esa misma selección, para el CLV. */
function findClosingOdds(
  payload: unknown,
  market: string,
  selection: string,
  line: number | null
): number | null {
  if (!Array.isArray(payload)) return null;
  const prices: number[] = [];

  for (const bk of payload as Array<{ markets?: Array<{ key: string; outcomes: Array<{ name: string; price: number; point?: number }> }> }>) {
    const mk = bk.markets?.find((m) => m.key === market);
    if (!mk) continue;
    for (const o of mk.outcomes) {
      const lineMatches =
        line === null || line === undefined
          ? true
          : Math.abs((o.point ?? 0) - line) < 1e-9;
      if (o.name === selection && lineMatches) prices.push(o.price);
    }
  }
  if (!prices.length) return null;
  // Mediana: robusta frente a una casa con la línea desfasada
  prices.sort((a, b) => a - b);
  const m = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[m] : (prices[m - 1] + prices[m]) / 2;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Base de datos no configurada." }, { status: 503 });
  }

  const sb = supabaseAdmin();
  const report = { scored: 0, settled: 0, clvComputed: 0, parlaysSettled: 0, creditsRemaining: null as number | null, errors: [] as string[] };

  // 1) Traer resultados y marcar eventos completados.
  //    Con el freno de mano puesto se salta la parte de red y se liquida con
  //    lo que ya haya en la base: útil para probar sin gastar créditos.
  for (const league of externalPaused() ? [] : LEAGUES) {
    try {
      const { data: scores, quota } = await fetchScores(league.key, 3);
      report.creditsRemaining = quota.remaining;

      // Mismo freno que en la ingesta: quedarse sin créditos a mitad de mes es
      // peor que liquidar unas pocas ligas más tarde.
      if (quota.remaining !== null && quota.remaining < 2000) {
        report.errors.push(`Créditos bajos (${quota.remaining}). Liquidación detenida.`);
        break;
      }

      for (const s of scores) {
        if (!s.completed || !s.scores) continue;
        const home = s.scores.find((x) => x.name === s.home_team);
        const away = s.scores.find((x) => x.name === s.away_team);
        if (!home || !away) continue;

        await sb
          .from("events")
          .update({
            completed: true,
            home_score: Number(home.score),
            away_score: Number(away.score),
            updated_at: new Date().toISOString(),
          })
          .eq("id", s.id);
        report.scored++;
      }
    } catch (e) {
      report.errors.push(`${league.slug}: ${(e as Error).message}`);
    }
  }

  // 2) Liquidar picks pendientes de eventos ya terminados
  const { data: pending } = await sb
    .from("picks")
    .select("id, event_id, market, selection, line, odds_taken, stake_units, events!inner(home_team, away_team, home_score, away_score, completed)")
    .eq("result", "pending")
    .eq("events.completed", true)
    .limit(500);

  for (const p of pending ?? []) {
    try {
      const ev = (p as unknown as { events: { home_team: string; away_team: string; home_score: number; away_score: number } }).events;
      if (ev.home_score == null || ev.away_score == null) continue;

      const result = resolvePick(
        p.market, p.selection, p.line,
        ev.home_team, ev.away_team,
        ev.home_score, ev.away_score
      );

      // CLV contra la closing line guardada
      const { data: closing } = await sb
        .from("odds_snapshots")
        .select("payload")
        .eq("event_id", p.event_id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .single();

      const closingOdds = closing
        ? findClosingOdds(closing.payload, p.market, p.selection, p.line)
        : null;

      const clv = closingOdds ? clvPct(Number(p.odds_taken), closingOdds) : null;
      if (clv !== null) report.clvComputed++;

      await sb
        .from("picks")
        .update({
          result,
          closing_odds: closingOdds,
          clv_pct: clv === null ? null : Math.round(clv * 1000) / 1000,
          profit_units: profitUnits(result, Number(p.stake_units), Number(p.odds_taken)),
          settled_at: new Date().toISOString(),
        })
        .eq("id", p.id);

      report.settled++;
    } catch (e) {
      report.errors.push(`pick ${p.id}: ${(e as Error).message}`);
    }
  }

  // 3) Liquidar piernas de parlays y, cuando todas estén resueltas, el parlay.
  //    El CLV del parlay es el de la cuota combinada contra el cierre combinado:
  //    la misma métrica que en un pick, aplicada al producto.
  const { data: openParlays } = await sb
    .from("parlays")
    .select("id, stake_units, combined_odds, parlay_legs(position, event_id, market, selection, line, odds_taken, result, closing_odds, clv_pct)")
    .eq("status", "published")
    .limit(200);

  for (const par of openParlays ?? []) {
    try {
      const legs = (par.parlay_legs ?? []) as Array<{
        position: number; event_id: string; market: string; selection: string; line: number | null;
        odds_taken: number; result: Res | "pending"; closing_odds: number | null; clv_pct: number | null;
      }>;
      if (legs.length === 0) continue;

      // Cada pierna se liquida con el pick equivalente ya resuelto, o con el
      // marcador del evento si esa pierna no tenía pick asociado.
      for (const leg of legs.filter((l) => l.result === "pending")) {
        const { data: ev } = await sb
          .from("events").select("home_team, away_team, home_score, away_score, completed")
          .eq("id", leg.event_id).single();
        if (!ev?.completed || ev.home_score == null || ev.away_score == null) continue;

        const result = resolvePick(leg.market, leg.selection, leg.line, ev.home_team, ev.away_team, ev.home_score, ev.away_score);

        const { data: closing } = await sb
          .from("odds_snapshots").select("payload").eq("event_id", leg.event_id)
          .order("captured_at", { ascending: false }).limit(1).single();
        const closingOdds = closing ? findClosingOdds(closing.payload, leg.market, leg.selection, leg.line) : null;

        await sb.from("parlay_legs").update({
          result,
          closing_odds: closingOdds,
          clv_pct: closingOdds ? Math.round(clvPct(Number(leg.odds_taken), closingOdds) * 1000) / 1000 : null,
        }).eq("parlay_id", par.id).eq("position", leg.position);

        leg.result = result;
        leg.closing_odds = closingOdds;
      }

      const status = settleParlay(legs.map((l) => l.result));
      if (status === "pending") continue;

      const settledLegs = legs.map((l) => ({ odds: Number(l.odds_taken), result: l.result as Res | "void" }));
      const closingCombined = legs.every((l) => l.closing_odds)
        ? legs.reduce((o, l) => o * Number(l.closing_odds), 1)
        : null;

      await sb.from("parlays").update({
        status,
        closing_odds: closingCombined ? Math.round(closingCombined * 1000) / 1000 : null,
        clv_pct: closingCombined ? Math.round(clvPct(Number(par.combined_odds), closingCombined) * 1000) / 1000 : null,
        profit_units: parlayProfitUnits(settledLegs, Number(par.stake_units)),
        settled_at: new Date().toISOString(),
      }).eq("id", par.id);
      report.parlaysSettled++;
    } catch (e) {
      report.errors.push(`parlay ${par.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
