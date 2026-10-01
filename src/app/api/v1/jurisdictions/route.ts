import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, countryFromRequest } from "@/lib/api/http";
import type { Jurisdiction } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const { data, error } = await supabasePublic()
    .from("jurisdictions").select("code, name_es, currency, timezone").eq("active", true).order("sort_order");
  if (error) return errors.internal(error.message);
  const items: Jurisdiction[] = (data ?? []).map((j) => ({ code: j.code, name: j.name_es, currency: j.currency, timezone: j.timezone }));
  return ok({ items, detected: countryFromRequest(req) });
}
