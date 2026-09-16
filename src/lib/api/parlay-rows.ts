import type { Parlay, ParlayLeg } from "@/lib/api-types";

export const PARLAY_SELECT = `
  id, origin, risk, title, summary, legs_count, joint_prob, combined_odds, fair_odds, edge_pct,
  stake_units, tier_required, status, published_at, closing_odds, clv_pct, profit_units,
  parlay_legs ( position, event_id, market, selection, line, odds_taken, book, fair_prob, edge_pct,
                rationale, result, closing_odds, clv_pct,
                events ( home_team, away_team ) )
`;

type LegRow = {
  position: number; event_id: string; market: ParlayLeg["market"]; selection: string; line: number | null;
  odds_taken: number; book: string; fair_prob: number; edge_pct: number; rationale: string | null;
  result: ParlayLeg["result"]; closing_odds: number | null; clv_pct: number | null;
  events: { home_team: string; away_team: string } | null;
};

export function mapParlayRow(p: Record<string, unknown>): Parlay {
  const legs = ([...((p.parlay_legs as LegRow[]) ?? [])].sort((a, b) => a.position - b.position)).map((l) => ({
    eventId: l.event_id, market: l.market, selection: l.selection, line: l.line == null ? null : Number(l.line),
    odds: Number(l.odds_taken), fairProb: Number(l.fair_prob), book: l.book,
    label: l.events ? `${l.events.home_team} vs ${l.events.away_team} · ${l.selection}${l.line != null ? " " + l.line : ""}` : l.selection,
    edgePct: Number(l.edge_pct), rationale: l.rationale, result: l.result,
    closingOdds: l.closing_odds == null ? null : Number(l.closing_odds),
    clvPct: l.clv_pct == null ? null : Number(l.clv_pct),
  }));
  return {
    id: p.id as string, origin: p.origin as Parlay["origin"], risk: p.risk as Parlay["risk"],
    title: (p.title as string) ?? "", summary: (p.summary as string) ?? null,
    tierRequired: p.tier_required as Parlay["tierRequired"], status: p.status as Parlay["status"],
    publishedAt: p.published_at as string,
    legs, legsCount: Number(p.legs_count), jointProb: Number(p.joint_prob), combinedOdds: Number(p.combined_odds),
    fairOdds: Number(p.fair_odds), edgePct: Number(p.edge_pct), stakeUnits: Number(p.stake_units), stakeAmount: null,
    closingOdds: p.closing_odds == null ? null : Number(p.closing_odds),
    clvPct: p.clv_pct == null ? null : Number(p.clv_pct),
    profitUnits: p.profit_units == null ? null : Number(p.profit_units),
    warnings: [], errors: [], valid: true,
  };
}
