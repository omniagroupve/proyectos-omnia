// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE API-FOOTBALL (api-sports.io)
// Docs: https://www.api-football.com/documentation-v3
// ═══════════════════════════════════════════════════════════════════════════
//
// Por qué existe además de The Odds API: cobertura LatAm de verdad
// (Liga MX, Argentina, Brasileirão, Libertadores, Colombia, Chile, Perú) con
// fixtures, resultados oficiales, alineaciones, lesiones y temporadas
// históricas. The Odds API da precios; esta da la realidad del partido.
//
// Cuota: el plan Pro permite ~7.500 llamadas/día. Una llamada de fixtures por
// liga y día es nada. El contador viene en las cabeceras y se registra igual
// que los créditos de The Odds API.

const BASE = process.env.APIFOOTBALL_BASE || "https://v3.football.api-sports.io";

export interface ApiFootballQuota {
  remaining: number | null;
  limit: number | null;
}

export interface Fixture {
  id: number;
  leagueId: number;
  season: number;
  date: string;              // ISO
  statusShort: string;       // NS | 1H | HT | 2H | FT | PST | CANC…
  finished: boolean;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  homeScore: number | null;
  awayScore: number | null;
}

interface RawFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; season: number };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
}

const FINISHED = new Set(["FT", "AET", "PEN"]);

export function isApiFootballConfigured(): boolean {
  return Boolean(process.env.APIFOOTBALL_KEY);
}

function key(): string {
  const k = process.env.APIFOOTBALL_KEY;
  if (!k) throw new Error("Falta APIFOOTBALL_KEY en el entorno");
  return k;
}

async function get<T>(path: string, params: Record<string, string>): Promise<{ data: T; quota: ApiFootballQuota }> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": key() },
    cache: "no-store",
  });
  const n = (h: string) => { const v = res.headers.get(h); return v == null ? null : Number(v); };
  const quota: ApiFootballQuota = {
    remaining: n("x-ratelimit-requests-remaining"),
    limit: n("x-ratelimit-requests-limit"),
  };

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API-Football ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json() as { response: T; errors?: unknown };
  // La API devuelve 200 con `errors` poblado cuando la petición es inválida.
  if (json.errors && !Array.isArray(json.errors) && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  return { data: json.response, quota };
}

function mapFixture(r: RawFixture): Fixture {
  return {
    id: r.fixture.id,
    leagueId: r.league.id,
    season: r.league.season,
    date: r.fixture.date,
    statusShort: r.fixture.status.short,
    finished: FINISHED.has(r.fixture.status.short),
    homeTeam: r.teams.home,
    awayTeam: r.teams.away,
    homeScore: r.goals.home,
    awayScore: r.goals.away,
  };
}

/** Fixtures de una liga en un rango de fechas (YYYY-MM-DD). */
export async function fetchFixtures(leagueId: number, season: number, from: string, to: string) {
  const { data, quota } = await get<RawFixture[]>("/fixtures", {
    league: String(leagueId), season: String(season), from, to, timezone: "UTC",
  });
  return { fixtures: data.map(mapFixture), quota };
}

/** Resultados de los últimos N días de una liga. */
export async function fetchRecentResults(leagueId: number, season: number, days = 3) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const { fixtures, quota } = await fetchFixtures(leagueId, season, iso(from), iso(to));
  return { fixtures: fixtures.filter((f) => f.finished), quota };
}

/** Temporada activa de una liga (la API la marca con `current`). */
export async function fetchCurrentSeason(leagueId: number): Promise<number | null> {
  const { data } = await get<Array<{ seasons: Array<{ year: number; current: boolean }> }>>(
    "/leagues", { id: String(leagueId) }
  );
  const seasons = data[0]?.seasons ?? [];
  return seasons.find((s) => s.current)?.year ?? seasons.at(-1)?.year ?? null;
}

// ─── Emparejado de equipos ────────────────────────────────────────────────
// Los proveedores escriben distinto el mismo equipo ("Club América" vs
// "America" vs "CF America"). Normalizamos agresivamente antes de comparar y
// dejamos que `team_aliases` resuelva lo que la normalización no cubra.

export function normalizeTeam(name: string): string {
  return name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|cd|ca|sc|ac|afc|club|deportivo|atletico|athletic)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** ¿Son el mismo equipo? Compara normalizado y por prefijo largo. */
export function sameTeam(a: string, b: string): boolean {
  const x = normalizeTeam(a), y = normalizeTeam(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 5 && long.startsWith(short);
}
