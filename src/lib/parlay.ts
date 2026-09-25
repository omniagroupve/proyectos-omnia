// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE PARLAYS · determinista, auditable, sin IA dentro
// ═══════════════════════════════════════════════════════════════════════════
//
// La IA elige y explica; este archivo calcula. Nunca al revés.
//
//   probabilidad conjunta = Π p_i        (piernas independientes)
//   cuota combinada       = Π cuota_i
//   cuota justa           = 1 / P
//   EV                    = P · cuota − 1
//   stake                 = Kelly fraccionado sobre (P, cuota), tope 5u
//
// Supuesto de independencia: sólo se sostiene si no hay dos piernas del
// mismo evento. Por eso el constructor lo prohíbe y el evaluador lo avisa.
// Correlaciones intra-partido (same-game parlay) son fase 2 y requieren
// un modelo conjunto, no un parche.
// ═══════════════════════════════════════════════════════════════════════════

import { edgePct, kellyFraction } from "./devig.ts";
import type { CandidatePick } from "./model.ts";

export type RiskLevel = "low" | "medium" | "high";

export const PARLAY = {
  minLegs: 2,
  maxLegs: 6,
  kellyFraction: 0.25,
  capUnits: 5,
  minLegEdgePct: 2.0,
  /** Por encima de esto la varianza destruye cualquier bankroll. */
  maxCombinedOdds: 25,
  risk: {
    low:    { maxLegOdds: 1.80, maxCombinedOdds: 5,  defaultLegs: 2 },
    medium: { maxLegOdds: 3.00, maxCombinedOdds: 12, defaultLegs: 3 },
    high:   { maxLegOdds: 8.00, maxCombinedOdds: 25, defaultLegs: 4 },
  } satisfies Record<RiskLevel, { maxLegOdds: number; maxCombinedOdds: number; defaultLegs: number }>,
} as const;

export interface ParlayLeg {
  eventId: string;
  market: "h2h" | "spreads" | "totals";
  selection: string;
  line: number | null;
  odds: number;          // cuota decimal tomada
  fairProb: number;      // probabilidad justa (motor), en (0,1)
  book: string;
  pickId?: string;
  label?: string;        // "América vs Chivas · América gana"
  rationale?: string;
}

export interface ParlayEvaluation {
  legs: ParlayLeg[];
  legsCount: number;
  jointProb: number;
  combinedOdds: number;
  fairOdds: number;
  edgePct: number;
  kelly: number;         // fracción del bankroll
  stakeUnits: number;
  warnings: string[];
  errors: string[];
  valid: boolean;
}

const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Evalúa un parlay tal cual lo mandó el usuario o lo armó el constructor.
 * Devuelve siempre los números (aunque haya errores) para que la calculadora
 * pueda enseñar "esto no conviene y por qué".
 */
export function evaluateParlay(
  legs: ParlayLeg[],
  opts: { kellyFraction?: number; capUnits?: number } = {}
): ParlayEvaluation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const kf = opts.kellyFraction ?? PARLAY.kellyFraction;
  const cap = opts.capUnits ?? PARLAY.capUnits;

  if (legs.length < PARLAY.minLegs) errors.push(`Un parlay necesita al menos ${PARLAY.minLegs} piernas.`);
  if (legs.length > PARLAY.maxLegs) errors.push(`Máximo ${PARLAY.maxLegs} piernas.`);

  const seen = new Set<string>();
  for (const l of legs) {
    if (!isFinite(l.odds) || l.odds <= 1) errors.push(`Cuota inválida en ${l.label ?? l.selection}.`);
    if (!(l.fairProb > 0 && l.fairProb < 1)) errors.push(`Probabilidad inválida en ${l.label ?? l.selection}.`);
    if (seen.has(l.eventId)) {
      warnings.push(`Dos piernas del mismo partido (${l.label ?? l.eventId}): la probabilidad conjunta no es fiable.`);
    }
    seen.add(l.eventId);
    if (l.odds > PARLAY.risk.high.maxLegOdds) warnings.push(`Cuota ${l.odds.toFixed(2)} muy alta en ${l.label ?? l.selection}.`);
    if (edgePct(l.fairProb, l.odds) < 0) warnings.push(`${l.label ?? l.selection} paga por debajo de su cuota justa.`);
  }

  const valid = errors.length === 0;
  const jointProb = valid ? legs.reduce((p, l) => p * l.fairProb, 1) : 0;
  const combinedOdds = valid ? legs.reduce((o, l) => o * l.odds, 1) : 0;
  const fairOdds = jointProb > 0 ? 1 / jointProb : 0;
  const edge = valid ? edgePct(jointProb, combinedOdds) : 0;
  const kelly = valid ? kellyFraction(jointProb, combinedOdds, kf) : 0;
  const stakeUnits = Math.min(cap, r(kelly * 100, 1));

  if (valid && combinedOdds > PARLAY.maxCombinedOdds) {
    warnings.push(`Cuota combinada ${combinedOdds.toFixed(2)} por encima del tope recomendado (${PARLAY.maxCombinedOdds}).`);
  }
  if (valid && edge <= 0) warnings.push("El parlay no tiene valor esperado positivo.");

  return {
    legs,
    legsCount: legs.length,
    jointProb: r(jointProb, 6),
    combinedOdds: r(combinedOdds, 3),
    fairOdds: r(fairOdds, 3),
    edgePct: r(edge, 3),
    kelly: r(kelly, 5),
    stakeUnits,
    warnings,
    errors,
    valid,
  };
}

/** Convierte un pick del motor en pierna de parlay. */
export function legFromPick(p: CandidatePick & { pickId?: string; label?: string }): ParlayLeg {
  return {
    eventId: p.eventId,
    market: p.market,
    selection: p.selection,
    line: p.line,
    odds: p.oddsTaken,
    fairProb: p.modelProb,
    book: p.bookTitle,
    pickId: p.pickId,
    label: p.label,
    rationale: p.rationale,
  };
}

export interface BuildOptions {
  legs?: number;                  // piernas deseadas; por defecto según riesgo
  risk?: RiskLevel;
  maxResults?: number;            // cuántos parlays devolver
  allowedEventIds?: Set<string>;  // filtro por deporte/liga ya resuelto arriba
  maxCandidates?: number;         // cuántos picks considerar (coste combinatorio)
}

function* combinations<T>(arr: T[], k: number, start = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) { yield acc.slice(); return; }
  for (let i = start; i <= arr.length - (k - acc.length); i++) {
    acc.push(arr[i]);
    yield* combinations(arr, k, i + 1, acc);
    acc.pop();
  }
}

/**
 * Construye los mejores parlays posibles a partir de picks con valor.
 *
 * Reglas duras:
 *   - cada pierna con edge ≥ 2% y cuota dentro de la banda de riesgo
 *   - un solo evento por parlay
 *   - cuota combinada dentro del tope de riesgo
 * Ordena por EV y devuelve los N mejores. Combinatoria acotada a los
 * `maxCandidates` picks de mayor edge (12 por defecto → C(12,4) = 495).
 */
export function buildParlays(
  candidates: ParlayLeg[],
  opts: BuildOptions = {}
): ParlayEvaluation[] {
  const risk = opts.risk ?? "medium";
  const band = PARLAY.risk[risk];
  const legs = Math.max(PARLAY.minLegs, Math.min(PARLAY.maxLegs, opts.legs ?? band.defaultLegs));
  const maxResults = opts.maxResults ?? 3;
  const maxCandidates = opts.maxCandidates ?? 12;

  const bestPerEvent = new Map<string, ParlayLeg>();
  for (const c of candidates) {
    if (opts.allowedEventIds && !opts.allowedEventIds.has(c.eventId)) continue;
    if (c.odds > band.maxLegOdds || c.odds <= 1) continue;
    if (edgePct(c.fairProb, c.odds) < PARLAY.minLegEdgePct) continue;
    const cur = bestPerEvent.get(c.eventId);
    if (!cur || edgePct(c.fairProb, c.odds) > edgePct(cur.fairProb, cur.odds)) bestPerEvent.set(c.eventId, c);
  }

  const pool = [...bestPerEvent.values()]
    .sort((a, b) => edgePct(b.fairProb, b.odds) - edgePct(a.fairProb, a.odds))
    .slice(0, maxCandidates);

  if (pool.length < legs) return [];

  const out: ParlayEvaluation[] = [];
  for (const combo of combinations(pool, legs)) {
    const ev = evaluateParlay(combo);
    if (!ev.valid) continue;
    if (ev.combinedOdds > band.maxCombinedOdds) continue;
    if (ev.edgePct <= 0 || ev.stakeUnits <= 0) continue;
    out.push(ev);
  }

  return out
    .sort((a, b) => b.edgePct - a.edgePct || a.combinedOdds - b.combinedOdds)
    .slice(0, maxResults);
}

/** Liquidación: resultado del parlay a partir del de sus piernas. */
export function settleParlay(
  results: Array<"pending" | "win" | "loss" | "push" | "void">
): "pending" | "won" | "lost" | "push" | "void" {
  if (results.some((x) => x === "loss")) return "lost";
  if (results.some((x) => x === "pending")) return "pending";
  if (results.every((x) => x === "void")) return "void";
  if (results.every((x) => x === "push" || x === "void")) return "push";
  return "won";
}

/**
 * Cuota efectiva tras liquidar: las piernas push/void se retiran (cuota 1).
 * Beneficio en unidades sobre el stake.
 */
export function parlayProfitUnits(
  legs: Array<{ odds: number; result: "win" | "loss" | "push" | "void" }>,
  stakeUnits: number
): number {
  if (legs.some((l) => l.result === "loss")) return -stakeUnits;
  const eff = legs.reduce((o, l) => o * (l.result === "win" ? l.odds : 1), 1);
  return r(stakeUnits * (eff - 1), 2);
}
