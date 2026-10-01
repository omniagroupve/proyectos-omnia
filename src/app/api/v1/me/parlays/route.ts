import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, getApiUser, supabaseForRequest, readJson } from "@/lib/api/http";
import { resolveLegs } from "@/lib/api/legs";
import { evaluateParlay } from "@/lib/parlay";
import type { SaveUserParlayRequest, UserParlay } from "@/lib/api-types";

export const dynamic = "force-dynamic";

function mapRow(r: Record<string, unknown>): UserParlay {
  return {
    id: r.id as string, origin: r.origin as UserParlay["origin"], title: (r.title as string) ?? null,
    status: r.status as UserParlay["status"],
    legs: r.legs as UserParlay["legs"], legsCount: Number(r.legs_count),
    jointProb: Number(r.joint_prob), combinedOdds: Number(r.combined_odds),
    fairOdds: Number(r.joint_prob) > 0 ? Math.round(1000 / Number(r.joint_prob)) / 1000 : 0,
    edgePct: Number(r.edge_pct ?? 0), stakeUnits: 0,
    stakeAmount: r.stake_amount == null ? null : Number(r.stake_amount),
    resultUnits: r.result_units == null ? null : Number(r.result_units),
    clvPct: r.clv_pct == null ? null : Number(r.clv_pct),
    createdAt: r.created_at as string, settledAt: (r.settled_at as string) ?? null,
    warnings: [], errors: [], valid: true,
  };
}

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  const { data, error } = await supabaseForRequest(req)
    .from("user_parlays").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error) return errors.internal(error.message);
  return ok({ items: (data ?? []).map(mapRow), nextCursor: null });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  const body = await readJson<SaveUserParlayRequest>(req);
  if (!body?.legs?.length) return errors.badRequest("Manda al menos dos piernas.");

  const sb = supabaseForRequest(req);
  const { legs, api, errors: resolveErrors } = await resolveLegs(sb, body.legs);
  if (resolveErrors.length) return errors.badRequest(resolveErrors.join(" "));
  const ev = evaluateParlay(legs);
  if (!ev.valid) return errors.badRequest(ev.errors.join(" "));

  const { data, error } = await sb.from("user_parlays").insert({
    user_id: user.id,
    source_parlay: body.sourceParlayId ?? null,
    origin: body.sourceParlayId ? "mixed" : "user",
    title: body.title?.slice(0, 120) ?? null,
    legs: api,
    legs_count: ev.legsCount,
    joint_prob: ev.jointProb,
    combined_odds: ev.combinedOdds,
    edge_pct: ev.edgePct,
    stake_amount: body.stakeAmount ?? null,
    status: "draft",
  }).select("*").single();
  if (error) return errors.internal(error.message);
  return ok(mapRow(data), { status: 201 });
}
