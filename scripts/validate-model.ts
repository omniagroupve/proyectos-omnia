// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIÓN DEL MODELO
// ═══════════════════════════════════════════════════════════════════════════
// Dos pruebas independientes:
//
//  A) RECUPERACIÓN DE PARÁMETROS (datos sintéticos)
//     Generamos una liga con fuerzas de equipo CONOCIDAS, simulamos partidos,
//     ajustamos el modelo y comprobamos si recupera las fuerzas originales.
//     Si no las recupera, el optimizador está roto y cualquier resultado sobre
//     datos reales sería casualidad.
//
//  B) CALIBRACIÓN DEL MERCADO (datos reales)
//     Medimos log loss y Brier de la línea de mercado sobre partidos reales.
//     Es la vara de medir: cualquier modelo propio tiene que batir esto para
//     aportar algo.

import { fitDixonColes, predict, logLoss, brierScore, type Match } from "../src/lib/dixon-coles.ts";
import { devig } from "../src/lib/devig.ts";
import { readFileSync } from "node:fs";

// RNG con semilla — sin esto la validación no es reproducible
let seed = 20260822;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

const logFact: number[] = [0, 0];
function lf(n: number) { for (let i = logFact.length; i <= n; i++) logFact[i] = logFact[i - 1] + Math.log(i); return logFact[n]; }
const pois = (k: number, l: number) => Math.exp(k * Math.log(l) - l - lf(k));
function tau(x: number, y: number, l: number, m: number, r: number) {
  if (x === 0 && y === 0) return 1 - l * m * r;
  if (x === 0 && y === 1) return 1 + l * r;
  if (x === 1 && y === 0) return 1 + m * r;
  if (x === 1 && y === 1) return 1 - r;
  return 1;
}

function sampleScore(l: number, m: number, r: number): [number, number] {
  const cells: [number, number, number][] = [];
  let tot = 0;
  for (let x = 0; x <= 9; x++) for (let y = 0; y <= 9; y++) {
    const p = Math.max(0, tau(x, y, l, m, r) * pois(x, l) * pois(y, m));
    tot += p; cells.push([x, y, p]);
  }
  let u = rnd() * tot;
  for (const [x, y, p] of cells) { u -= p; if (u <= 0) return [x, y]; }
  return [0, 0];
}

console.log("\n" + "═".repeat(70));
console.log("A) RECUPERACIÓN DE PARÁMETROS · datos sintéticos");
console.log("═".repeat(70));

const N_TEAMS = 20;
const TRUE_HOME_ADV = 0.26;
const TRUE_RHO = -0.08;
const teams = Array.from({ length: N_TEAMS }, (_, i) => `T${String(i + 1).padStart(2, "0")}`);

// Fuerzas verdaderas: ataque en [-0.45, 0.45], defensa en [-0.35, 0.35]
const trueAtk = new Map<string, number>();
const trueDef = new Map<string, number>();
teams.forEach((t, i) => {
  trueAtk.set(t, (i / (N_TEAMS - 1) - 0.5) * 0.9);
  trueDef.set(t, ((N_TEAMS - 1 - i) / (N_TEAMS - 1) - 0.5) * 0.7);
});
// centrar ataques (misma restricción que impone el ajuste)
const atkMean = [...trueAtk.values()].reduce((a, b) => a + b, 0) / N_TEAMS;
teams.forEach((t) => trueAtk.set(t, trueAtk.get(t)! - atkMean));

function simulateSeasons(n: number): Match[] {
  const out: Match[] = [];
  let day = n * 365;
  for (let s = 0; s < n; s++) {
    for (const h of teams) for (const a of teams) {
      if (h === a) continue;
      const l = Math.exp(trueAtk.get(h)! + trueDef.get(a)! + TRUE_HOME_ADV);
      const m = Math.exp(trueAtk.get(a)! + trueDef.get(h)!);
      const [hg, ag] = sampleScore(l, m, TRUE_RHO);
      out.push({ home: h, away: a, homeGoals: hg, awayGoals: ag, daysAgo: day - Math.floor(rnd() * 300) });
    }
    day -= 365;
  }
  return out.filter((m) => m.daysAgo >= 0);
}

const train = simulateSeasons(3);   // 3 temporadas ≈ 1.140 partidos
console.log(`\n  Simulados ${train.length} partidos de ${N_TEAMS} equipos`);
console.log(`  Ventaja de campo real: ${TRUE_HOME_ADV}   rho real: ${TRUE_RHO}`);
console.log(`  Ajustando...`);

const t0 = Date.now();
const fit = fitDixonColes(train, { xi: 0.0008, iterations: 350 });
console.log(`  Ajuste completado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

function corr(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return num / Math.sqrt(da * db);
}

const atkTrue = teams.map((t) => trueAtk.get(t)!);
const atkFit = teams.map((t) => fit.attack.get(t)!);
const defTrue = teams.map((t) => trueDef.get(t)!);
const defFit = teams.map((t) => fit.defence.get(t)!);
const rmse = (a: number[], b: number[]) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0) / a.length);

console.log(`\n  parámetro          correlación   RMSE`);
console.log(`  ${"─".repeat(42)}`);
console.log(`  ataque              ${corr(atkTrue, atkFit).toFixed(4).padStart(8)}   ${rmse(atkTrue, atkFit).toFixed(4)}`);
console.log(`  defensa             ${corr(defTrue, defFit).toFixed(4).padStart(8)}   ${rmse(defTrue, defFit).toFixed(4)}`);
console.log(`\n  ventaja de campo    real ${TRUE_HOME_ADV}  →  estimada ${fit.homeAdv.toFixed(4)}`);
console.log(`  rho                 real ${TRUE_RHO}  →  estimada ${fit.rho.toFixed(4)}`);

const okAtk = corr(atkTrue, atkFit) > 0.9;
const okDef = corr(defTrue, defFit) > 0.9;
const okAdv = Math.abs(fit.homeAdv - TRUE_HOME_ADV) < 0.08;
console.log(`\n  ${okAtk ? "✓" : "✗"} recupera la fuerza atacante`);
console.log(`  ${okDef ? "✓" : "✗"} recupera la fuerza defensiva`);
console.log(`  ${okAdv ? "✓" : "✗"} recupera la ventaja de campo`);

// ── Calibración fuera de muestra sobre datos sintéticos ───────────────────
const test = simulateSeasons(1);
const probsModel: number[][] = [];
const probsNaive: number[][] = [];
const actual: number[] = [];
for (const m of test) {
  const p = predict(fit, m.home, m.away);
  if (!p) continue;
  probsModel.push([p.home, p.draw, p.away]);
  probsNaive.push([0.44, 0.26, 0.30]);   // frecuencias base del fútbol
  actual.push(m.homeGoals > m.awayGoals ? 0 : m.homeGoals === m.awayGoals ? 1 : 2);
}
console.log(`\n  Calibración fuera de muestra (${actual.length} partidos):`);
console.log(`    log loss  modelo ${logLoss(probsModel, actual).toFixed(4)}   base ${logLoss(probsNaive, actual).toFixed(4)}`);
console.log(`    Brier     modelo ${brierScore(probsModel, actual).toFixed(4)}   base ${brierScore(probsNaive, actual).toFixed(4)}`);
const beatsNaive = logLoss(probsModel, actual) < logLoss(probsNaive, actual);
console.log(`  ${beatsNaive ? "✓" : "✗"} el modelo bate a la frecuencia base`);

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(70));
console.log("B) CALIBRACIÓN DEL MERCADO · datos reales");
console.log("═".repeat(70));

const files = process.argv.slice(2);
if (files.length) {
  const pm: number[][] = [], pn: number[][] = [], ac: number[] = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").trim().split("\n");
    const h = lines[0].split(","); const I = (n: string) => h.indexOf(n);
    for (const line of lines.slice(1)) {
      const c = line.split(","); const num = (n: string) => Number(c[I(n)]);
      const ps = [num("PSCH"), num("PSCD"), num("PSCA")];   // cierre = mejor info
      if (ps.some((x) => !isFinite(x) || x <= 1)) continue;
      const ftr = c[I("FTR")];
      if (!["H", "D", "A"].includes(ftr)) continue;
      pm.push(devig(ps, "power"));
      pn.push([0.44, 0.26, 0.30]);
      ac.push(ftr === "H" ? 0 : ftr === "D" ? 1 : 2);
    }
  }
  console.log(`\n  ${ac.length} partidos reales`);
  console.log(`\n  fuente                    log loss   Brier`);
  console.log(`  ${"─".repeat(46)}`);
  console.log(`  mercado (cierre, devig)   ${logLoss(pm, ac).toFixed(4)}    ${brierScore(pm, ac).toFixed(4)}`);
  console.log(`  frecuencia base           ${logLoss(pn, ac).toFixed(4)}    ${brierScore(pn, ac).toFixed(4)}`);
  console.log(`\n  Esta es la vara de medir. Un modelo propio que no baje del`);
  console.log(`  log loss del mercado no aporta información nueva — y mezclarlo`);
  console.log(`  con peso alto EMPEORARÍA las probabilidades.`);
} else {
  console.log("\n  (sin CSV: pasa ficheros como argumento para esta sección)");
}

console.log("\n" + "═".repeat(70) + "\n");
