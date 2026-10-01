import { supabaseServer, isSupabaseConfigured } from "./supabase/server";
import type { TierId } from "./config";
import { canAccess } from "./config";

export interface SessionUser {
  id: string;
  email: string | null;
  tier: TierId;
  bankroll: number;
  unitSizePct: number;
  tierExpiresAt: string | null;
}

/** Usuario actual con su tier efectivo (null si no hay sesión). */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Sin credenciales no hay sesión posible. Devolver null en vez de reventar
  // mantiene las páginas públicas (precios incluida) sirviendo con normalidad.
  if (!isSupabaseConfigured()) return null;

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("tier, bankroll, unit_size_pct, tier_expires_at")
    .eq("id", user.id)
    .single();

  // Una suscripción vencida cae a free automáticamente.
  const expired =
    profile?.tier_expires_at != null &&
    new Date(profile.tier_expires_at).getTime() < Date.now();

  return {
    id: user.id,
    email: user.email ?? null,
    tier: expired ? "free" : ((profile?.tier as TierId) ?? "free"),
    bankroll: Number(profile?.bankroll ?? 1000),
    unitSizePct: Number(profile?.unit_size_pct ?? 1),
    tierExpiresAt: profile?.tier_expires_at ?? null,
  };
}

export async function requireTier(required: TierId): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return canAccess(user.tier, required) ? user : null;
}
