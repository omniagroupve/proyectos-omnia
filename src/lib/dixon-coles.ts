// ═══════════════════════════════════════════════════════════════════════════
// DIXON-COLES · modelo cuantitativo propio para fútbol
// ═══════════════════════════════════════════════════════════════════════════
//
// El v1 del motor sólo leía el mercado. Esto es un modelo PROPIO que estima
// la probabilidad de cada resultado desde cero, a partir de goles marcados y
// encajados. Es lo que permite discrepar del mercado en vez de sólo comparar
// casas entre sí.
//
// LA MATEMÁTICA
// ─────────────
// Cada equipo tiene dos parámetros latentes:
//   α_i  fuerza atacante   (cuántos goles marca)
//   β_i  fuerza defensiva  (cuántos encaja)
// Más un parámetro global γ de ventaja de campo.
//
//   λ (goles esperados local)    = exp(α_local + β_visitante + γ)
//   μ (goles esperados visitante)= exp(α_visitante + β_local)
//
// Si los goles fueran Poisson independientes, P(x,y) = Pois(x;λ)·Pois(y;μ).
// Pero NO son independientes: los partidos de pocos goles están correlacionados
// (0-0 y 1-1 ocurren más de lo que Poisson predice; el equipo que va ganando
// 1-0 se echa atrás). Dixon y Coles (1997) lo corrigen con τ:
//
//   τ(0,0) = 1 − λμρ      τ(0,1) = 1 + λρ
//   τ(1,0) = 1 + μρ       τ(1,1) = 1 − ρ        resto = 1
//
// Sin esa corrección el modelo infravalora sistemáticamente el empate — que es
// justo donde el backtest detectó que vive el valor. Por eso importa.
//
// DECAIMIENTO TEMPORAL
// ────────────────────
// Un partido de hace 3 años no dice nada del equipo de hoy. Cada partido pesa
// exp(−ξ · días). ξ≈0.003 ≈ media vida de 8 meses, el valor que Dixon-Coles
// encontró óptimo y que réplicas posteriores confirman.

export interface Match {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  daysAgo: number;
}

export interface DCParams {
  attack: Map<string, number>;
  defence: Map<string, number>;
  homeAdv: number;
  rho: number;
}

export interface DCConfig {
  xi: number;          // decaimiento temporal
  maxGoals: number;    // truncado de la matriz de resultados
  iterations: number;
  learningRate: number;
}

export const DC_DEFAULTS: DCConfig = {
  xi: 0.003,
  maxGoals: 10,
  iterations: 400,
  learningRate: 0.06,
};

// ─── Utilidades ────────────────────────────────────────────────────────────

const logFactCache = [0, 0];
function logFactorial(n: number): number {
  for (let i = logFactCache.length; i <= n; i++) {
    logFactCache[i] = logFactCache[i - 1] + Math.log(i);
  }
  return logFactCache[n];
}

/** log P(k; λ) de una Poisson. En logaritmos para no desbordar. */
function logPoisson(k: number, lambda: number): number {
  if (lambda <= 0) return -Infinity;
  return k * Math.log(lambda) - lambda - logFactorial(k);
}

function poisson(k: number, lambda: number): number {
  return Math.exp(logPoisson(k, lambda));
}

/**
 * Corrección de dependencia para resultados bajos.
 * rho se acota a (−1, 0.2): fuera de ahí τ puede volverse negativo y la
 * verosimilitud deja de tener sentido.
 */
function tau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

// ─── Ajuste por máxima verosimilitud ───────────────────────────────────────

/**
 * Vector de parámetros: [attack × T, defence × T, homeAdv, rho]
 *
 * Restricción de identificabilidad: la media de los ataques se fija a 0.
 * Sin ella el modelo es degenerado — puedes sumar una constante a todos los
 * ataques y restarla de todas las defensas sin cambiar nada, y el optimizador
 * se va a la deriva.
 */
function packTeams(matches: Match[]): string[] {
  const set = new Set<string>();
  for (const m of matches) { set.add(m.home); set.add(m.away); }
  return [...set].sort();
}

function negLogLikelihood(
  v: number[], matches: Match[], teams: string[], idx: Map<string, number>, xi: number
): number {
  const T = teams.length;
  const homeAdv = v[2 * T];
  const rho = v[2 * T + 1];
  let nll = 0;

  for (const m of matches) {
    const hi = idx.get(m.home)!;
    const ai = idx.get(m.away)!;
    const lambda = Math.exp(v[hi] + v[T + ai] + homeAdv);
    const mu = Math.exp(v[ai] + v[T + hi]);
    if (!isFinite(lambda) || !isFinite(mu) || lambda <= 0 || mu <= 0) return 1e12;

    const t = tau(m.homeGoals, m.awayGoals, lambda, mu, rho);
    if (t <= 0) return 1e12;   // rho inválido para este partido

    const w = Math.exp(-xi * m.daysAgo);
    nll -= w * (Math.log(t) + logPoisson(m.homeGoals, lambda) + logPoisson(m.awayGoals, mu));
  }
  return nll;
}

/**
 * Optimizador: Adam con gradiente por diferencias centrales.
 *
 * ¿Por qué no gradiente analítico? Porque τ hace las derivadas parciales
 * feas y propensas a errores de signo. La verosimilitud se evalúa en O(N),
 * así que el gradiente numérico cuesta O(N·P) por paso — con 40 equipos y
 * 15.000 partidos son décimas de segundo. No merece la pena el riesgo de
 * un bug silencioso en la derivada.
 */
export function fitDixonColes(
  matches: Match[],
  config: Partial<DCConfig> = {}
): DCParams {
  const cfg = { ...DC_DEFAULTS, ...config };
  const teams = packTeams(matches);
  const T = teams.length;
  const idx = new Map(teams.map((t, i) => [t, i]));

  // Inicialización informada: log de la media de goles marcados/encajados.
  // Arrancar en ceros converge igual pero tarda 3-4x más.
  const scored = new Map<string, number[]>();
  const conceded = new Map<string, number[]>();
  for (const t of teams) { scored.set(t, []); conceded.set(t, []); }
  for (const m of matches) {
    scored.get(m.home)!.push(m.homeGoals);
    conceded.get(m.home)!.push(m.awayGoals);
    scored.get(m.away)!.push(m.awayGoals);
    conceded.get(m.away)!.push(m.homeGoals);
  }
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 1);
  const globalMean = mean(matches.flatMap((m) => [m.homeGoals, m.awayGoals]));

  const v = new Array(2 * T + 2).fill(0);
  for (let i = 0; i < T; i++) {
    v[i] = Math.log(Math.max(0.2, mean(scored.get(teams[i])!)) / Math.max(0.2, globalMean));
    v[T + i] = Math.log(Math.max(0.2, mean(conceded.get(teams[i])!)) / Math.max(0.2, globalMean));
  }
  v[2 * T] = 0.25;    // ventaja de campo típica en fútbol europeo
  v[2 * T + 1] = -0.05;

  // Adam
  const m1 = new Array(v.length).fill(0);
  const m2 = new Array(v.length).fill(0);
  const b1 = 0.9, b2 = 0.999, eps = 1e-8;
  const h = 1e-5;

  for (let step = 1; step <= cfg.iterations; step++) {
    const grad = new Array(v.length).fill(0);
    for (let p = 0; p < v.length; p++) {
      const orig = v[p];
      v[p] = orig + h; const up = negLogLikelihood(v, matches, teams, idx, cfg.xi);
      v[p] = orig - h; const dn = negLogLikelihood(v, matches, teams, idx, cfg.xi);
      v[p] = orig;
      grad[p] = (up - dn) / (2 * h);
    }

    for (let p = 0; p < v.length; p++) {
      m1[p] = b1 * m1[p] + (1 - b1) * grad[p];
      m2[p] = b2 * m2[p] + (1 - b2) * grad[p] * grad[p];
      const mh = m1[p] / (1 - Math.pow(b1, step));
      const vh = m2[p] / (1 - Math.pow(b2, step));
      v[p] -= cfg.learningRate * mh / (Math.sqrt(vh) + eps);
    }

    // Restricción de identificabilidad: media de ataques = 0
    let s = 0;
    for (let i = 0; i < T; i++) s += v[i];
    const shift = s / T;
    for (let i = 0; i < T; i++) { v[i] -= shift; v[T + i] += shift; }

    // rho acotado
    v[2 * T + 1] = Math.max(-0.9, Math.min(0.2, v[2 * T + 1]));
  }

  return {
    attack: new Map(teams.map((t, i) => [t, v[i]])),
    defence: new Map(teams.map((t, i) => [t, v[T + i]])),
    homeAdv: v[2 * T],
    rho: v[2 * T + 1],
  };
}

// ─── Predicción ────────────────────────────────────────────────────────────

export interface Prediction {
  home: number; draw: number; away: number;
  lambda: number; mu: number;
  over25: number; under25: number;
  bttsYes: number;
  topScores: { score: string; p: number }[];
}

/**
 * Probabilidades 1X2 a partir de la matriz de resultados.
 * Si un equipo no está en el modelo (recién ascendido, primera aparición)
 * devolvemos null en vez de inventar: mejor no publicar pick que publicar uno
 * basado en parámetros que no existen.
 */
export function predict(
  p: DCParams, home: string, away: string, maxGoals = DC_DEFAULTS.maxGoals
): Prediction | null {
  const ah = p.attack.get(home), dh = p.defence.get(home);
  const aa = p.attack.get(away), da = p.defence.get(away);
  if (ah === undefined || dh === undefined || aa === undefined || da === undefined) return null;

  const lambda = Math.exp(ah + da + p.homeAdv);
  const mu = Math.exp(aa + dh);

  let pH = 0, pD = 0, pA = 0, over = 0, btts = 0, total = 0;
  const scores: { score: string; p: number }[] = [];

  for (let x = 0; x <= maxGoals; x++) {
    for (let y = 0; y <= maxGoals; y++) {
      const prob = tau(x, y, lambda, mu, p.rho) * poisson(x, lambda) * poisson(y, mu);
      if (!isFinite(prob) || prob < 0) continue;
      total += prob;
      if (x > y) pH += prob; else if (x === y) pD += prob; else pA += prob;
      if (x + y > 2.5) over += prob;
      if (x > 0 && y > 0) btts += prob;
      scores.push({ score: `${x}-${y}`, p: prob });
    }
  }

  if (total <= 0) return null;
  scores.sort((a, b) => b.p - a.p);

  return {
    home: pH / total, draw: pD / total, away: pA / total,
    lambda, mu,
    over25: over / total, under25: 1 - over / total,
    bttsYes: btts / total,
    topScores: scores.slice(0, 5).map((s) => ({ score: s.score, p: s.p / total })),
  };
}

// ─── Métricas de calibración ───────────────────────────────────────────────
//
// Un modelo que ACIERTA mucho pero está mal calibrado es inútil para apostar:
// necesitas que cuando dice 30% ocurra el 30% de las veces, no sólo que ordene
// bien los resultados. Estas dos métricas miden justo eso.

/** Log loss multiclase. Más bajo mejor. Castiga con dureza la confianza errónea. */
export function logLoss(probs: number[][], actual: number[]): number {
  let s = 0;
  for (let i = 0; i < actual.length; i++) {
    s -= Math.log(Math.max(1e-15, probs[i][actual[i]]));
  }
  return s / actual.length;
}

/** Brier score multiclase (0 = perfecto, 2 = pésimo). */
export function brierScore(probs: number[][], actual: number[]): number {
  let s = 0;
  for (let i = 0; i < actual.length; i++) {
    for (let k = 0; k < 3; k++) {
      const o = actual[i] === k ? 1 : 0;
      s += (probs[i][k] - o) ** 2;
    }
  }
  return s / actual.length;
}
