import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, getApiUser, supabaseForRequest, readJson } from "@/lib/api/http";
import { AI_LIMITS } from "@/lib/ai";
import type { Me } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  const sb = supabaseForRequest(req);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: usage }] = await Promise.all([
    sb.from("profiles").select("display_name, country_code, locale, jurisdictions(currency)").eq("id", user.id).single(),
    sb.from("ai_usage_daily").select("builds").eq("user_id", user.id).eq("day", today).maybeSingle(),
  ]);

  const body: Me = {
    id: user.id, email: user.email, displayName: profile?.display_name ?? null,
    tier: user.tier, tierExpiresAt: user.tierExpiresAt,
    countryCode: profile?.country_code ?? null, locale: profile?.locale ?? "es",
    bankroll: user.bankroll,
    currency: (profile?.jurisdictions as unknown as { currency: string } | null)?.currency ?? "USD",
    aiBuildsToday: usage?.builds ?? 0,
    aiBuildsLimit: AI_LIMITS[user.tier],
  };
  return ok(body);
}

/** Actualiza país, idioma, bankroll y nombre. El tier nunca se toca aquí. */
export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  const body = await readJson<Partial<{ countryCode: string; locale: string; bankroll: number; displayName: string }>>(req);
  if (!body) return errors.badRequest("JSON inválido.");

  const patch: Record<string, unknown> = {};
  if (body.countryCode) patch.country_code = body.countryCode.toUpperCase();
  if (body.locale) patch.locale = body.locale;
  if (body.bankroll != null && body.bankroll >= 0) patch.bankroll = body.bankroll;
  if (body.displayName != null) patch.display_name = body.displayName.slice(0, 60);

  const { error } = await supabaseForRequest(req).from("profiles").update(patch).eq("id", user.id);
  if (error) return errors.internal(error.message);
  return ok({ ok: true });
}
