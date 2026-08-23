// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN CENTRAL · precios, deportes y pesos del modelo
// ═══════════════════════════════════════════════════════════════════════════

export type TierId = "free" | "pro" | "elite";

/**
 * PRICING SÁNDWICH (efecto decoy)
 * ────────────────────────────────
 * Free  → captura el tráfico SEO. Se monetiza con ads + afiliados.
 * Pro   → el plan que QUIERES vender. Todo el valor real.
 * Elite → el ancla. Su trabajo principal es hacer que Pro parezca barato.
 *
 * Regla: Elite ≈ 2.5x Pro. Si Elite fuera 1.3x, la gente compararía features.
 * A 2.5x nadie compara: Pro se lee como "la opción sensata".
 */
export const TIERS = {
  free: {
    id: "free" as const,
    name: "Free",
    price: 0,
    priceLabel: "$0",
    cadence: "para siempre",
    tagline: "Prueba el track record antes de pagar",
    features: [
      "1 pick al día, con 3h de retraso",
      "Track record histórico completo y auditable",
      "Análisis previos de todos los partidos",
      "Calculadora de valor esperado",
    ],
    limits: [
      "Sin picks en tiempo real",
      "Sin props ni live",
      "Con publicidad",
    ],
    cta: "Empezar gratis",
    highlight: false,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    price: 197,
    priceLabel: "$197",
    cadence: "/ mes",
    tagline: "Para quien apuesta en serio con bankroll de $5k+",
    features: [
      "Todos los picks en tiempo real (sin retraso)",
      "Alertas instantáneas por Telegram y email",
      "Todos los deportes y mercados principales",
      "Stake sugerido con Kelly fraccionado sobre tu bankroll",
      "Dashboard de rendimiento personal (tu ROI, no el nuestro)",
      "Comparador de cuotas entre casas",
      "Sin publicidad",
    ],
    limits: [],
    cta: "Empezar con Pro",
    highlight: true,
    badge: "El más elegido",
  },
  elite: {
    id: "elite" as const,
    name: "Elite",
    price: 497,
    priceLabel: "$497",
    cadence: "/ mes",
    tagline: "Bankroll de $25k+. Plazas limitadas por diseño.",
    features: [
      "Todo lo de Pro",
      "Player props y mercados en vivo",
      "Picks de alta convicción antes que el resto del mercado",
      "Modelo de arbitraje y middles",
      "Sesión 1:1 mensual de gestión de bankroll",
      "Línea directa con el equipo cuantitativo",
      "Acceso a la API de picks",
    ],
    limits: [],
    cta: "Solicitar plaza",
    highlight: false,
    /**
     * El cap NO es marketing: los picks mueven la línea.
     * Más suscriptores Elite = peor cuota para todos = producto peor.
     */
    seatCap: 50,
  },
} satisfies Record<TierId, Record<string, unknown>>;

export const TIER_ORDER: TierId[] = ["free", "pro", "elite"];

export function tierRank(t: TierId): number {
  return TIER_ORDER.indexOf(t);
}

export function canAccess(userTier: TierId, required: TierId): boolean {
  return tierRank(userTier) >= tierRank(required);
}

// ─── Retraso del plan free ────────────────────────────────────────────────
// 3h después de publicar. Suficiente para que la línea ya se haya movido:
// el free ve que el pick era bueno, pero no puede aprovecharlo. Eso convierte.
export const FREE_DELAY_HOURS = 3;

// ═══════════════════════════════════════════════════════════════════════════
// DEPORTES · "todos desde el día 1"
// El campo `seo` marca los que generan páginas programáticas en español.
// ═══════════════════════════════════════════════════════════════════════════

export interface LeagueConfig {
  key: string;        // sport_key de The Odds API
  slug: string;       // slug de URL
  name: string;       // nombre en español
  group: string;
  seo: boolean;
  priority: number;   // 1 = máxima. Ordena la ingesta si el presupuesto aprieta.
}

export const LEAGUES: LeagueConfig[] = [
  // ── Fútbol · España y LatAm (máxima prioridad SEO en español)
  { key: "soccer_spain_la_liga",       slug: "laliga",        name: "LaLiga",                group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_uefa_champs_league",  slug: "champions",     name: "Champions League",      group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_epl",                 slug: "premier",       name: "Premier League",        group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_mexico_ligamx",       slug: "liga-mx",       name: "Liga MX",               group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_conmebol_copa_libertadores", slug: "libertadores", name: "Copa Libertadores", group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_italy_serie_a",       slug: "serie-a",       name: "Serie A",               group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_germany_bundesliga",  slug: "bundesliga",    name: "Bundesliga",            group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_france_ligue_one",    slug: "ligue-1",       name: "Ligue 1",               group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_argentina_primera_division", slug: "liga-argentina", name: "Liga Profesional Argentina", group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_brazil_campeonato",   slug: "brasileirao",   name: "Brasileirão",           group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_uefa_europa_league",  slug: "europa-league", name: "Europa League",         group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_usa_mls",             slug: "mls",           name: "MLS",                   group: "Fútbol", seo: true, priority: 3 },

  // ── USA
  { key: "basketball_nba",             slug: "nba",           name: "NBA",                   group: "Baloncesto", seo: true, priority: 1 },
  { key: "americanfootball_nfl",       slug: "nfl",           name: "NFL",                   group: "Fútbol americano", seo: true, priority: 1 },
  { key: "baseball_mlb",               slug: "mlb",           name: "MLB",                   group: "Béisbol", seo: true, priority: 1 },
  { key: "icehockey_nhl",              slug: "nhl",           name: "NHL",                   group: "Hockey", seo: true, priority: 3 },
  { key: "americanfootball_ncaaf",     slug: "ncaaf",         name: "NCAA Football",         group: "Fútbol americano", seo: false, priority: 3 },
  { key: "basketball_ncaab",           slug: "ncaab",         name: "NCAA Basketball",       group: "Baloncesto", seo: false, priority: 3 },

  // ── Otros
  { key: "basketball_euroleague",      slug: "euroliga",      name: "Euroliga",              group: "Baloncesto", seo: true, priority: 3 },
  { key: "tennis_atp_aus_open_singles",slug: "atp",           name: "ATP",                   group: "Tenis", seo: true, priority: 2 },
  { key: "mma_mixed_martial_arts",     slug: "ufc",           name: "UFC / MMA",             group: "MMA", seo: true, priority: 2 },
];

export const SEO_LEAGUES = LEAGUES.filter((l) => l.seo);

export function leagueBySlug(slug: string): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.slug === slug);
}

export function leagueByKey(key: string): LeagueConfig | undefined {
  return LEAGUES.find((l) => l.key === key);
}

// ═══════════════════════════════════════════════════════════════════════════
// PESOS DE CASAS · el consenso NO es un promedio simple
// ═══════════════════════════════════════════════════════════════════════════
// Pinnacle y Circa operan con margen bajo y aceptan apostadores ganadores:
// su línea es la mejor estimación pública de la probabilidad real.
// Las casas "blandas" (recreativas) se desvían y ahí es donde vive tu edge.

export const SHARP_BOOKS: Record<string, number> = {
  pinnacle: 5.0,
  circasports: 4.0,
  betfair_ex_eu: 3.5,
  betfair_ex_uk: 3.5,
  matchbook: 3.0,
  betonlineag: 2.0,
  lowvig: 2.0,
};

export const DEFAULT_BOOK_WEIGHT = 1.0;

export function bookWeight(key: string): number {
  return SHARP_BOOKS[key] ?? DEFAULT_BOOK_WEIGHT;
}

export function isSharp(key: string): boolean {
  return (SHARP_BOOKS[key] ?? 0) >= 3;
}

// ─── Umbrales del motor ───────────────────────────────────────────────────
export const ENGINE = {
  minEdgePct: Number(process.env.MIN_EDGE_PCT ?? 2.0),
  maxPicksPerDay: Number(process.env.MAX_PICKS_PER_DAY ?? 25),
  kellyFraction: Number(process.env.KELLY_FRACTION ?? 0.25),
  devigMethod: (process.env.DEVIG_METHOD ?? "power") as "power" | "multiplicative" | "shin",
  minBooksForConsensus: 4,   // menos de 4 casas = consenso poco fiable
  maxOdds: 8.0,              // por encima de esto la varianza mata el bankroll
  minOdds: 1.35,
};
