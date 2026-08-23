import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { type Performance } from "@/components/PerformanceBar";
import { type PickView } from "@/components/PickCard";
import HomeContent from "@/components/HomeContent";

export const revalidate = 900;

const PICK_SELECT = `
  id, market, selection, line, odds_taken, book, edge_pct, stake_units,
  confidence, rationale, tier_required, published_at, result, clv_pct, profit_units,
  events!inner ( home_team, away_team, sport_title, league_slug, slug, commence_time )
`;

async function getData() {
  const empty = { perf: null as Performance | null, recent: [] as PickView[] };
  if (!isSupabaseConfigured()) return empty;
  try {
    const sb = supabasePublic();
    const [perf, recent] = await Promise.all([
      sb.from("v_performance").select("*").single(),
      sb.from("picks").select(PICK_SELECT)
        .neq("result", "pending")
        .order("published_at", { ascending: false })
        .limit(3),
    ]);
    return {
      perf: (perf.data ?? null) as Performance | null,
      recent: (recent.data ?? []) as unknown as PickView[],
    };
  } catch {
    return empty;
  }
}

export default async function Home() {
  const { perf, recent } = await getData();
  return <HomeContent perf={perf} recent={recent} />;
}
