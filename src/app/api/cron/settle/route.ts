// ═══════════════════════════════════════════════════════════════════════════
// CRON · LIQUIDACIÓN
// Baja resultados → liquida picks → calcula CLV contra la closing line
// ═══════════════════════════════════════════════════════════════════════════
//
// Esta ruta es la que construye tu activo más valioso: el track record.
// Se ejecuta sola, no se puede editar a mano, y publica también los fallos.
// Ese es exactamente el argumento de venta.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fetchScores } from "@/lib/odds";
import { clvPct, profitUnits } from "@/lib/devig";
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

  const sb = supabaseAdmin();
  const report = { scored: 0, settled: 0, clvComputed: 0, errors: [] as string[] };

  // 1) Traer resultados y marcar eventos completados
  for (const league of LEAGUES) {
    try {
      const { data: scores } = await fetchScores(league.key, 3);
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

  return NextResponse.json({ ok: true, ...report });
}
