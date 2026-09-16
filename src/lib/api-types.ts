// ═══════════════════════════════════════════════════════════════════════════
// CONTRATO DE LA API v1 · tipos compartidos con el frontend (apps/web)
// Importar tal cual desde el front: no redefinir.
// ═══════════════════════════════════════════════════════════════════════════

export type Tier = "free" | "pro" | "elite";
export type Market = "h2h" | "spreads" | "totals";
export type RiskLevel = "low" | "medium" | "high";
export type PickResult = "pending" | "win" | "loss" | "push" | "void";
export type ParlayStatus = "draft" | "published" | "won" | "lost" | "push" | "void";
export type ParlayOrigin = "engine" | "ai" | "user" | "mixed";

export interface ApiError {
  error: { code: string; message: string };
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

// ─── Catálogo ────────────────────────────────────────────────────────────

export interface Sport {
  key: string;
  name: string;
}

export interface League {
  slug: string;
  sportKey: string;
  name: string;
  countryCode: string | null;
  featured: boolean;
}

export interface Jurisdiction {
  code: string;
  name: string;
  currency: string;
  timezone: string;
}

// ─── Eventos y cuotas ────────────────────────────────────────────────────

export interface OutcomePrice {
  selection: string;
  line: number | null;
  bestOdds: number;
  bestBook: string;
  fairOdds: number;
  fairProb: number;
  edgePct: number;
}

export interface EventSummary {
  id: string;
  leagueSlug: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  completed: boolean;
  homeScore: number | null;
  awayScore: number | null;
  markets: Partial<Record<Market, OutcomePrice[]>>;
}

export interface BookQuote {
  book: string;
  title: string;
  affiliateUrl: string | null;
  licensed: boolean;
  markets: Partial<Record<Market, Array<{ selection: string; line: number | null; odds: number }>>>;
}

export interface EventOdds {
  eventId: string;
  capturedAt: string;
  books: BookQuote[];
}

// ─── Picks ───────────────────────────────────────────────────────────────

export interface PickEventRef {
  homeTeam: string;
  awayTeam: string;
  leagueSlug: string;
  commenceTime: string;
}

export interface Pick {
  id: string;
  eventId: string;
  event: PickEventRef;
  market: Market;
  selection: string;
  line: number | null;
  oddsTaken: number;
  book: string;
  fairProb: number;
  edgePct: number;
  stakeUnits: number;
  confidence: number;
  rationale: string | null;
  tierRequired: Tier;
  publishedAt: string;
  result: PickResult;
  closingOdds: number | null;
  clvPct: number | null;
  profitUnits: number | null;
}

// ─── Parlays ─────────────────────────────────────────────────────────────

export interface ParlayLegInput {
  eventId: string;
  market: Market;
  selection: string;
  line?: number | null;
  odds: number;
  /** Opcional: si falta, el servidor la resuelve desde el consenso del evento. */
  fairProb?: number;
  book?: string;
}

export interface ParlayLeg extends ParlayLegInput {
  fairProb: number;
  book: string;
  label: string;
  edgePct: number;
  rationale: string | null;
  result?: PickResult;
  closingOdds?: number | null;
  clvPct?: number | null;
}

export interface ParlayEvaluation {
  legs: ParlayLeg[];
  legsCount: number;
  jointProb: number;
  combinedOdds: number;
  fairOdds: number;
  edgePct: number;
  stakeUnits: number;
  /** Importe sugerido en la moneda del usuario si mandó bankroll. */
  stakeAmount: number | null;
  warnings: string[];
  errors: string[];
  valid: boolean;
}

export interface Parlay extends ParlayEvaluation {
  id: string;
  origin: ParlayOrigin;
  risk: RiskLevel;
  title: string;
  summary: string | null;
  tierRequired: Tier;
  status: ParlayStatus;
  publishedAt: string;
  closingOdds: number | null;
  clvPct: number | null;
  profitUnits: number | null;
}

export interface BuildParlayRequest {
  /** Deportes o ligas a considerar. Vacío = todo lo disponible en el país. */
  sports?: string[];
  leagues?: string[];
  legs?: number;
  risk?: RiskLevel;
  /** Texto libre del usuario: "algo de Liga MX y NBA para esta noche". */
  prompt?: string;
  bankroll?: number;
  /** Cuántas alternativas devolver (1-3). */
  count?: number;
}

export interface BuildParlayResponse {
  parlays: Parlay[];
  /** Cómo interpretó la IA la petición (para mostrar "entendí: …"). */
  intent: {
    sports: string[];
    leagues: string[];
    legs: number;
    risk: RiskLevel;
    window: { from: string; to: string };
  };
  aiRequestId: string | null;
  /**
   * Presente cuando `parlays` viene vacío. No es un error: con esos filtros
   * no había valor real, y bajar el umbral para fabricar uno sería engañar.
   * `suggestion` trae qué proponerle al usuario para que encuentre algo.
   */
  noValue?: {
    reason: string;
    suggestion: string;
    candidatesConsidered: number;
  };
}

export interface EvaluateParlayRequest {
  legs: ParlayLegInput[];
  bankroll?: number;
}

export interface ExplainParlayRequest {
  question: string;
}

export interface ExplainParlayResponse {
  answer: string;
  aiRequestId: string;
}

// ─── Usuario ─────────────────────────────────────────────────────────────

export interface Me {
  id: string;
  email: string | null;
  displayName: string | null;
  tier: Tier;
  tierExpiresAt: string | null;
  countryCode: string | null;
  locale: string;
  bankroll: number;
  currency: string;
  aiBuildsToday: number;
  aiBuildsLimit: number | null;
}

export interface UserParlay extends ParlayEvaluation {
  id: string;
  origin: ParlayOrigin;
  title: string | null;
  status: ParlayStatus;
  stakeAmount: number | null;
  resultUnits: number | null;
  clvPct: number | null;
  createdAt: string;
  settledAt: string | null;
}

export interface SaveUserParlayRequest {
  title?: string;
  legs: ParlayLegInput[];
  stakeAmount?: number;
  sourceParlayId?: string;
}

// ─── Rendimiento público ─────────────────────────────────────────────────

export interface Performance {
  picks: {
    total: number;
    wins: number;
    losses: number;
    pushes: number;
    netUnits: number;
    roiPct: number;
    hitRatePct: number;
    avgClvPct: number;
    clvBeatPct: number;
  } | null;
  parlays: {
    total: number;
    won: number;
    lost: number;
    netUnits: number;
    roiPct: number;
    avgClvPct: number;
    avgCombinedOdds: number;
  } | null;
}
