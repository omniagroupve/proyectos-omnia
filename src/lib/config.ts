// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN CENTRAL · precios, deportes y pesos del modelo
// ═══════════════════════════════════════════════════════════════════════════

export type TierId = "free" | "pro" | "elite";

/**
 * PRICING SÁNDWICH (efecto decoy) · calibrado para LatAm
 * ──────────────────────────────────────────────────────
 * Free  → el producto de verdad para el recreativo. Monetiza por AFILIACIÓN,
 *         que es el ingreso principal del negocio, no un extra.
 * Pro   → el plan que QUIERES vender. Destapa los números al que ya entiende.
 * Elite → el ancla. Su trabajo es hacer que Pro parezca la opción sensata.
 *
 * POR QUÉ ESTOS PRECIOS Y NO $197/$497:
 * La regla del 5% (abajo) exige un bankroll de 20× el precio mensual. A $197
 * eso son $3.940, que excluye a prácticamente todo el mercado LatAm. A $19 son
 * $380: el bankroll real de un apostador habitual de la región. El precio alto
 * no era caro, era matemáticamente incompatible con nuestro propio ICP.
 *
 * Elite a 2.6× Pro mantiene el efecto sándwich: a esa distancia nadie compara
 * funcionalidades, simplemente lee Pro como "la opción razonable".
 */
export const TIERS = {
  free: {
    id: "free" as const,
    name: "Free",
    price: 0,
    priceLabel: "$0",
    cadence: "para siempre",
    tagline: "Arma parlays y compara cuotas sin pagar nada",
    features: [
      "Parlays con IA todos los días",
      "Comparador de cuotas de todas las casas de tu país",
      "Calculadora de valor esperado, sin registro",
      "Track record público completo",
    ],
    limits: [
      "Los parlays llegan con 3h de retraso",
      "Sin alertas por Telegram",
      "Con publicidad",
    ],
    cta: "Empezar gratis",
    highlight: false,
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    price: 19,
    priceLabel: "$19",
    cadence: "/ mes",
    tagline: "Para quien ya sabe que la cuota importa más que el pronóstico",
    features: [
      "Parlays en tiempo real, sin retraso",
      "Parlays con IA ilimitados",
      "Alertas instantáneas por Telegram",
      "CLV y track record completo de cada pick",
      "Stake sugerido sobre tu bankroll (Kelly fraccionado)",
      "Tu rendimiento personal, no el nuestro",
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
    price: 49,
    priceLabel: "$49",
    cadence: "/ mes",
    tagline: "Para bankroll alto. Plazas limitadas por diseño.",
    features: [
      "Todo lo de Pro",
      "Player props y mercados en vivo",
      "Picks de alta convicción antes que el resto",
      "Modelo de arbitraje y middles",
      "Acceso a la API de picks",
      "Línea directa con el equipo cuantitativo",
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

/**
 * Bankroll mínimo recomendado para cada plan, según la regla del 5%.
 * Es 20× el precio mensual. Se enseña en el propio comparador de planes:
 * decirle a alguien que NO compre es lo que hace que el que compra se quede.
 */
export function minBankrollFor(tier: TierId): number {
  return TIERS[tier].price * 20;
}

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
  /**
   * 1 = se sondea cada 2h · 2 = cada 4h · 3 = cada 8h.
   * No es sólo un orden: es el presupuesto de créditos (ver POLL_HOURS).
   */
  priority: 1 | 2 | 3;
  /** País principal, para destacar la liga local a cada visitante. */
  country?: string;
}

/**
 * CONTROL DE CRÉDITOS · por qué el sondeo va escalonado
 * ──────────────────────────────────────────────────────
 * Una llamada a /odds cuesta (nº mercados × nº regiones) créditos: con
 * h2h+spreads+totals en eu+us son 6 por liga y llamada.
 *
 * Sondear las 29 ligas cada 2h serían 10.440 llamadas/mes. Escalonando por
 * prioridad bajan a 6.750, que es lo que permite cubrir toda LatAm dentro del
 * plan más barato de The Odds API sin bajar el umbral de valor: el objetivo es
 * que SIEMPRE haya algo que enseñar, a cualquier hora y en cualquier país.
 */
export const POLL_HOURS: Record<1 | 2 | 3, number> = { 1: 2, 2: 4, 3: 8 };

/**
 * Qué ligas tocan a esta hora. El cron corre cada 2h y llama a esto, así que
 * el escalonado es automático y no hay que acordarse de nada.
 */
export function leaguesForHour(utcHour: number): LeagueConfig[] {
  return LEAGUES.filter((l) => utcHour % POLL_HOURS[l.priority] === 0);
}

/**
 * Universo de competiciones. Cubre toda LatAm porque el producto tiene que
 * tener algo que enseñar cada día, en cualquier país y a cualquier hora.
 *
 * Los `key` son sport_keys de The Odds API y cambian cuando una competición
 * está fuera de temporada. `npm run leagues:verify` los contrasta contra el
 * endpoint /sports (que es gratis y no consume créditos) y avisa de los que
 * ya no existen o están inactivos. Córrelo al configurar la API key y una vez
 * al mes.
 */
export const LEAGUES: LeagueConfig[] = [
  // ── Fútbol · LatAm (el corazón del producto) ────────────────────────────
  { key: "soccer_mexico_ligamx",              slug: "liga-mx",           name: "Liga MX",                    group: "Fútbol", seo: true, priority: 1, country: "MX" },
  { key: "soccer_argentina_primera_division", slug: "liga-argentina",    name: "Liga Profesional Argentina", group: "Fútbol", seo: true, priority: 1, country: "AR" },
  { key: "soccer_brazil_campeonato",          slug: "brasileirao",       name: "Brasileirão",                group: "Fútbol", seo: true, priority: 1, country: "BR" },
  { key: "soccer_colombia_primera_a",         slug: "liga-colombia",     name: "Liga BetPlay",               group: "Fútbol", seo: true, priority: 1, country: "CO" },
  { key: "soccer_chile_campeonato",           slug: "liga-chile",        name: "Primera División de Chile",  group: "Fútbol", seo: true, priority: 1, country: "CL" },
  { key: "soccer_conmebol_copa_libertadores", slug: "libertadores",      name: "Copa Libertadores",          group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_conmebol_copa_sudamericana", slug: "sudamericana",      name: "Copa Sudamericana",          group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_brazil_serie_b",             slug: "brasileirao-b",     name: "Brasileirão Série B",        group: "Fútbol", seo: true, priority: 3, country: "BR" },
  { key: "soccer_peru_primera_division",      slug: "liga-peru",         name: "Liga 1 de Perú",             group: "Fútbol", seo: true, priority: 3, country: "PE" },

  // ── Fútbol · Europa (la que ve todo LatAm) ──────────────────────────────
  { key: "soccer_spain_la_liga",              slug: "laliga",            name: "LaLiga",                     group: "Fútbol", seo: true, priority: 1, country: "ES" },
  { key: "soccer_uefa_champs_league",         slug: "champions",         name: "Champions League",           group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_epl",                        slug: "premier",           name: "Premier League",             group: "Fútbol", seo: true, priority: 1 },
  { key: "soccer_italy_serie_a",              slug: "serie-a",           name: "Serie A",                    group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_germany_bundesliga",         slug: "bundesliga",        name: "Bundesliga",                 group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_france_ligue_one",           slug: "ligue-1",           name: "Ligue 1",                    group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_uefa_europa_league",         slug: "europa-league",     name: "Europa League",              group: "Fútbol", seo: true, priority: 2 },
  { key: "soccer_spain_segunda_division",     slug: "laliga-2",          name: "LaLiga Hypermotion",         group: "Fútbol", seo: true, priority: 3, country: "ES" },
  { key: "soccer_portugal_primeira_liga",     slug: "liga-portugal",     name: "Primeira Liga",              group: "Fútbol", seo: true, priority: 3 },
  { key: "soccer_netherlands_eredivisie",     slug: "eredivisie",        name: "Eredivisie",                 group: "Fútbol", seo: true, priority: 3 },
  { key: "soccer_usa_mls",                    slug: "mls",               name: "MLS",                        group: "Fútbol", seo: true, priority: 2 },

  // ── USA · el relleno perfecto para la madrugada de LatAm ────────────────
  { key: "basketball_nba",                    slug: "nba",               name: "NBA",                        group: "Baloncesto", seo: true, priority: 1 },
  { key: "americanfootball_nfl",              slug: "nfl",               name: "NFL",                        group: "Fútbol americano", seo: true, priority: 1 },
  { key: "baseball_mlb",                      slug: "mlb",               name: "MLB",                        group: "Béisbol", seo: true, priority: 1 },
  { key: "icehockey_nhl",                     slug: "nhl",               name: "NHL",                        group: "Hockey", seo: true, priority: 3 },
  { key: "americanfootball_ncaaf",            slug: "ncaaf",             name: "NCAA Football",              group: "Fútbol americano", seo: false, priority: 3 },
  { key: "basketball_ncaab",                  slug: "ncaab",             name: "NCAA Basketball",            group: "Baloncesto", seo: false, priority: 3 },

  // ── Otros deportes ──────────────────────────────────────────────────────
  { key: "basketball_euroleague",             slug: "euroliga",          name: "Euroliga",                   group: "Baloncesto", seo: true, priority: 3 },
  { key: "mma_mixed_martial_arts",            slug: "ufc",               name: "UFC / MMA",                  group: "MMA", seo: true, priority: 2 },
  { key: "soccer_fifa_world_cup",             slug: "mundial",           name: "Mundial",                    group: "Fútbol", seo: true, priority: 1 },
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
