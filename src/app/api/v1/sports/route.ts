import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors } from "@/lib/api/http";
import type { Sport } from "@/lib/api-types";

export const revalidate = 3600;

export async function GET() {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const { data, error } = await supabasePublic()
    .from("sports").select("key, name_es").order("sort_order");
  if (error) return errors.internal(error.message);
  const items: Sport[] = (data ?? []).map((s) => ({ key: s.key, name: s.name_es }));
  return ok({ items });
}
