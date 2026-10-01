// ═══════════════════════════════════════════════════════════════════════════
// MODELO DE PICKS · value betting sobre consenso ponderado
// ═══════════════════════════════════════════════════════════════════════════
//
// ESTRATEGIA (léela antes de tocar nada):
//
// No se trata de "predecir partidos" — eso es lo que todo el mundo intenta y
// casi nadie consigue. Se trata de detectar cuándo UNA casa se ha desviado
// del precio real del mercado.
//
//   1. Construir la probabilidad justa del mercado a partir del consenso
//      ponderado (Pinnacle y otras sharp pesan 5x, las recreativas 1x).
//   2. Quitar el vig de ese consenso → probabilidad real estimada.
//   3. Buscar la MEJOR cuota disponible en cualquier casa para esa selección.
//   4. Si esa cuota implica menos probabilidad que la real → hay valor.
//
// Es un modelo honesto: no pretende saber más de fútbol que el mercado,
// solo detecta ineficiencias de precio entre casas. Funciona, es auditable
// y es replicable — que es exactamente lo que necesitas para vender
// suscripciones sin prometer humo.
//
// SIGUIENTE NIVEL (v2): mezclar esta probabilidad de mercado con un modelo
// propio (Poisson/Dixon-Coles para fútbol, Elo ajustado, xG) y usar la media
// ponderada. Ahí es donde entra la IA de verdad. El scaffolding está en
// `blendWithModel()` al final del archivo.
// ═══════════════════════════════════════════════════════════════════════════

import { ENGINE, bookWeight, isSharp } from "./config";
import { devig, edgePct, stakeUnits, confidenceScore } from "./devig";
import type { OddsEvent, Bookmaker } from "./odds";
import { isTradeableOdds } from "./odds";

export interface CandidatePick {
  eventId: string;
  market: "h2h" | "spreads" | "totals";
  selection: string;
  line: number | null;
  oddsTaken: number;
  book: string;
  bookTitle: string;
  modelProb: number;
  fairProb: number;
  edge: number;
  stake: number;
  confidence: number;
  bookCount: number;
  sharpCount: number;
  consensusOdds: number;
  rationale: string;
}

/** Clave que identifica una selección dentro de un mercado. */
function outcomeKey(name: string, point?: number): string {
  return point === undefined || point === null ? name : `${name}@${point}`;
}

/**
 * Consenso ponderado de probabilidad para un mercado.
 *
 * Importante: se de-viga CADA casa por separado ANTES de promediar.
 * Promediar cuotas con vig y de-vigar después mete un sesgo sistemático
 * porque cada casa tiene margen distinto. Este orden importa de verdad.
 */
export function consensusProbs(
  bookmakers: Bookmaker[],
  marketKey: string
): {
  probs: Map<string, number>;
  bestOdds: Map<string, { price: number; book: string; title: string }>;
  bookCount: number;
  sharpCount: number;
  lineByKey: Map<string, number | null>;
} {
  const weighted = new Map<string, { sum: number; w: number }>();
  const bestOdds = new Map<string, { price: number; book: string; title: string }>();
  const lineByKey = new Map<string, number | null>();
  let bookCount = 0;
  let sharpCount = 0;

  for (const bk of bookmakers) {
    const mk = bk.markets?.find((m) => m.key === marketKey);
    if (!mk || !mk.outcomes || mk.outcomes.length < 2) continue;

    const prices = mk.outcomes.map((o) => o.price);
    if (prices.some((p) => !isFinite(p) || p <= 1)) continue;

    // Devig de ESTA casa
    const fair = devig(prices, ENGINE.devigMethod);
    const w = bookWeight(bk.key);
    bookCount++;
    if (isSharp(bk.key)) sharpCount++;

    mk.outcomes.forEach((o, i) => {
      const key = outcomeKey(o.name, o.point);
      lineByKey.set(key, o.point ?? null);

      const cur = weighted.get(key) ?? { sum: 0, w: 0 };
      cur.sum += fair[i] * w;
      cur.w += w;
      weighted.set(key, cur);

      // Mejor cuota disponible = donde realmente apostarías
      const best = bestOdds.get(key);
      if (!best || o.price > best.price) {
        bestOdds.set(key, { price: o.price, book: bk.key, title: bk.title });
      }
    });
  }

  const probs = new Map<string, number>();
  for (const [k, v] of weighted) {
    if (v.w > 0) probs.set(k, v.sum / v.w);
  }

  return { probs, bestOdds, bookCount, sharpCount, lineByKey };
}

/** Normaliza probabilidades dentro de cada grupo de línea (spreads/totals). */
export function normalizeByLine(
  probs: Map<string, number>,
  lineByKey: Map<string, number | null>
): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const key of probs.keys()) {
    const line = lineByKey.get(key);
    const g = line === null || line === undefined ? "_" : String(Math.abs(line));
    const arr = groups.get(g) ?? [];
    arr.push(key);
    groups.set(g, arr);
  }

  const out = new Map<string, number>();
  for (const [, keys] of groups) {
    const total = keys.reduce((s, k) => s + (probs.get(k) ?? 0), 0);
    if (total <= 0) continue;
    for (const k of keys) out.set(k, (probs.get(k) ?? 0) / total);
  }
  return out;
}

function buildRationale(p: {
  selection: string;
  line: number | null;
  oddsTaken: number;
  consensusOdds: number;
  edge: number;
  bookTitle: string;
  bookCount: number;
  sharpCount: number;
  fairProb: number;
}): string {
  const lineTxt = p.line !== null ? ` ${p.line > 0 ? "+" : ""}${p.line}` : "";
  return [
    `El consenso ponderado de ${p.bookCount} casas (${p.sharpCount} sharp) sitúa`,
    `${p.selection}${lineTxt} en una probabilidad real del ${(p.fairProb * 100).toFixed(1)}%,`,
    `equivalente a una cuota justa de ${p.consensusOdds.toFixed(2)}.`,
    `${p.bookTitle} la está pagando a ${p.oddsTaken.toFixed(2)},`,
    `un ${p.edge.toFixed(1)}% de valor esperado sobre el precio de mercado.`,
    p.sharpCount >= 2
      ? "Las casas de margen bajo respaldan la lectura."
      : "Consenso construido sin apoyo sharp fuerte: tratar con cautela.",
  ].join(" ");
}

/**
 * Analiza un evento y devuelve todos los picks con valor.
 * No filtra por límite diario — eso lo hace el orquestador de ingesta.
 */
export function analyzeEvent(event: OddsEvent): CandidatePick[] {
  const picks: CandidatePick[] = [];
  const markets: Array<"h2h" | "spreads" | "totals"> = ["h2h", "spreads", "totals"];

  for (const marketKey of markets) {
    const { probs, bestOdds, bookCount, sharpCount, lineByKey } = consensusProbs(
      event.bookmakers ?? [],
      marketKey
    );

    if (bookCount < ENGINE.minBooksForConsensus) continue;

    const normalized =
      marketKey === "h2h" ? probs : normalizeByLine(probs, lineByKey);

    for (const [key, fairProb] of normalized) {
      const best = bestOdds.get(key);
      if (!best) continue;
      if (!isTradeableOdds(best.price)) continue;
      if (fairProb <= 0.02 || fairProb >= 0.98) continue;

      // modelProb = probabilidad real estimada.
      // En v1 es el consenso de mercado. En v2 se mezcla con modelo propio.
      const modelProb = fairProb;
      const edge = edgePct(modelProb, best.price);
      if (edge < ENGINE.minEdgePct) continue;

      // Filtro anti-outlier: si UNA sola casa está muy por encima del resto,
      // suele ser un error de línea que van a corregir (o un límite de $5).
      // Con >25% de desviación sobre la justa, desconfiamos.
      const consensusOdds = 1 / fairProb;
      if (best.price / consensusOdds > 1.25) continue;

      const line = lineByKey.get(key) ?? null;
      const selection = key.includes("@") ? key.split("@")[0] : key;
      const stake = stakeUnits(modelProb, best.price, ENGINE.kellyFraction);
      if (stake <= 0) continue;

      picks.push({
        eventId: event.id,
        market: marketKey,
        selection,
        line,
        oddsTaken: best.price,
        book: best.book,
        bookTitle: best.title,
        modelProb,
        fairProb,
        edge: Math.round(edge * 1000) / 1000,
        stake,
        confidence: confidenceScore(edge, bookCount, sharpCount),
        bookCount,
        sharpCount,
        consensusOdds: Math.round(consensusOdds * 1000) / 1000,
        rationale: buildRationale({
          selection,
          line,
          oddsTaken: best.price,
          consensusOdds,
          edge,
          bookTitle: best.title,
          bookCount,
          sharpCount,
          fairProb,
        }),
      });
    }
  }

  return picks;
}

/**
 * Ordena y recorta la cartera del día.
 * Máximo 1 pick por evento: correlacionar apuestas del mismo partido
 * dispara la varianza y rompe el supuesto de Kelly.
 */
export function selectDailyPortfolio(
  candidates: CandidatePick[],
  max = ENGINE.maxPicksPerDay
): CandidatePick[] {
  const byEvent = new Map<string, CandidatePick>();
  for (const c of candidates) {
    const cur = byEvent.get(c.eventId);
    if (!cur || c.edge > cur.edge) byEvent.set(c.eventId, c);
  }
  return [...byEvent.values()]
    .sort((a, b) => b.confidence - a.confidence || b.edge - a.edge)
    .slice(0, max);
}

/**
 * Asigna tier según convicción.
 * Los picks de mayor edge van a Elite primero — ese es literalmente el
 * producto que justifica el precio alto.
 */
export function assignTier(p: CandidatePick): "free" | "pro" | "elite" {
  // Los props, cuando se activen, van directos a Elite (mercados de nicho,
  // límites bajos, más ineficiencia). El tipo aún no los incluye en v1.
  if ((p.market as string) === "props") return "elite";
  if (p.confidence >= 5 && p.edge >= 6) return "elite";
  return "pro";
}

// ═══════════════════════════════════════════════════════════════════════════
// MEZCLA CON EL MODELO PROPIO (Dixon-Coles)
// ═══════════════════════════════════════════════════════════════════════════
//
// DATO MEDIDO, no opinión: sobre 207 partidos reales, el log loss de la línea
// de cierre del mercado es 0.9463 frente a 1.0898 de la frecuencia base.
// El mercado es un predictor muy fuerte. Un modelo propio que se le imponga
// con peso alto casi siempre EMPEORA las probabilidades.
//
// Por eso la mezcla es asimétrica y el peso del modelo propio está capado.
// El modelo no está para sustituir al mercado: está para detectar los casos
// concretos donde discrepa por una razón que el precio aún no refleja
// (rotaciones, calendario europeo, un ascendido mal valorado).

import type { DCParams, Prediction } from "./dixon-coles";
import { predict } from "./dixon-coles";

/** Peso máximo permitido al modelo propio. No subir sin re-validar log loss. */
export const MAX_OWN_WEIGHT = 0.35;

/**
 * Mezcla lineal de probabilidades y renormalización.
 *
 * La renormalización NO es opcional: mezclar tres probabilidades que suman 1
 * con otras tres que suman 1 da algo que suma 1 sólo si los pesos son iguales
 * para las tres. En cuanto filtras o ajustas una, deja de sumar y el edge
 * calculado después queda inflado.
 */
export function blendProbs(
  market: number[], own: number[], ownWeight: number
): number[] {
  const w = Math.max(0, Math.min(MAX_OWN_WEIGHT, ownWeight));
  const mixed = market.map((m, i) => m * (1 - w) + own[i] * w);
  const sum = mixed.reduce((a, b) => a + b, 0);
  return sum > 0 ? mixed.map((x) => x / sum) : market;
}

/**
 * Peso adaptativo según cuánto discrepan mercado y modelo.
 *
 * Contraintuitivo pero correcto: cuanta MÁS discrepancia, MENOS peso al
 * modelo propio. Una diferencia enorme casi nunca significa "he encontrado
 * algo que el mercado no ve" — significa que al modelo le falta información
 * que el mercado sí tiene (una lesión, una alineación, una noticia).
 *
 * La discrepancia pequeña y consistente es la que vale.
 */
export function adaptiveWeight(market: number[], own: number[], base = 0.25): number {
  const maxDiff = Math.max(...market.map((m, i) => Math.abs(m - own[i])));
  if (maxDiff > 0.20) return 0;            // desacuerdo extremo → ignorar modelo
  if (maxDiff > 0.12) return base * 0.4;
  if (maxDiff > 0.06) return base * 0.75;
  return base;
}

/**
 * Probabilidad final de un evento 1X2 combinando mercado y Dixon-Coles.
 * Si el modelo no cubre a alguno de los equipos, devuelve el mercado solo.
 */
export function combinedProbs(
  marketProbs: number[],
  dc: DCParams | null,
  home: string,
  away: string,
  baseWeight = 0.25
): { probs: number[]; ownWeight: number; own: Prediction | null } {
  if (!dc) return { probs: marketProbs, ownWeight: 0, own: null };

  const own = predict(dc, home, away);
  if (!own) return { probs: marketProbs, ownWeight: 0, own: null };

  const ownProbs = [own.home, own.draw, own.away];
  const w = adaptiveWeight(marketProbs, ownProbs, baseWeight);
  return { probs: blendProbs(marketProbs, ownProbs, w), ownWeight: w, own };
}

/** Compatibilidad con la v1. Prefiere combinedProbs(). */
export function blendWithModel(
  marketProb: number, ownModelProb: number, ownWeight = 0.2
): number {
  const w = Math.max(0, Math.min(MAX_OWN_WEIGHT, ownWeight));
  return marketProb * (1 - w) + ownModelProb * w;
}
