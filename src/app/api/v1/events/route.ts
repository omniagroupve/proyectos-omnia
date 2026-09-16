import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, countryFromRequest } from "@/lib/api/http";
import { latestSnapshots } from "@/lib/api/legs";
import { summarizeMarkets } from "@/lib/market-summary";
import type { EventSummary } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const url = new URL(req.url);
  const league = url.searchParams.get("league");
  const sport = url.searchParams.get("sport");
  const from = url.searchParams.get("from") ?? new Date().toISOString();
  const to = url.searchParams.get("to") ?? new Date(Date.now() + 72 * 3600_000).toISOString();
  const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 50));
  const country = countryFromRequest(req);
  const sb = supabasePublic();

  let q = sb.from("events")
    .select("id, sport_key, league_slug, home_team, away_team, commence_time, completed, home_score, away_score")
    .gte("commence_time", from).lte("commence_time", to)
    .order("commence_time").limit(limit);
  if (league) q = q.eq("league_slug", league);
  if (sport) q = q.like("sport_key", `${sport}_%`);

  if (country && !league) {
    const { data: avail } = await sb.from("league_availability").select("league_slug").eq("country_code", country);
    const slugs = (avail ?? []).map((a) => a.league_slug);
    if (slugs.length) q = q.in("league_slug", slugs);
  }

  const { data, error } = await q;
  if (error) return errors.internal(error.message);
  const rows = data ?? [];
  const snaps = await latestSnapshots(sb, rows.map((r) => r.id));

  const items: EventSummary[] = rows.map((r) => ({
    id: r.id,
    leagueSlug: r.league_slug,
    sportKey: r.sport_key.split("_")[0],
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    commenceTime: r.commence_time,
    completed: r.completed,
    homeScore: r.home_score,
    awayScore: r.away_score,
    markets: summarizeMarkets(snaps.get(r.id)?.bookmakers ?? []),
  }));
  return ok({ items, nextCursor: null, country });
}
