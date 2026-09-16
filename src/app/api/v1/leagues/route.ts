import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, countryFromRequest } from "@/lib/api/http";
import type { League } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const country = countryFromRequest(req);
  const sport = new URL(req.url).searchParams.get("sport");
  const sb = supabasePublic();

  let q = sb.from("leagues")
    .select("slug, sport_key, name_es, country_code, priority, league_availability(country_code, featured)")
    .eq("active", true)
    .order("priority");
  if (sport) q = q.eq("sport_key", sport);
  const { data, error } = await q;
  if (error) return errors.internal(error.message);

  const items: League[] = (data ?? [])
    .filter((l) => !country || (l.league_availability as Array<{ country_code: string }>).some((a) => a.country_code === country))
    .map((l) => ({
      slug: l.slug,
      sportKey: l.sport_key,
      name: l.name_es,
      countryCode: l.country_code,
      featured: !!(l.league_availability as Array<{ country_code: string; featured: boolean }>)
        .find((a) => a.country_code === country)?.featured,
    }));
  return ok({ items, country });
}
