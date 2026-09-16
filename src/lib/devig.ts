// ═══════════════════════════════════════════════════════════════════════════
// DEVIG · quitar el margen de la casa para obtener probabilidad justa
// ═══════════════════════════════════════════════════════════════════════════
//
// Una cuota de 2.00 NO significa 50%. La casa mete su margen (vig/juice),
// así que las probabilidades implícitas de un mercado suman >100%.
// Sin quitar ese margen, TODO parece que tiene valor. Este archivo es la
// diferencia entre un modelo real y un generador de picks aleatorios.
//
// Tres métodos, de peor a mejor:
//   multiplicative — divide todo por el overround. Rápido, sesga favoritos.
//   power          — resuelve p_i = q_i^k. Corrige el favourite-longshot bias.
//   shin           — modela el % de apostadores informados. El estándar en
//                    literatura académica para mercados de 2-3 vías.
// ═══════════════════════════════════════════════════════════════════════════

export type DevigMethod = "multiplicative" | "power" | "shin";

/** Cuota decimal → probabilidad implícita (todavía CON vig). */
export function impliedProb(decimalOdds: number): number {
  if (!isFinite(decimalOdds) || decimalOdds <= 1) return 0;
  return 1 / decimalOdds;
}

/** Probabilidad → cuota decimal. */
export function probToOdds(p: number): number {
  if (p <= 0 || p >= 1) return NaN;
  return 1 / p;
}

/** Suma de probabilidades implícitas. 1.05 = 5% de margen de la casa. */
export function overround(odds: number[]): number {
  return odds.reduce((s, o) => s + impliedProb(o), 0);
}

/** Margen de la casa expresado en % (el "vig" o "juice"). */
export function vigPct(odds: number[]): number {
  return (overround(odds) - 1) * 100;
}

// ─── Método 1: multiplicativo ──────────────────────────────────────────────
// p_i = q_i / Σq
// Reparte el margen proporcionalmente. Asume que la casa carga el mismo % a
// todas las selecciones, lo cual es falso: cargan más a los underdogs.
export function devigMultiplicative(odds: number[]): number[] {
  const q = odds.map(impliedProb);
  const sum = q.reduce((a, b) => a + b, 0);
  if (sum <= 0) return odds.map(() => 0);
  return q.map((x) => x / sum);
}

// ─── Método 2: power ───────────────────────────────────────────────────────
// Busca k tal que Σ(q_i^k) = 1. Como k > 1, penaliza más a las cuotas
// altas (underdogs), que es exactamente donde las casas cargan más margen.
// Resuelto por bisección — converge en ~40 iteraciones, sobra.
export function devigPower(odds: number[], tol = 1e-10): number[] {
  const q = odds.map(impliedProb);
  const sum = q.reduce((a, b) => a + b, 0);
  if (sum <= 0) return odds.map(() => 0);
  if (Math.abs(sum - 1) < tol) return q;

  const f = (k: number) => q.reduce((s, x) => s + Math.pow(x, k), 0) - 1;

  let lo = 0.5;
  let hi = 3.0;
  // Asegurar cambio de signo antes de bisecar
  let guard = 0;
  while (f(lo) * f(hi) > 0 && guard++ < 60) {
    lo = Math.max(0.05, lo - 0.25);
    hi = hi + 0.5;
  }
  if (f(lo) * f(hi) > 0) return devigMultiplicative(odds); // fallback seguro

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = f(mid);
    if (Math.abs(v) < tol) { lo = hi = mid; break; }
    if (f(lo) * v < 0) hi = mid; else lo = mid;
  }
  const k = (lo + hi) / 2;
  const p = q.map((x) => Math.pow(x, k));
  const norm = p.reduce((a, b) => a + b, 0);
  return p.map((x) => x / norm); // normalización final por seguridad numérica
}

// ─── Método 3: Shin ────────────────────────────────────────────────────────
// Modela z = proporción de dinero de apostadores con información privilegiada.
// p_i = ( sqrt(z² + 4(1-z) · q_i²/Σq) - z ) / (2(1-z))
// Es el método que mejor replica los precios de cierre en la literatura.
export function devigShin(odds: number[]): number[] {
  const q = odds.map(impliedProb);
  const sum = q.reduce((a, b) => a + b, 0);
  if (sum <= 0) return odds.map(() => 0);
  if (Math.abs(sum - 1) < 1e-10) return q;

  const solveFor = (z: number) =>
    q.map(
      (qi) =>
        (Math.sqrt(z * z + 4 * (1 - z) * ((qi * qi) / sum)) - z) / (2 * (1 - z))
    );

  let lo = 1e-9;
  let hi = 0.5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const s = solveFor(mid).reduce((a, b) => a + b, 0);
    if (Math.abs(s - 1) < 1e-12) { lo = hi = mid; break; }
    if (s > 1) lo = mid; else hi = mid;
  }
  const z = (lo + hi) / 2;
  const p = solveFor(z);
  const norm = p.reduce((a, b) => a + b, 0);
  return norm > 0 ? p.map((x) => x / norm) : devigPower(odds);
}

/** Dispatcher. */
export function devig(odds: number[], method: DevigMethod = "power"): number[] {
  if (odds.length < 2) return odds.map(() => 0);
  switch (method) {
    case "multiplicative": return devigMultiplicative(odds);
    case "shin":           return devigShin(odds);
    default:               return devigPower(odds);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE · KELLY · CLV
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ventaja esperada sobre la apuesta, en %.
 * edge = (prob_real × cuota) − 1
 * Con cuota 2.10 y prob real 52% → 0.52·2.10 − 1 = +9.2% de EV.
 */
export function edgePct(trueProb: number, decimalOdds: number): number {
  return (trueProb * decimalOdds - 1) * 100;
}

/**
 * Criterio de Kelly: fracción del bankroll que maximiza el crecimiento
 * geométrico a largo plazo.
 *   f* = (b·p − q) / b   donde b = cuota−1, q = 1−p
 *
 * Kelly COMPLETO es matemáticamente óptimo pero prácticamente suicida:
 * asume que tu estimación de p es exacta. No lo es. Por eso se fracciona.
 * 0.25 (cuarto de Kelly) es el estándar de la industria.
 */
export function kellyFraction(
  trueProb: number,
  decimalOdds: number,
  fraction = 0.25
): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const f = (b * trueProb - (1 - trueProb)) / b;
  // Epsilon, no `<= 0`: en coma flotante una ventaja exactamente nula sale
  // como 7.4e-17 y acabaríamos apostando en mercados sin edge.
  return f <= 1e-9 ? 0 : f * fraction;
}

/**
 * Stake en unidades (1 unidad = 1% del bankroll por defecto).
 * Se capa a 5 unidades: ningún pick individual merece más riesgo,
 * por muy bueno que parezca el edge.
 */
export function stakeUnits(
  trueProb: number,
  decimalOdds: number,
  fraction = 0.25,
  cap = 5
): number {
  const f = kellyFraction(trueProb, decimalOdds, fraction);
  return Math.min(cap, Math.round(f * 100 * 10) / 10);
}

/**
 * CLV · Closing Line Value — LA métrica.
 * ─────────────────────────────────────────
 * Compara la cuota que cogiste con la cuota de cierre del mercado.
 * CLV positivo sostenido = tu modelo predice mejor que el mercado.
 *
 * Por qué importa más que el ROI: el ROI de 100 picks es ruido — puedes
 * tener +30% con suerte y modelo malo. El CLV converge muchísimo más rápido.
 * Si vendes suscripciones, esto es lo que hace tu track record defendible.
 */
export function clvPct(oddsTaken: number, closingOdds: number): number {
  if (!closingOdds || closingOdds <= 1) return 0;
  return (oddsTaken / closingOdds - 1) * 100;
}

/** Beneficio en unidades de un pick liquidado. */
export function profitUnits(
  result: "win" | "loss" | "push" | "void",
  units: number,
  decimalOdds: number
): number {
  switch (result) {
    case "win":  return Math.round(units * (decimalOdds - 1) * 100) / 100;
    case "loss": return -units;
    default:     return 0;
  }
}

/** Confianza 1-5 a partir del edge y del tamaño del consenso. */
export function confidenceScore(edge: number, bookCount: number, sharpCount: number): number {
  let score = 1;
  if (edge >= 2) score = 2;
  if (edge >= 4) score = 3;
  if (edge >= 6) score = 4;
  if (edge >= 9) score = 5;
  if (bookCount < 6) score -= 1;          // consenso flojo
  if (sharpCount === 0) score -= 1;       // ninguna casa sharp en la muestra
  if (sharpCount >= 2) score += 1;
  return Math.max(1, Math.min(5, score));
}

/** Americano → decimal. Útil si añades otra fuente de cuotas. */
export function americanToDecimal(american: number): number {
  return american > 0 ? american / 100 + 1 : 100 / Math.abs(american) + 1;
}

/** Decimal → americano. Para mostrar a usuarios de US. */
export function decimalToAmerican(dec: number): number {
  return dec >= 2
    ? Math.round((dec - 1) * 100)
    : Math.round(-100 / (dec - 1));
}
