// Datos de ejemplo realistas para que el frontend avance sin claves.
// Todo lo que sale de aquí va marcado como demo: nunca es historial real.

import type { Parlay } from "./api-types.ts";

const tonight = (h: number) => {
  const d = new Date();
  d.setUTCHours(h, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
};

export const DEMO_PARLAYS: Parlay[] = [
  {
    id: "demo-1",
    origin: "ai",
    risk: "medium",
    title: "Noche LatAm · 3 piernas",
    summary:
      "Tres favoritos con precio por encima de su cuota justa: América en casa, Boca con la línea a favor y un total que el mercado sharp respalda.",
    tierRequired: "pro",
    status: "published",
    publishedAt: new Date().toISOString(),
    legsCount: 3,
    jointProb: 0.1632,
    combinedOdds: 7.41,
    fairOdds: 6.127,
    edgePct: 20.9,
    stakeUnits: 1.2,
    stakeAmount: null,
    closingOdds: null,
    clvPct: null,
    profitUnits: null,
    warnings: [],
    errors: [],
    valid: true,
    legs: [
      {
        eventId: "demo-ev-1", market: "h2h", selection: "Club América", line: null,
        odds: 1.95, fairProb: 0.56, book: "Caliente", label: "Club América vs Chivas · Gana América",
        edgePct: 9.2, rationale: "El consenso de 28 casas sitúa a América en 56 %. Caliente paga 1.95: cuota justa 1.79.",
      },
      {
        eventId: "demo-ev-2", market: "spreads", selection: "Boca Juniors", line: -0.5,
        odds: 2.10, fairProb: 0.52, book: "Betano", label: "Boca vs Racing · Boca −0.5",
        edgePct: 9.2, rationale: "Pinnacle y Betfair tienen a Boca en 52 %. Betano lo paga como si fuera 47 %.",
      },
      {
        eventId: "demo-ev-3", market: "totals", selection: "Over", line: 2.5,
        odds: 1.81, fairProb: 0.56, book: "Bet365", label: "Flamengo vs Palmeiras · Más de 2.5",
        edgePct: 1.4, rationale: "Ambos llegan con 3+ goles de media en sus últimos cinco. El mercado lo pone en 56 %.",
      },
    ],
  },
  {
    id: "demo-2",
    origin: "ai",
    risk: "low",
    title: "Seguro NBA · 2 piernas",
    summary: "Dos favoritos claros de la jornada NBA donde una casa recreativa se quedó por encima del consenso.",
    tierRequired: "free",
    status: "published",
    publishedAt: new Date().toISOString(),
    legsCount: 2,
    jointProb: 0.5183,
    combinedOdds: 2.13,
    fairOdds: 1.929,
    edgePct: 10.4,
    stakeUnits: 2.4,
    stakeAmount: null,
    closingOdds: null,
    clvPct: null,
    profitUnits: null,
    warnings: [],
    errors: [],
    valid: true,
    legs: [
      {
        eventId: "demo-ev-4", market: "h2h", selection: "Boston Celtics", line: null,
        odds: 1.42, fairProb: 0.74, book: "Betsson", label: "Celtics vs Hornets · Ganan Celtics",
        edgePct: 5.1, rationale: "74 % de probabilidad justa. 1.42 equivale a 70 %.",
      },
      {
        eventId: "demo-ev-5", market: "h2h", selection: "Denver Nuggets", line: null,
        odds: 1.50, fairProb: 0.70, book: "Codere", label: "Nuggets vs Jazz · Ganan Nuggets",
        edgePct: 5.0, rationale: "Jokić confirmado. El consenso sharp da 70 %; Codere paga como si fuera 67 %.",
      },
    ],
  },
  {
    id: "demo-3",
    origin: "engine",
    risk: "high",
    title: "Libertadores · 4 piernas",
    summary: "Cuatro cuotas altas con valor. Alta varianza: stake pequeño por diseño.",
    tierRequired: "elite",
    status: "lost",
    publishedAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
    legsCount: 4,
    jointProb: 0.0361,
    combinedOdds: 33.2,
    fairOdds: 27.7,
    edgePct: 19.9,
    stakeUnits: 0.4,
    stakeAmount: null,
    closingOdds: 30.1,
    clvPct: 10.3,
    profitUnits: -0.4,
    warnings: ["Cuota combinada 33.20 por encima del tope recomendado (25)."],
    errors: [],
    valid: true,
    legs: [
      { eventId: "demo-ev-6", market: "h2h", selection: "Draw", line: null, odds: 3.40, fairProb: 0.31, book: "Pinnacle", label: "Peñarol vs Nacional · Empate", edgePct: 5.4, rationale: null, result: "win" },
      { eventId: "demo-ev-7", market: "h2h", selection: "Atlético Nacional", line: null, odds: 2.30, fairProb: 0.46, book: "Betano", label: "Atl. Nacional vs São Paulo · Gana Nacional", edgePct: 5.8, rationale: null, result: "loss" },
      { eventId: "demo-ev-8", market: "totals", selection: "Under", line: 2.5, odds: 1.90, fairProb: 0.55, book: "Bet365", label: "Colo-Colo vs Cerro Porteño · Menos de 2.5", edgePct: 4.5, rationale: null, result: "win" },
      { eventId: "demo-ev-9", market: "h2h", selection: "River Plate", line: null, odds: 2.24, fairProb: 0.46, book: "Codere", label: "Talleres vs River · Gana River", edgePct: 3.0, rationale: null, result: "win" },
    ],
  },
];

export const DEMO_EVENTS_TONIGHT = [
  { id: "demo-ev-1", leagueSlug: "liga-mx", sportKey: "soccer", homeTeam: "Club América", awayTeam: "Chivas", commenceTime: tonight(2) },
  { id: "demo-ev-2", leagueSlug: "liga-argentina", sportKey: "soccer", homeTeam: "Boca Juniors", awayTeam: "Racing", commenceTime: tonight(0) },
  { id: "demo-ev-3", leagueSlug: "brasileirao", sportKey: "soccer", homeTeam: "Flamengo", awayTeam: "Palmeiras", commenceTime: tonight(23) },
  { id: "demo-ev-4", leagueSlug: "nba", sportKey: "basketball", homeTeam: "Boston Celtics", awayTeam: "Charlotte Hornets", commenceTime: tonight(0) },
  { id: "demo-ev-5", leagueSlug: "nba", sportKey: "basketball", homeTeam: "Denver Nuggets", awayTeam: "Utah Jazz", commenceTime: tonight(2) },
];

/**
 * PISCINA DE SELECCIONES · lo que el usuario puede tocar en /armar
 * ────────────────────────────────────────────────────────────────
 * Con base de datos, el constructor usa los picks reales del motor. Sin ella,
 * usa esto: así la pantalla más importante del producto funciona recién
 * clonado el repo, sin claves y sin gastar un crédito.
 *
 * `fairProb` es la probabilidad justa (ya de-vigada) y es lo que permite que
 * `/api/v1/parlays/evaluate` haga la matemática de verdad sobre estas piernas
 * sin tocar la base de datos. Los números son plausibles, no inventados al
 * azar: cada cuota está por encima de su justa en el margen que dice el edge.
 */
export interface DemoCandidate {
  eventId: string;
  label: string;          // "Club América vs Chivas"
  pick: string;           // "Gana América"
  market: "h2h" | "spreads" | "totals";
  selection: string;
  line: number | null;
  odds: number;
  fairProb: number;
  book: string;
  league: string;
  sport: string;
  commenceTime: string;
  rationale: string;
}

export const DEMO_CANDIDATES: DemoCandidate[] = [
  {
    eventId: "demo-ev-1", label: "Club América vs Chivas", pick: "Gana América",
    market: "h2h", selection: "Club América", line: null, odds: 1.95, fairProb: 0.56,
    book: "Caliente", league: "Liga MX", sport: "Fútbol", commenceTime: tonight(2),
    rationale: "El consenso de 28 casas sitúa a América en 56 %. Caliente paga 1.95 · cuota justa 1.79.",
  },
  {
    eventId: "demo-ev-1", label: "Club América vs Chivas", pick: "Más de 2.5 goles",
    market: "totals", selection: "Over", line: 2.5, odds: 2.05, fairProb: 0.51,
    book: "Betano", league: "Liga MX", sport: "Fútbol", commenceTime: tonight(2),
    rationale: "Cuatro de los últimos cinco Clásicos pasaron de 2.5. El mercado lo pone en 51 %.",
  },
  {
    eventId: "demo-ev-2", label: "Boca Juniors vs Racing", pick: "Boca −0.5",
    market: "spreads", selection: "Boca Juniors", line: -0.5, odds: 2.10, fairProb: 0.52,
    book: "Betano", league: "Liga Argentina", sport: "Fútbol", commenceTime: tonight(0),
    rationale: "Pinnacle y Betfair tienen a Boca en 52 %. Betano lo paga como si fuera 47 %.",
  },
  {
    eventId: "demo-ev-2", label: "Boca Juniors vs Racing", pick: "Menos de 2.5 goles",
    market: "totals", selection: "Under", line: 2.5, odds: 1.72, fairProb: 0.60,
    book: "bplay", league: "Liga Argentina", sport: "Fútbol", commenceTime: tonight(0),
    rationale: "Los dos últimos Boca–Racing acabaron 1-0. Las casas sharp lo ven en 60 %.",
  },
  {
    eventId: "demo-ev-3", label: "Flamengo vs Palmeiras", pick: "Más de 2.5 goles",
    market: "totals", selection: "Over", line: 2.5, odds: 1.81, fairProb: 0.56,
    book: "Bet365", league: "Brasileirão", sport: "Fútbol", commenceTime: tonight(23),
    rationale: "Ambos llegan con 3+ goles de media en sus últimos cinco. El mercado lo pone en 56 %.",
  },
  {
    eventId: "demo-ev-3", label: "Flamengo vs Palmeiras", pick: "Gana Flamengo",
    market: "h2h", selection: "Flamengo", line: null, odds: 2.25, fairProb: 0.47,
    book: "Betano", league: "Brasileirão", sport: "Fútbol", commenceTime: tonight(23),
    rationale: "Flamengo en el Maracaná: 47 % para el consenso, 44 % implícito en Betano.",
  },
  {
    eventId: "demo-ev-4", label: "Celtics vs Hornets", pick: "Gana Boston",
    market: "h2h", selection: "Boston Celtics", line: null, odds: 1.28, fairProb: 0.81,
    book: "Bet365", league: "NBA", sport: "Baloncesto", commenceTime: tonight(0),
    rationale: "Favorito claro. 81 % para el consenso frente al 78 % implícito de la cuota.",
  },
  {
    eventId: "demo-ev-4", label: "Celtics vs Hornets", pick: "Boston −9.5",
    market: "spreads", selection: "Boston Celtics", line: -9.5, odds: 1.90, fairProb: 0.55,
    book: "Caliente", league: "NBA", sport: "Baloncesto", commenceTime: tonight(0),
    rationale: "La línea sharp está en −10.5. Caliente la deja en −9.5 al mismo precio.",
  },
  {
    eventId: "demo-ev-5", label: "Nuggets vs Jazz", pick: "Gana Denver",
    market: "h2h", selection: "Denver Nuggets", line: null, odds: 1.36, fairProb: 0.76,
    book: "Betano", league: "NBA", sport: "Baloncesto", commenceTime: tonight(2),
    rationale: "76 % para el consenso. La cuota implica 73,5 %: hay 2,5 puntos de margen.",
  },
  {
    eventId: "demo-ev-5", label: "Nuggets vs Jazz", pick: "Más de 224.5 puntos",
    market: "totals", selection: "Over", line: 224.5, odds: 1.87, fairProb: 0.55,
    book: "bplay", league: "NBA", sport: "Baloncesto", commenceTime: tonight(2),
    rationale: "Dos de los ataques más rápidos de la liga. El total sharp está en 227.5.",
  },
];
