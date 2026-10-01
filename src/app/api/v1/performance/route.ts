import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors } from "@/lib/api/http";
import type { Performance } from "@/lib/api-types";

export const revalidate = 600;

/** Track record público: picks y parlays liquidados. Sin selección manual. */
export async function GET() {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const sb = supabasePublic();
  const [{ data: p }, { data: q }] = await Promise.all([
    sb.from("v_performance").select("*").single(),
    sb.from("v_parlay_performance").select("*").single(),
  ]);
  const n = (v: unknown) => Number(v ?? 0);
  const body: Performance = {
    picks: p && n(p.total_picks) > 0 ? {
      total: n(p.total_picks), wins: n(p.wins), losses: n(p.losses), pushes: n(p.pushes),
      netUnits: n(p.net_units), roiPct: n(p.roi_pct), hitRatePct: n(p.hit_rate_pct),
      avgClvPct: n(p.avg_clv_pct), clvBeatPct: n(p.clv_beat_pct),
    } : null,
    parlays: q && n(q.total_parlays) > 0 ? {
      total: n(q.total_parlays), won: n(q.won), lost: n(q.lost), netUnits: n(q.net_units),
      roiPct: n(q.roi_pct), avgClvPct: n(q.avg_clv_pct), avgCombinedOdds: n(q.avg_combined_odds),
    } : null,
  };
  return ok(body);
}
