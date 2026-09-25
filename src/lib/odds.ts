// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE THE ODDS API
// Docs: https://the-odds-api.com/liveapi/guides/v4/
// ═══════════════════════════════════════════════════════════════════════════
//
// OJO CON LOS CRÉDITOS: una llamada a /odds cuesta
//   créditos = nº de mercados × nº de regiones
//
// Con el escalonado por prioridad de `leaguesForHour`, las 29 ligas salen a
// 225 llamadas/día = 6.750/mes. Lo que decide el plan es cuántos mercados y
// regiones pidas encima de esas llamadas:
//
//   h2h + eu            →   6.750 créditos/mes   plan de $30 (20k): sobra
//   h2h + eu,us         →  13.500                plan de $30: cabe
//   3 mercados + eu,us  →  40.500                aquí sí hace falta el de $59
//
// Por eso .env.example arranca en h2h + eu: spreads y totals se encienden
// cuando el negocio los pague. `npm run doctor` calcula esto con la
// configuración real y dice qué plan toca.

import { ENGINE } from "./config.ts";

const BASE = process.env.ODDS_API_BASE || "https://api.the-odds-api.com/v4";

/**
 * FRENO DE MANO GLOBAL
 * ────────────────────
 * Con PIX_PAUSE_EXTERNAL=1 ninguna llamada de pago sale a la red, en ningún
 * archivo. Sirve para desarrollar y dejar trabajar a un agente sin que un
 * bucle mal escrito se coma los créditos del mes.
 *
 * Los crons lo consultan arriba y salen limpio; el guardia de `get()` es la
 * segunda barrera, por si alguien añade una ruta nueva y se le olvida mirar.
 */
export function externalPaused(): boolean {
  return process.env.PIX_PAUSE_EXTERNAL === "1";
}

export class ExternalPausedError extends Error {
  constructor(api = "The Odds API") {
    super(`${api} en pausa (PIX_PAUSE_EXTERNAL=1). No se hizo ninguna llamada.`);
    this.name = "ExternalPausedError";
  }
}

export interface Outcome {
  name: string;
  price: number;   // decimal
  point?: number;  // línea de spread/total
}

export interface Market {
  key: string;           // h2h | spreads | totals
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface ScoreEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
}

export interface QuotaInfo {
  remaining: number | null;
  used: number | null;
  lastCost: number | null;
}

function apiKey(): string {
  const k = process.env.ODDS_API_KEY;
  if (!k) throw new Error("Falta ODDS_API_KEY en el entorno");
  return k;
}

function readQuota(res: Response): QuotaInfo {
  const n = (h: string) => {
    const v = res.headers.get(h);
    return v == null ? null : Number(v);
  };
  return {
    remaining: n("x-requests-remaining"),
    used: n("x-requests-used"),
    lastCost: n("x-requests-last"),
  };
}

async function get<T>(path: string, params: Record<string, string>): Promise<{ data: T; quota: QuotaInfo }> {
  if (externalPaused()) throw new ExternalPausedError();

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("apiKey", apiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const quota = readQuota(res);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Odds API ${res.status}: ${body.slice(0, 300)}`);
  }
  return { data: (await res.json()) as T, quota };
}

/** Cuotas en vivo de una liga. */
export async function fetchOdds(
  sportKey: string,
  opts: { regions?: string; markets?: string; oddsFormat?: string } = {}
) {
  return get<OddsEvent[]>(`/sports/${sportKey}/odds`, {
    regions: opts.regions ?? process.env.ODDS_REGIONS ?? "eu,us",
    markets: opts.markets ?? process.env.ODDS_MARKETS ?? "h2h,spreads,totals",
    oddsFormat: opts.oddsFormat ?? "decimal",
    dateFormat: "iso",
  });
}

/** Resultados. daysFrom permite recuperar partidos ya terminados. */
export async function fetchScores(sportKey: string, daysFrom = 2) {
  return get<ScoreEvent[]>(`/sports/${sportKey}/scores`, {
    daysFrom: String(daysFrom),
    dateFormat: "iso",
  });
}

/**
 * Snapshot histórico de cuotas — cuesta 10x créditos.
 * Úsalo SOLO para el backtest inicial, nunca en producción continua.
 */
export async function fetchHistoricalOdds(sportKey: string, isoDate: string) {
  return get<{ timestamp: string; data: OddsEvent[] }>(
    `/historical/sports/${sportKey}/odds`,
    {
      regions: process.env.ODDS_REGIONS ?? "eu",
      markets: "h2h",
      oddsFormat: "decimal",
      date: isoDate,
    }
  );
}

/** Ligas disponibles en la cuenta (gratis, no consume créditos). */
export async function fetchSports() {
  return get<{ key: string; title: string; active: boolean }[]>("/sports", {});
}

// ─── Utilidades ────────────────────────────────────────────────────────────

/** URL-slug estable y legible para SEO. */
export function eventSlug(e: { home_team: string; away_team: string; commence_time: string }): string {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const date = e.commence_time.slice(0, 10);
  return `${norm(e.home_team)}-vs-${norm(e.away_team)}-${date}`;
}

/** ¿El evento está dentro de la ventana de cierre? (para marcar closing line) */
export function isNearClose(commenceTime: string, minutes = 30): boolean {
  const diff = new Date(commenceTime).getTime() - Date.now();
  return diff > 0 && diff <= minutes * 60_000;
}

/** Filtra cuotas fuera del rango operativo. */
export function isTradeableOdds(o: number): boolean {
  return o >= ENGINE.minOdds && o <= ENGINE.maxOdds;
}
