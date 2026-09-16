import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, readJson, supabaseForRequest } from "@/lib/api/http";
import { resolveLegs } from "@/lib/api/legs";
import { evaluateParlay } from "@/lib/parlay";
import type { EvaluateParlayRequest, ParlayEvaluation } from "@/lib/api-types";

export const dynamic = "force-dynamic";

/** Calculadora pública: el usuario manda sus piernas y ve si conviene. */
export async function POST(req: Request) {
  const body = await readJson<EvaluateParlayRequest>(req);
  if (!body?.legs?.length) return errors.badRequest("Manda al menos dos piernas.");
  if (body.legs.length > 8) return errors.badRequest("Máximo 8 piernas.");

  // Sin BD, sólo se aceptan piernas con fairProb explícita (calculadora offline).
  if (!isSupabaseConfigured() || body.legs.every((l) => l.fairProb != null)) {
    const legs = body.legs.map((l) => ({
      eventId: l.eventId, market: l.market, selection: l.selection, line: l.line ?? null,
      odds: l.odds, fairProb: l.fairProb ?? NaN, book: l.book ?? "manual",
    }));
    return ok(toApi(evaluateParlay(legs), body.bankroll));
  }

  const { legs, errors: resolveErrors } = await resolveLegs(supabaseForRequest(req), body.legs);
  if (resolveErrors.length) return errors.badRequest(resolveErrors.join(" "));
  return ok(toApi(evaluateParlay(legs), body.bankroll));
}

function toApi(ev: ReturnType<typeof evaluateParlay>, bankroll?: number): ParlayEvaluation {
  return {
    legs: ev.legs.map((l) => ({
      eventId: l.eventId, market: l.market, selection: l.selection, line: l.line, odds: l.odds,
      fairProb: l.fairProb, book: l.book, label: l.label ?? `${l.selection}`,
      edgePct: Math.round((l.fairProb * l.odds - 1) * 100000) / 1000, rationale: l.rationale ?? null,
    })),
    legsCount: ev.legsCount, jointProb: ev.jointProb, combinedOdds: ev.combinedOdds, fairOdds: ev.fairOdds,
    edgePct: ev.edgePct, stakeUnits: ev.stakeUnits,
    stakeAmount: bankroll && bankroll > 0 ? Math.round(bankroll * ev.kelly * 100) / 100 : null,
    warnings: ev.warnings, errors: ev.errors, valid: ev.valid,
  };
}
