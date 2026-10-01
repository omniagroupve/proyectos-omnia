// ═══════════════════════════════════════════════════════════════════════════
// API v1 · utilidades HTTP
// Respuestas uniformes, auth por Bearer (JWT de Supabase) o cookie, país.
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { ApiError } from "@/lib/api-types";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, code: string, message: string) {
  const body: ApiError = { error: { code, message } };
  return NextResponse.json(body, { status });
}

export const errors = {
  unauthorized: () => fail(401, "unauthorized", "Inicia sesión para continuar."),
  forbidden: (msg = "Tu plan no incluye esta función.") => fail(403, "forbidden", msg),
  notFound: (what = "Recurso") => fail(404, "not_found", `${what} no encontrado.`),
  badRequest: (msg: string) => fail(400, "bad_request", msg),
  rateLimited: (msg: string) => fail(429, "rate_limited", msg),
  notConfigured: () => fail(503, "not_configured", "Base de datos no configurada."),
  internal: (msg = "Error interno.") => fail(500, "internal", msg),
};

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

/**
 * Cliente Supabase que respeta RLS con la identidad del request:
 * JWT en Authorization (frontend Vite) o cookie de sesión (Next).
 */
export function supabaseForRequest(req: Request) {
  const jwt = bearer(req);
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: jwt ? { headers: { Authorization: `Bearer ${jwt}` } } : undefined,
    }
  );
}

/** Usuario del request. Bearer tiene prioridad sobre la cookie. */
export async function getApiUser(req: Request): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;
  const jwt = bearer(req);
  if (!jwt) return getSessionUser();

  const sb = supabaseForRequest(req);
  const { data: { user } } = await sb.auth.getUser(jwt);
  if (!user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("tier, bankroll, unit_size_pct, tier_expires_at")
    .eq("id", user.id)
    .single();

  const expired =
    profile?.tier_expires_at != null &&
    new Date(profile.tier_expires_at).getTime() < Date.now();

  return {
    id: user.id,
    email: user.email ?? null,
    tier: expired ? "free" : ((profile?.tier as SessionUser["tier"]) ?? "free"),
    bankroll: Number(profile?.bankroll ?? 1000),
    unitSizePct: Number(profile?.unit_size_pct ?? 1),
    tierExpiresAt: profile?.tier_expires_at ?? null,
  };
}

const KNOWN = new Set(["MX", "CO", "AR", "CL", "PE", "VE", "EC", "UY", "BR", "ES"]);

/**
 * País del request: ?country= (selector manual) > x-vercel-ip-country > null.
 * El idioma NUNCA cuenta como prueba de ubicación.
 */
export function countryFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const manual = url.searchParams.get("country")?.toUpperCase();
  if (manual && KNOWN.has(manual)) return manual;
  const ip = req.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (ip && KNOWN.has(ip)) return ip;
  return null;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}
