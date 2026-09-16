// Resumen de un evento a partir de su snapshot de cuotas:
// mejor cuota por selección + cuota justa del consenso. Alimenta /events y
// la resolución de fairProb cuando el usuario manda sus propias piernas.

import { consensusProbs, normalizeByLine } from "./model.ts";
import { edgePct } from "./devig.ts";
import type { Bookmaker } from "./odds.ts";
import type { Market, OutcomePrice } from "./api-types.ts";

const MARKETS: Market[] = ["h2h", "spreads", "totals"];

export function summarizeMarkets(bookmakers: Bookmaker[]): Partial<Record<Market, OutcomePrice[]>> {
  const out: Partial<Record<Market, OutcomePrice[]>> = {};
  for (const mk of MARKETS) {
    const { probs, bestOdds, bookCount, lineByKey } = consensusProbs(bookmakers, mk);
    if (bookCount === 0) continue;
    const normalized = mk === "h2h" ? probs : normalizeByLine(probs, lineByKey);
    const rows: OutcomePrice[] = [];
    for (const [key, fairProb] of normalized) {
      const best = bestOdds.get(key);
      if (!best || fairProb <= 0) continue;
      rows.push({
        selection: key.includes("@") ? key.split("@")[0] : key,
        line: lineByKey.get(key) ?? null,
        bestOdds: best.price,
        bestBook: best.title,
        fairOdds: Math.round((1 / fairProb) * 1000) / 1000,
        fairProb: Math.round(fairProb * 1e5) / 1e5,
        edgePct: Math.round(edgePct(fairProb, best.price) * 1000) / 1000,
      });
    }
    if (rows.length) out[mk] = rows;
  }
  return out;
}

/** Probabilidad justa de una selección concreta, o null si no está en el snapshot. */
export function fairProbFor(
  bookmakers: Bookmaker[],
  market: Market,
  selection: string,
  line: number | null | undefined
): number | null {
  const rows = summarizeMarkets(bookmakers)[market] ?? [];
  const hit = rows.find(
    (r) => r.selection.toLowerCase() === selection.toLowerCase() &&
      ((line ?? null) === null ? r.line === null : Math.abs((r.line ?? NaN) - (line as number)) < 1e-9)
  );
  return hit?.fairProb ?? null;
}
