import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";
import { ok, errors, getApiUser, supabaseForRequest, readJson } from "@/lib/api/http";
import { buildParlays, legFromPick, type ParlayLeg } from "@/lib/parlay";
import { parseIntent, narrateParlays, estimateCostUsd, AI_LIMITS, type Intent } from "@/lib/ai";
import { legLabel } from "@/lib/api/legs";
import { mapParlayRow, PARLAY_SELECT } from "@/lib/api/parlay-rows";
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

  // ── Plan gratuito: servir la tanda pre-generada por el cron ─────────────
  // No se llama a la IA ni se consume cuota. El coste de la IA deja de crecer
  // con el número de usuarios gratuitos, que es lo que hace viable el plan.
  // RLS decide cuáles puede ver (la ventana de retraso del free).
  if (user.tier === "free") {
    const { data: rows, error: preErr } = await sb
      .from("parlays").select(PARLAY_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20);
    if (preErr) return errors.internal(preErr.message);

    const intentRisk = body.risk ?? "medium";
    const todos = (rows ?? []).map(mapParlayRow);
    // Primero los del riesgo pedido; si no hay, cualquiera antes que nada.
    const preferidos = todos.filter((p) => p.risk === intentRisk);
    const parlays = (preferidos.length ? preferidos : todos).slice(0, count);

    const res: BuildParlayResponse = {
      parlays,
      intent: {
        sports: body.sports ?? [], leagues: body.leagues ?? [],
        legs: body.legs ?? 3, risk: intentRisk,
        window: { from: new Date().toISOString(), to: new Date(Date.now() + 72 * 3600_000).toISOString() },
      },
      aiRequestId: null,
      ...(parlays.length === 0 && {
        noValue: {
          reason: "Todavía no hay parlays publicados para tu plan.",
          suggestion: "Los del plan gratuito se publican con unas horas de retraso. Vuelve más tarde o pásate a Pro para armarlos a tu medida.",
          candidatesConsidered: 0,
        },
      }),
    };
    return ok(res);
  }

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

  // Que no haya valor NO es un error: es la respuesta honesta. Bajar el umbral
  // para que siempre salga algo es exactamente lo que convierte un producto
  // como este en humo. Devolvemos 200 con el motivo y qué probar en su lugar.
  if (built.length === 0) {
    const res: BuildParlayResponse = {
      parlays: [],
      intent,
      aiRequestId: null,
      noValue: {
        reason: candidates.length === 0
          ? "No hay partidos con cuotas analizadas en esa ventana."
          : `Se analizaron ${candidates.length} selecciones y ninguna combinación llegó al mínimo de valor.`,
        suggestion: intent.leagues.length > 0
          ? "Prueba sin filtrar por liga, o amplía a los próximos días."
          : intent.legs > 2
          ? "Prueba con menos piernas: cuantas más, más difícil que todas tengan valor."
          : "Amplía la ventana a los próximos días o baja el nivel de riesgo.",
        candidatesConsidered: candidates.length,
      },
    };
    return ok(res);
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
      // Aquí el usuario es Pro o Elite (el free sale antes con la tanda del
      // cron), así que su parlay a medida entra al plan gratuito con retraso.
      free_visible_at: new Date(now.getTime() + FREE_DELAY_HOURS * 3600_000).toISOString(),
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
