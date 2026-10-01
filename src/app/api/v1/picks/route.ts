import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, supabaseForRequest } from "@/lib/api/http";
import type { Pick } from "@/lib/api-types";

export const dynamic = "force-dynamic";

const SELECT = `
  id, event_id, market, selection, line, odds_taken, book, fair_prob, edge_pct, stake_units,
  confidence, rationale, tier_required, published_at, result, closing_odds, clv_pct, profit_units,
  events!inner ( home_team, away_team, league_slug, commence_time )
`;

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "open";   // open | settled | all
  const league = url.searchParams.get("league");
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 30));

  // RLS decide qué picks ve este usuario (tier, retraso free, liquidados).
  let q = supabaseForRequest(req).from("picks").select(SELECT).order("published_at", { ascending: false }).limit(limit);
  if (status === "open") q = q.eq("result", "pending");
  if (status === "settled") q = q.neq("result", "pending");
  if (league) q = q.eq("events.league_slug", league);

  const { data, error } = await q;
  if (error) return errors.internal(error.message);

  const items: Pick[] = (data ?? []).map((p) => {
    const ev = p.events as unknown as { home_team: string; away_team: string; league_slug: string; commence_time: string };
    return {
      id: p.id, eventId: p.event_id,
      event: { homeTeam: ev.home_team, awayTeam: ev.away_team, leagueSlug: ev.league_slug, commenceTime: ev.commence_time },
      market: p.market, selection: p.selection, line: p.line, oddsTaken: Number(p.odds_taken), book: p.book,
      fairProb: Number(p.fair_prob), edgePct: Number(p.edge_pct), stakeUnits: Number(p.stake_units),
      confidence: p.confidence, rationale: p.rationale, tierRequired: p.tier_required,
      publishedAt: p.published_at, result: p.result,
      closingOdds: p.closing_odds == null ? null : Number(p.closing_odds),
      clvPct: p.clv_pct == null ? null : Number(p.clv_pct),
      profitUnits: p.profit_units == null ? null : Number(p.profit_units),
    };
  });
  return ok({ items, nextCursor: null });
}
