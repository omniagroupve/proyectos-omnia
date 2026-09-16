// ═══════════════════════════════════════════════════════════════════════════
// CAPA DE IA · Anthropic SDK
// ═══════════════════════════════════════════════════════════════════════════
//
// La IA hace tres cosas y sólo tres:
//   1. Entender qué quiere el usuario ("algo de Liga MX y NBA, riesgo medio").
//   2. Poner título, resumen y explicación por pierna a parlays YA calculados.
//   3. Responder preguntas sobre un parlay concreto.
//
// Nunca calcula probabilidades ni stakes: recibe números del motor y devuelve
// texto y selecciones dentro de un JSON validado. Sin ANTHROPIC_API_KEY todo
// degrada a heurísticas y plantillas para que el producto siga funcionando.
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import type { RiskLevel, ParlayEvaluation } from "./parlay.ts";
import type { Tier } from "./api-types.ts";

/**
 * DOS MODELOS, DOS TRABAJOS DISTINTOS
 * ────────────────────────────────────
 * Narrar un parlay es volumen alto y tarea sencilla: recibe cifras ya
 * calculadas y escribe dos frases. Haiku lo hace bien y cuesta ~5x menos.
 * Responder preguntas libres es volumen bajo (sólo Pro) y sí pide cabeza.
 *
 * Y lo más barato de todo: sin ANTHROPIC_API_KEY no se llama a ningún modelo.
 * Las plantillas de `templateNarration()` producen español correcto y honesto
 * por $0. Arranca así y enciende el LLM cuando el producto ya facture.
 */
export const AI_MODEL_NARRATION = process.env.AI_MODEL_NARRATION ?? "claude-haiku-4-5";
export const AI_MODEL_CHAT = process.env.AI_MODEL_CHAT ?? "claude-opus-5";

/**
 * Interruptor de coste. `templates` no gasta un céntimo; `ai` enciende el
 * modelo. Por defecto: IA si hay key, plantillas si no.
 */
export const NARRATION_MODE = (process.env.NARRATION_MODE ?? "auto") as "auto" | "templates" | "ai";

/** Construcciones con IA por día según plan. null = sin límite. */
export const AI_LIMITS: Record<Tier, number | null> = { free: 1, pro: 20, elite: null };

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

// Estable a propósito: es el prefijo cacheado. Nada volátil aquí.
const SYSTEM = `Eres el asistente de Pix, una plataforma de información deportiva para apostadores de Latinoamérica y España.
Hablas en español neutro, directo y cercano, como un amigo que sabe de números pero no presume.

Reglas absolutas:
- Nunca prometas resultados. Prohibido: "garantizado", "seguro", "infalible", "no falla", "inversión", "rentabilidad".
- No inventes datos. Sólo usas las cifras que recibes (probabilidad justa, cuota, valor esperado, casas).
- Explicas por qué una pierna tiene valor: la casa paga más de lo que dice el consenso del mercado.
- Recuerdas, sin sermonear, que un parlay puede perderse entero con una sola pierna fallida.
- Máximo dos frases por pierna. Nada de jerga: "cuota justa" y "valor" sí; "devig", "vig", "Kelly" no.
- El público es +18 y juega con dinero que puede permitirse perder.`;

export interface Intent {
  sports: string[];
  leagues: string[];
  legs: number;
  risk: RiskLevel;
  window: { from: string; to: string };
}

export interface IntentContext {
  availableSports: Array<{ key: string; name: string }>;
  availableLeagues: Array<{ slug: string; name: string; sportKey: string }>;
  defaults: { legs: number; risk: RiskLevel };
}

const INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sports", "leagues", "legs", "risk", "hoursAhead"],
  properties: {
    sports: { type: "array", items: { type: "string" } },
    leagues: { type: "array", items: { type: "string" } },
    legs: { type: "integer", minimum: 2, maximum: 6 },
    risk: { type: "string", enum: ["low", "medium", "high"] },
    hoursAhead: { type: "integer", minimum: 6, maximum: 168 },
  },
} as const;

const EXPLAIN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["parlays"],
  properties: {
    parlays: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "title", "summary", "legs"],
        properties: {
          index: { type: "integer" },
          title: { type: "string" },
          summary: { type: "string" },
          legs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["position", "rationale"],
              properties: { position: { type: "integer" }, rationale: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const;

export interface AiCallResult<T> {
  data: T;
  meta: {
    model: string;
    promptHash: string;
    inputTokens: number | null;
    outputTokens: number | null;
    cacheRead: number | null;
    latencyMs: number;
    mocked: boolean;
  };
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

/** El fallback por rechazo sólo existe en los modelos de gama alta. */
const supportsFallback = (model: string) => model.startsWith("claude-opus-5") || model.startsWith("claude-fable");

async function structured<T>(
  kind: string, user: string, schema: Record<string, unknown>,
  model: string, maxTokens = 4000
): Promise<AiCallResult<T>> {
  const t0 = Date.now();
  const res = await client().beta.messages.create({
    model,
    max_tokens: maxTokens,
    ...(supportsFallback(model)
      ? { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const }
      : {}),
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema } },
  });
  if (res.stop_reason === "refusal") throw new Error(`La IA declinó la petición (${kind}).`);
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  return {
    data: JSON.parse(text) as T,
    meta: {
      model: res.model,
      promptHash: hash(SYSTEM + user),
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens ?? null,
      latencyMs: Date.now() - t0,
      mocked: false,
    },
  };
}

const mockMeta = (user: string) => ({
  model: "mock", promptHash: hash(user), inputTokens: null, outputTokens: null, cacheRead: null, latencyMs: 0, mocked: true,
});

// ─── 1 · Intención ─────────────────────────────────────────────────────────

function heuristicIntent(prompt: string, ctx: IntentContext): Intent {
  const p = prompt.toLowerCase();
  const leagues = ctx.availableLeagues.filter((l) => p.includes(l.name.toLowerCase()) || p.includes(l.slug)).map((l) => l.slug);
  const sports = ctx.availableSports.filter((s) => p.includes(s.name.toLowerCase())).map((s) => s.key);
  const legsMatch = p.match(/(\d)\s*(piernas|legs|selecciones|partidos)/);
  const risk: RiskLevel = /bajo|seguro|conservador|tranquilo/.test(p) ? "low" : /alto|arriesg|agresiv|bomba/.test(p) ? "high" : ctx.defaults.risk;
  const hours = /hoy|esta noche|tonight/.test(p) ? 24 : /fin de semana|weekend/.test(p) ? 96 : 72;
  return {
    sports, leagues,
    legs: legsMatch ? Math.max(2, Math.min(6, Number(legsMatch[1]))) : ctx.defaults.legs,
    risk,
    window: { from: new Date().toISOString(), to: new Date(Date.now() + hours * 3600_000).toISOString() },
  };
}

export async function parseIntent(prompt: string, ctx: IntentContext): Promise<AiCallResult<Intent>> {
  if (!prompt.trim() || !isAiConfigured()) {
    return { data: heuristicIntent(prompt, ctx), meta: mockMeta(prompt) };
  }
  const user = [
    "Interpreta esta petición de un usuario que quiere armar un parlay y devuelve JSON.",
    `Deportes disponibles (key: nombre): ${ctx.availableSports.map((s) => `${s.key}: ${s.name}`).join(", ")}.`,
    `Ligas disponibles (slug: nombre): ${ctx.availableLeagues.map((l) => `${l.slug}: ${l.name}`).join(", ")}.`,
    "Usa sólo keys y slugs de esas listas. Si no menciona deporte ni liga, deja ambas listas vacías.",
    `Si no menciona número de piernas usa ${ctx.defaults.legs}; si no menciona riesgo usa "${ctx.defaults.risk}".`,
    "hoursAhead: 24 si dice hoy/esta noche, 96 si dice fin de semana, 72 si no dice nada.",
    `Petición: """${prompt.slice(0, 500)}"""`,
  ].join("\n");
  const r = await structured<{ sports: string[]; leagues: string[]; legs: number; risk: RiskLevel; hoursAhead: number }>(
    "intent", user, INTENT_SCHEMA, AI_MODEL_NARRATION, 800);
  const validLeagues = new Set(ctx.availableLeagues.map((l) => l.slug));
  const validSports = new Set(ctx.availableSports.map((s) => s.key));
  return {
    data: {
      sports: r.data.sports.filter((s) => validSports.has(s)),
      leagues: r.data.leagues.filter((l) => validLeagues.has(l)),
      legs: r.data.legs, risk: r.data.risk,
      window: { from: new Date().toISOString(), to: new Date(Date.now() + r.data.hoursAhead * 3600_000).toISOString() },
    },
    meta: r.meta,
  };
}

// ─── 2 · Título, resumen y explicación por pierna ──────────────────────────

export interface Narrated {
  title: string;
  summary: string;
  legRationales: string[];
}

function templateNarration(p: ParlayEvaluation, i: number): Narrated {
  const riskTxt = p.combinedOdds <= 5 ? "Tranquilo" : p.combinedOdds <= 12 ? "Equilibrado" : "Alto riesgo";
  return {
    title: `${riskTxt} · ${p.legsCount} piernas · cuota ${p.combinedOdds.toFixed(2)}`,
    summary: `${p.legsCount} selecciones donde la casa paga por encima de la cuota justa. Probabilidad estimada ${(p.jointProb * 100).toFixed(1)} %, valor esperado +${p.edgePct.toFixed(1)} %. Una pierna fallida pierde el parlay completo.${i > 0 ? " Alternativa." : ""}`,
    legRationales: p.legs.map((l) =>
      l.rationale ??
      `Cuota justa ${(1 / l.fairProb).toFixed(2)} según el consenso; ${l.book} paga ${l.odds.toFixed(2)}.`
    ),
  };
}

export async function narrateParlays(parlays: ParlayEvaluation[], intentPrompt: string): Promise<AiCallResult<Narrated[]>> {
  if (parlays.length === 0) return { data: [], meta: mockMeta("") };
  if (NARRATION_MODE === "templates" || !isAiConfigured()) {
    return { data: parlays.map(templateNarration), meta: mockMeta(JSON.stringify(parlays.map((p) => p.legs.map((l) => l.label))) ) };
  }
  const payload = parlays.map((p, index) => ({
    index,
    combinedOdds: p.combinedOdds, jointProbPct: +(p.jointProb * 100).toFixed(1), edgePct: p.edgePct, stakeUnits: p.stakeUnits,
    legs: p.legs.map((l, position) => ({
      position, label: l.label ?? l.selection, market: l.market, odds: l.odds,
      fairOdds: +(1 / l.fairProb).toFixed(2), fairProbPct: +(l.fairProb * 100).toFixed(1), book: l.book,
      engineNote: l.rationale ?? null,
    })),
  }));
  const user = [
    intentPrompt ? `El usuario pidió: """${intentPrompt.slice(0, 300)}"""` : "El usuario pidió un parlay sin más detalle.",
    "Estos parlays ya están calculados por el motor. Para cada uno escribe un título corto (máx 6 palabras),",
    "un resumen de 2 frases en lenguaje de jugador y una explicación de 1-2 frases por pierna usando sólo estas cifras.",
    "Devuelve JSON con el mismo index y las mismas positions.",
    JSON.stringify(payload),
  ].join("\n");
  const r = await structured<{ parlays: Array<{ index: number; title: string; summary: string; legs: Array<{ position: number; rationale: string }> }> }>(
    "build", user, EXPLAIN_SCHEMA, AI_MODEL_NARRATION, 6000);
  const data = parlays.map((p, i) => {
    const n = r.data.parlays.find((x) => x.index === i);
    if (!n) return templateNarration(p, i);
    return {
      title: n.title,
      summary: n.summary,
      legRationales: p.legs.map((l, pos) => n.legs.find((x) => x.position === pos)?.rationale ?? templateNarration(p, i).legRationales[pos]),
    };
  });
  return { data, meta: r.meta };
}

// ─── 3 · Preguntas sobre un parlay ─────────────────────────────────────────

export async function explainParlay(parlay: ParlayEvaluation & { title?: string; summary?: string | null }, question: string): Promise<AiCallResult<string>> {
  if (!isAiConfigured()) {
    return {
      data: "El asistente de IA no está activo todavía. Cada pierna de este parlay muestra su cuota justa y la cuota que paga la casa: la diferencia es el valor. Recuerda que una sola pierna fallida pierde el parlay completo.",
      meta: mockMeta(question),
    };
  }
  const t0 = Date.now();
  const user = [
    "Parlay del usuario (calculado por el motor, no lo recalcules):",
    JSON.stringify({
      title: parlay.title, summary: parlay.summary, combinedOdds: parlay.combinedOdds,
      jointProbPct: +(parlay.jointProb * 100).toFixed(1), edgePct: parlay.edgePct, stakeUnits: parlay.stakeUnits,
      legs: parlay.legs.map((l) => ({ label: l.label ?? l.selection, odds: l.odds, fairOdds: +(1 / l.fairProb).toFixed(2), book: l.book, note: l.rationale ?? null })),
    }),
    `Pregunta: """${question.slice(0, 500)}"""`,
    "Responde en máximo 120 palabras, en español, sin prometer nada.",
  ].join("\n");
  const res = await client().beta.messages.create({
    model: AI_MODEL_CHAT,
    max_tokens: 1000,
    ...(supportsFallback(AI_MODEL_CHAT)
      ? { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const }
      : {}),
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error("La IA declinó la pregunta.");
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  return {
    data: text.trim(),
    meta: {
      model: res.model, promptHash: hash(SYSTEM + user),
      inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens,
      cacheRead: res.usage.cache_read_input_tokens ?? null, latencyMs: Date.now() - t0, mocked: false,
    },
  };
}

/** Precios de lista por millón de tokens (entrada, salida). */
const PRICES: Record<string, [number, number]> = {
  "claude-haiku-4-5": [1, 5],
  "claude-sonnet-5": [2, 10],
  "claude-opus-5": [5, 25],
};

/** Coste aproximado en USD para el log. Sin esto no sabes qué te cuesta crecer. */
export function estimateCostUsd(meta: AiCallResult<unknown>["meta"]): number | null {
  if (meta.mocked || meta.inputTokens == null || meta.outputTokens == null) return null;
  const [inPrice, outPrice] = PRICES[meta.model] ?? PRICES["claude-opus-5"];
  const cached = meta.cacheRead ?? 0;
  const fresh = Math.max(0, meta.inputTokens - cached);
  // La lectura de caché cuesta una décima parte de la entrada normal.
  return +(fresh * inPrice / 1e6 + cached * inPrice * 0.1 / 1e6 + meta.outputTokens * outPrice / 1e6).toFixed(6);
}
