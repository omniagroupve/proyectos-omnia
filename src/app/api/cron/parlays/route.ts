// ═══════════════════════════════════════════════════════════════════════════
// CRON · PARLAYS DEL DÍA (pre-generados)
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUÉ EXISTE ESTA RUTA
// ────────────────────────
// Si cada usuario del plan gratuito pide su parlay a la IA, pagas una llamada
// por usuario y por día. Con 10.000 usuarios eso son 10.000 llamadas diarias y
// una factura que crece exactamente igual de rápido que tu producto.
//
// Aquí se arma una tanda para todos: tres niveles de riesgo, un par de parlays
// cada uno, narrados en UNA sola llamada. Son ~4 llamadas al día en total, no
// 10.000. Y de paso la app responde al instante, porque no espera al modelo.
//
// La IA en vivo queda para Pro y Elite, que es volumen bajo y sí lo pagan.

import { NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { buildParlays, legFromPick, type ParlayLeg, type RiskLevel } from "@/lib/parlay";
import { narrateParlays, estimateCostUsd } from "@/lib/ai";
import { legLabel } from "@/lib/api/legs";
import { FREE_DELAY_HOURS } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RISKS: RiskLevel[] = ["low", "medium", "high"];
const POR_RIESGO = 2;

type PickRow = {
  id: string; event_id: string; market: ParlayLeg["market"]; selection: string; line: number | null;
  odds_taken: number; book: string; model_prob: number; fair_prob: number; edge_pct: number;
  stake_units: number; confidence: number; rationale: string | null;
  events: { home_team: string; away_team: string; league_slug: string; sport_key: string; commence_time: string };
};

/** Identifica una combinación de piernas, para no republicar la misma. */
function firma(legs: ParlayLeg[]): string {
  return legs
    .map((l) => `${l.eventId}|${l.market}|${l.selection}|${l.line ?? ""}`)
    .sort()
    .join("~");
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Base de datos no configurada." }, { status: 503 });
  }

  const sb = supabaseAdmin();
  const report = {
    candidates: 0,
    generated: 0,
    published: 0,
    skippedDuplicates: 0,
    aiCallsUsed: 0,
    costUsd: 0,
    byRisk: {} as Record<string, number>,
    errors: [] as string[],
  };

  // ── 1 · Picks abiertos de partidos que aún no han empezado ──────────────
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + 72 * 3600_000);

  const { data: picks, error } = await sb
    .from("picks")
    .select("id, event_id, market, selection, line, odds_taken, book, model_prob, fair_prob, edge_pct, stake_units, confidence, rationale, events!inner(home_team, away_team, league_slug, sport_key, commence_time)")
    .eq("result", "pending")
    .gte("events.commence_time", ahora.toISOString())
    .lte("events.commence_time", hasta.toISOString());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const candidatos: ParlayLeg[] = ((picks ?? []) as unknown as PickRow[]).map((p) =>
    legFromPick({
      eventId: p.event_id, market: p.market, selection: p.selection,
      line: p.line == null ? null : Number(p.line),
      oddsTaken: Number(p.odds_taken), book: p.book, bookTitle: p.book,
      modelProb: Number(p.model_prob), fairProb: Number(p.fair_prob), edge: Number(p.edge_pct),
      stake: Number(p.stake_units), confidence: p.confidence, bookCount: 0, sharpCount: 0,
      consensusOdds: 1 / Number(p.fair_prob), rationale: p.rationale ?? "",
      pickId: p.id,
      label: legLabel(p.events as never, { market: p.market, selection: p.selection, line: p.line }),
    })
  );
  report.candidates = candidatos.length;

  if (candidatos.length < 2) {
    return NextResponse.json({ ok: true, ...report, nota: "Sin suficientes picks abiertos para armar parlays." });
  }

  // ── 2 · Firmas ya publicadas, para no repetir ───────────────────────────
  const { data: abiertos } = await sb
    .from("parlays")
    .select("id, parlay_legs(event_id, market, selection, line)")
    .eq("status", "published");

  const yaPublicadas = new Set(
    (abiertos ?? []).map((p) =>
      ((p.parlay_legs ?? []) as Array<{ event_id: string; market: string; selection: string; line: number | null }>)
        .map((l) => `${l.event_id}|${l.market}|${l.selection}|${l.line ?? ""}`)
        .sort()
        .join("~")
    )
  );

  // ── 3 · Construir por nivel de riesgo ───────────────────────────────────
  const nuevos: Array<{ risk: RiskLevel; ev: ReturnType<typeof buildParlays>[number] }> = [];
  for (const risk of RISKS) {
    const construidos = buildParlays(candidatos, { risk, maxResults: POR_RIESGO });
    report.byRisk[risk] = construidos.length;
    for (const ev of construidos) {
      if (yaPublicadas.has(firma(ev.legs))) { report.skippedDuplicates++; continue; }
      yaPublicadas.add(firma(ev.legs));
      nuevos.push({ risk, ev });
    }
  }
  report.generated = nuevos.length;

  if (nuevos.length === 0) {
    return NextResponse.json({ ok: true, ...report, nota: "Nada nuevo con valor: la tanda anterior sigue vigente." });
  }

  // ── 4 · UNA sola llamada de IA para narrarlos todos ─────────────────────
  const narracion = await narrateParlays(nuevos.map((n) => n.ev), "");
  if (!narracion.meta.mocked) report.aiCallsUsed = 1;
  report.costUsd = estimateCostUsd(narracion.meta) ?? 0;

  const { data: aiRow } = narracion.meta.mocked
    ? { data: null }
    : await sb.from("ai_requests").insert({
        kind: "cron_batch", model: narracion.meta.model, prompt_hash: narracion.meta.promptHash,
        input: { parlays: nuevos.length, candidates: candidatos.length },
        output: { narration: narracion.data },
        input_tokens: narracion.meta.inputTokens, output_tokens: narracion.meta.outputTokens,
        cache_read: narracion.meta.cacheRead, cost_usd: report.costUsd, latency_ms: narracion.meta.latencyMs,
      }).select("id").single();

  // ── 5 · Publicar ────────────────────────────────────────────────────────
  // tier_required 'pro' + free_visible_at a 3h: Pro y Elite los ven al
  // instante, el plan gratuito cuando pasa su ventana. Misma regla que los
  // picks sueltos, así el retraso del free es uno solo y coherente.
  const visibleFree = new Date(ahora.getTime() + FREE_DELAY_HOURS * 3600_000);

  for (let i = 0; i < nuevos.length; i++) {
    const { risk, ev } = nuevos[i];
    const n = narracion.data[i];
    try {
      const { data: row, error: insErr } = await sb.from("parlays").insert({
        origin: narracion.meta.mocked ? "engine" : "ai",
        risk, title: n.title, summary: n.summary,
        legs_count: ev.legsCount, joint_prob: ev.jointProb, combined_odds: ev.combinedOdds,
        fair_odds: ev.fairOdds, edge_pct: ev.edgePct, stake_units: ev.stakeUnits,
        tier_required: "pro", status: "published",
        published_at: ahora.toISOString(),
        free_visible_at: visibleFree.toISOString(),
        ai_request_id: aiRow?.id ?? null,
      }).select("id").single();

      if (insErr || !row) { report.errors.push(`insert: ${insErr?.message}`); continue; }

      await sb.from("parlay_legs").insert(
        ev.legs.map((l, position) => ({
          parlay_id: row.id, position, event_id: l.eventId, pick_id: l.pickId ?? null,
          market: l.market, selection: l.selection, line: l.line, odds_taken: l.odds,
          book: l.book, fair_prob: l.fairProb,
          edge_pct: Math.round((l.fairProb * l.odds - 1) * 100000) / 1000,
          rationale: n.legRationales[position],
        }))
      );
      report.published++;
    } catch (e) {
      report.errors.push(`parlay ${i}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
