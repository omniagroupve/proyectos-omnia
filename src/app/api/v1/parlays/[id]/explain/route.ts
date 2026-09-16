import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";
import { ok, errors, getApiUser, supabaseForRequest, readJson } from "@/lib/api/http";
import { mapParlayRow, PARLAY_SELECT } from "@/lib/api/parlay-rows";
import { explainParlay, estimateCostUsd } from "@/lib/ai";
import { canAccess } from "@/lib/config";
import type { ExplainParlayRequest, ExplainParlayResponse } from "@/lib/api-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  if (!canAccess(user.tier, "pro")) return errors.forbidden("Las preguntas a la IA son del plan Pro.");

  const body = await readJson<ExplainParlayRequest>(req);
  if (!body?.question?.trim()) return errors.badRequest("Escribe una pregunta.");
  const { id } = await params;

  // RLS: sólo se puede preguntar por un parlay que el usuario puede ver
  const { data: row } = await supabaseForRequest(req).from("parlays").select(PARLAY_SELECT).eq("id", id).maybeSingle();
  if (!row) return errors.notFound("Parlay");
  const parlay = mapParlayRow(row as Record<string, unknown>);

  const call = await explainParlay({
    legs: parlay.legs.map((l) => ({ ...l, line: l.line ?? null, rationale: l.rationale ?? undefined })),
    legsCount: parlay.legsCount, jointProb: parlay.jointProb, combinedOdds: parlay.combinedOdds,
    fairOdds: parlay.fairOdds, edgePct: parlay.edgePct, kelly: 0, stakeUnits: parlay.stakeUnits,
    warnings: [], errors: [], valid: true, title: parlay.title, summary: parlay.summary,
  }, body.question);

  const { data: aiRow } = await supabaseAdmin().from("ai_requests").insert({
    user_id: user.id, kind: "explain", model: call.meta.model, prompt_hash: call.meta.promptHash,
    input: { parlayId: id, question: body.question }, output: { answer: call.data },
    input_tokens: call.meta.inputTokens, output_tokens: call.meta.outputTokens, cache_read: call.meta.cacheRead,
    cost_usd: estimateCostUsd(call.meta), latency_ms: call.meta.latencyMs,
  }).select("id").single();

  const res: ExplainParlayResponse = { answer: call.data, aiRequestId: aiRow?.id ?? "" };
  return ok(res);
}
