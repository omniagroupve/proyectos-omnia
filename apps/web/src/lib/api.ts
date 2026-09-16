// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE DE LA API DE PIX
// ═══════════════════════════════════════════════════════════════════════════
//
// Único punto por el que el frontend habla con el backend. Se encarga de:
//   · adjuntar el JWT de Supabase en cada llamada
//   · convertir `{ error: { code, message } }` en una excepción tipada
//   · pasar el país elegido por el usuario como ?country=
//
// Los tipos vienen del backend por alias (`@pix/contract` → src/lib/api-types.ts).
// No los redefinas aquí: si cambian allí, esto deja de compilar, que es
// exactamente lo que queremos.

import type {
  Sport, League, Jurisdiction, EventSummary, EventOdds, Pick, Parlay,
  ParlayEvaluation, BuildParlayRequest, BuildParlayResponse,
  EvaluateParlayRequest, ExplainParlayResponse, Me, UserParlay,
  SaveUserParlayRequest, Performance,
} from "@pix/contract";
import { currentToken } from "./supabase";

const BASE = (import.meta.env.VITE_API_URL ?? "") + "/api/v1";

export class PixApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = "PixApiError";
  }
  /** true cuando hace falta iniciar sesión. */
  get needsAuth() { return this.status === 401; }
  /** true cuando el plan del usuario no alcanza, o se agotó su cuota diaria. */
  get needsUpgrade() { return this.status === 403 || this.status === 429; }
}

/** País elegido a mano. Si es null manda la IP; el idioma nunca decide. */
let country: string | null = null;
export function setCountry(code: string | null) {
  country = code;
  try { if (code) localStorage.setItem("pix.country", code); } catch { /* modo privado */ }
}
export function getCountry(): string | null {
  if (country) return country;
  try { country = localStorage.getItem("pix.country"); } catch { /* modo privado */ }
  return country;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await currentToken();
  const url = new URL(BASE + path, window.location.origin);
  const c = getCountry();
  if (c && !url.searchParams.has("country")) url.searchParams.set("country", c);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    throw new PixApiError(e?.code ?? "unknown", e?.message ?? `Error ${res.status}`, res.status);
  }
  return body as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  // ── Catálogo ──────────────────────────────────────────────────────────
  sports: () => get<{ items: Sport[] }>("/sports"),
  leagues: (sport?: string) => get<{ items: League[]; country: string | null }>(
    `/leagues${sport ? `?sport=${encodeURIComponent(sport)}` : ""}`
  ),
  jurisdictions: () => get<{ items: Jurisdiction[]; detected: string | null }>("/jurisdictions"),

  // ── Partidos y cuotas ─────────────────────────────────────────────────
  events: (opts: { league?: string; sport?: string; from?: string; to?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(opts)) if (v != null) q.set(k, String(v));
    return get<{ items: EventSummary[] }>(`/events${q.toString() ? `?${q}` : ""}`);
  },
  eventOdds: (eventId: string) => get<EventOdds>(`/events/${encodeURIComponent(eventId)}/odds`),

  // ── Picks y parlays ───────────────────────────────────────────────────
  picks: (status: "open" | "settled" | "all" = "open", league?: string) =>
    get<{ items: Pick[] }>(`/picks?status=${status}${league ? `&league=${encodeURIComponent(league)}` : ""}`),

  parlays: (status: "open" | "settled" = "open") =>
    get<{ items: Parlay[] }>(`/parlays?status=${status}`),

  /** Construye un parlay con IA. Lanza PixApiError con needsUpgrade si se agotó la cuota. */
  buildParlay: (req: BuildParlayRequest) => post<BuildParlayResponse>("/parlays/build", req),

  /** Calculadora pública: no necesita sesión. */
  evaluateParlay: (req: EvaluateParlayRequest) => post<ParlayEvaluation>("/parlays/evaluate", req),

  explainParlay: (parlayId: string, question: string) =>
    post<ExplainParlayResponse>(`/parlays/${encodeURIComponent(parlayId)}/explain`, { question }),

  /** Datos de ejemplo. Funciona siempre, incluso sin base de datos ni claves. */
  demo: () => get<{ demo: true; parlays: Parlay[]; events: unknown[] }>("/parlays/demo"),

  // ── Usuario ───────────────────────────────────────────────────────────
  me: () => get<Me>("/me"),
  updateMe: (patch: Partial<{ countryCode: string; locale: string; bankroll: number; displayName: string }>) =>
    request<{ ok: true }>("/me", { method: "PATCH", body: JSON.stringify(patch) }),
  myParlays: () => get<{ items: UserParlay[] }>("/me/parlays"),
  saveParlay: (req: SaveUserParlayRequest) => post<UserParlay>("/me/parlays", req),

  // ── Track record ──────────────────────────────────────────────────────
  performance: () => get<Performance>("/performance"),
};

export type { Sport, League, Jurisdiction, EventSummary, EventOdds, Pick, Parlay,
  ParlayEvaluation, BuildParlayRequest, BuildParlayResponse, Me, UserParlay, Performance };
