import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, supabaseForRequest } from "@/lib/api/http";
import { mapParlayRow, PARLAY_SELECT } from "@/lib/api/parlay-rows";

export const dynamic = "force-dynamic";

/** Parlays publicados por el motor/IA. RLS aplica tier y retraso free. */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "open";
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  let q = supabaseForRequest(req).from("parlays").select(PARLAY_SELECT)
    .order("published_at", { ascending: false }).limit(limit);
  if (status === "open") q = q.eq("status", "published");
  if (status === "settled") q = q.in("status", ["won", "lost", "push", "void"]);

  const { data, error } = await q;
  if (error) return errors.internal(error.message);
  return ok({ items: (data ?? []).map(mapParlayRow), nextCursor: null });
}
