import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";
import { ok, errors, getApiUser, supabaseForRequest, readJson } from "@/lib/api/http";
import { buildParlays, legFromPick, type ParlayLeg } from "@/lib/parlay";
import { parseIntent, narrateParlays, estimateCostUsd, AI_LIMITS, type Intent } from "@/lib/ai";
import { legLabel } from "@/lib/api/legs";
import { DEMO_PARLAYS } from "@/lib/demo-parlays";
import { FREE_DELAY_HOURS } from "@/lib/config";
import type { BuildParlayRequest, BuildParlayResponse, Parlay } from "@/lib/api-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PickRow = {
  id: string; event_id: string; market: ParlayLeg["market"]; selection: string; line: number | null;
  odds_taken: number; book: string; model_prob: number; fair_prob: number; edge_pct: number; stake_units: number;
  confidence: number; rationale: string | null;
  events: { home_team: string; away_team: string; league_slug: string; sport_key: string; commence_time: string };
};

export async function POST(req: Request) {
  const body = (await readJson<BuildParlayRequest>(req)) ?? {};
  const count = Math.max(1, Math.min(3, body.count ?? 1));

  // Sin base de datos: devolver demo para que el frontend avance.
  if (!isSupabaseConfigured()) {
    const res: BuildParlayResponse = {
      parlays: DEMO_PARLAYS.slice(0, count),
      intent: { sports: body.sports ?? [], leagues: body.leagues ?? [], legs: body.legs ?? 3, risk: body.risk ?? "medium",
                window: { from: new Date().toISOString(), to: new Date(Date.now() + 72 * 3600_000).toISOString() } },
      aiRequestId: null,
    };
    return ok({ demo: true, ...res });
  }

  const user = await getApiUser(req);
  if (!user) return errors.unauthorized();
  const sb = supabaseForRequest(req);
  const admin = supabaseAdmin();

  // Cuota diaria por plan. El contador se incrementa de forma atómica ANTES de
  // llamar a la IA: si dos peticiones entran a la vez, sólo una pasa el límite.
  const limit = AI_LIMITS[user.tier];
  const today = new Date().toISOString().slice(0, 10);
  if (limit != null) {
    const { data: used, error: quotaError } = await admin.rpc("increment_ai_builds", { p_user: user.id, p_day: today });
    if (quotaError) return errors.internal(quotaError.message);
    if (Number(used) > limit) {
      return errors.rateLimited(`Tu plan permite ${limit} parlay${limit === 1 ? "" : "s"} con IA al día. Sube a Pro para más.`);
    }
  }

  // Catálogo para interpretar la petición
  const [{ data: sports }, { data: leagues }] = await Promise.all([
    sb.from("sports").select("key, name_es").order("sort_order"),
    sb.from("leagues").select("slug, name_es, sport_key").eq("active", true),
  ]);
  const ctx = {
    availableSports: (sports ?? []).map((s) => ({ key: s.key, name: s.name_es })),
    availableLeagues: (leagues ?? []).map((l) => ({ slug: l.slug, name: l.name_es, sportKey: l.sport_key })),
    defaults: { legs: body.legs ?? 3, risk: body.risk ?? "medium" as const },
  };
  const intentCall = await parseIntent(body.prompt ?? "", ctx);
  const intent: Intent = {
    ...intentCall.data,
    sports: body.sports?.length ? body.sports : intentCall.data.sports,
    leagues: body.leagues?.length ? body.leagues : intentCall.data.leagues,
    legs: body.legs ?? intentCall.data.legs,
    risk: body.risk ?? intentCall.data.risk,
  };

  // Candidatos: picks abiertos visibles para este usuario (RLS aplica tier y retraso)
  let q = sb.from("picks")
    .select("id, event_id, market, selection, line, odds_taken, book, model_prob, fair_prob, edge_pct, stake_units, confidence, rationale, events!inner(home_team, away_team, league_slug, sport_key, commence_time)")
    .eq("result", "pending")
    .gte("events.commence_time", intent.window.from)
    .lte("events.commence_time", intent.window.to);
  if (intent.leagues.length) q = q.in("events.league_slug", intent.leagues);
  const { data: picks, error } = await q;
  if (error) return errors.internal(error.message);

  const rows = ((picks ?? []) as unknown as PickRow[]).filter((p) =>
    intent.sports.length === 0 || intent.sports.some((s) => p.events.sport_key.startsWith(s))
  );

  const candidates: ParlayLeg[] = rows.map((p) => legFromPick({
    eventId: p.event_id, market: p.market, selection: p.selection, line: p.line == null ? null : Number(p.line),
    oddsTaken: Number(p.odds_taken), book: p.book, bookTitle: p.book,
    modelProb: Number(p.model_prob), fairProb: Number(p.fair_prob), edge: Number(p.edge_pct),
    stake: Number(p.stake_units), confidence: p.confidence, bookCount: 0, sharpCount: 0,
    consensusOdds: 1 / Number(p.fair_prob), rationale: p.rationale ?? "",
    pickId: p.id, label: legLabel(p.events as never, { market: p.market, selection: p.selection, line: p.line }),
  }));

  const built = buildParlays(candidates, { legs: intent.legs, risk: intent.risk, maxResults: count });
  if (built.length === 0) {
    return errors.notFound("Ningún parlay con valor para esos filtros. Prueba con otra liga, más horas o menos piernas");
  }

  const narration = await narrateParlays(built, body.prompt ?? "");

  // Log de IA (auditable) + contador diario
  const { data: aiRow } = await admin.from("ai_requests").insert({
    user_id: user.id, kind: "build", model: narration.meta.model, prompt_hash: narration.meta.promptHash,
    input: { intent, prompt: body.prompt ?? null, candidates: candidates.length },
    output: { parlays: built.map((p) => p.legs.map((l) => l.pickId)), narration: narration.data },
    input_tokens: narration.meta.inputTokens, output_tokens: narration.meta.outputTokens,
    cache_read: narration.meta.cacheRead, cost_usd: estimateCostUsd(narration.meta), latency_ms: narration.meta.latencyMs,
  }).select("id").single();

  // Persistir como parlays publicados para el usuario (tier = el suyo)
  const now = new Date();
  const parlays: Parlay[] = [];
  for (let i = 0; i < built.length; i++) {
    const p = built[i];
    const n = narration.data[i];
    const { data: row } = await admin.from("parlays").insert({
      origin: "ai", risk: intent.risk, title: n.title, summary: n.summary,
      legs_count: p.legsCount, joint_prob: p.jointProb, combined_odds: p.combinedOdds, fair_odds: p.fairOdds,
      edge_pct: p.edgePct, stake_units: p.stakeUnits, tier_required: user.tier, status: "published",
      published_at: now.toISOString(),
      free_visible_at: user.tier === "free" ? now.toISOString() : new Date(now.getTime() + FREE_DELAY_HOURS * 3600_000).toISOString(),
      ai_request_id: aiRow?.id ?? null,
    }).select("id").single();
    if (row) {
      await admin.from("parlay_legs").insert(p.legs.map((l, position) => ({
        parlay_id: row.id, position, event_id: l.eventId, pick_id: l.pickId ?? null, market: l.market,
        selection: l.selection, line: l.line, odds_taken: l.odds, book: l.book, fair_prob: l.fairProb,
        edge_pct: Math.round((l.fairProb * l.odds - 1) * 100000) / 1000, rationale: n.legRationales[position],
      })));
    }
    parlays.push({
      id: row?.id ?? `tmp-${i}`, origin: "ai", risk: intent.risk, title: n.title, summary: n.summary,
      tierRequired: user.tier, status: "published", publishedAt: now.toISOString(),
      legs: p.legs.map((l, position) => ({
        eventId: l.eventId, market: l.market, selection: l.selection, line: l.line, odds: l.odds, fairProb: l.fairProb,
        book: l.book, label: l.label ?? l.selection, edgePct: Math.round((l.fairProb * l.odds - 1) * 100000) / 1000,
        rationale: n.legRationales[position],
      })),
      legsCount: p.legsCount, jointProb: p.jointProb, combinedOdds: p.combinedOdds, fairOdds: p.fairOdds,
      edgePct: p.edgePct, stakeUnits: p.stakeUnits,
      stakeAmount: body.bankroll ? Math.round(body.bankroll * p.kelly * 100) / 100 : null,
      closingOdds: null, clvPct: null, profitUnits: null, warnings: p.warnings, errors: [], valid: true,
    });
  }

  const res: BuildParlayResponse = { parlays, intent, aiRequestId: aiRow?.id ?? null };
  return ok(res);
}
