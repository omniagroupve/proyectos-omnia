// ═══════════════════════════════════════════════════════════════════════════
// BACKTEST · ¿tiene edge real la estrategia, antes de gastar un dólar?
// ═══════════════════════════════════════════════════════════════════════════
//
// Datos: football-data.co.uk (gratis, sin API key, sin registro).
// Columnas clave:
//   PSH/PSD/PSA     → Pinnacle APERTURA   (referencia sharp)
//   MaxH/MaxD/MaxA  → mejor cuota del mercado en APERTURA (donde apostarías)
//   PSCH/PSCD/PSCA  → Pinnacle CIERRE     (la verdad del mercado)
//   MaxCH/MaxCD/MaxCA → mejor cuota al CIERRE
//   FTR             → resultado (H/D/A)
//
// Simulamos EXACTAMENTE lo que hace el motor en producción:
//   1. devig(Pinnacle apertura) → probabilidad justa
//   2. edge = prob_justa × mejor_cuota − 1
//   3. si edge ≥ umbral → apostar con Kelly fraccionado
//   4. liquidar con el resultado real
//   5. medir CLV contra la línea de cierre
//
// Uso:  node --experimental-strip-types scripts/backtest.ts [archivo.csv ...]

import { devig, edgePct, stakeUnits, profitUnits, clvPct } from "../src/lib/devig.ts";
import { readFileSync } from "node:fs";

const DEVIG_METHOD = "power" as const;
const KELLY = 0.25;
const OUTCOMES = ["H", "D", "A"] as const;
type Outcome = (typeof OUTCOMES)[number];

interface Row {
  date: string; home: string; away: string; ftr: Outcome;
  ps: number[];    // Pinnacle apertura  [H,D,A]
  max: number[];   // mejor cuota apertura
  psc: number[];   // Pinnacle cierre
  maxc: number[];  // mejor cuota cierre
}

function loadCsv(path: string): Row[] {
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const head = lines[0].split(",");
  const idx = (n: string) => head.indexOf(n);
  const rows: Row[] = [];

  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const num = (n: string) => Number(c[idx(n)]);
    const r: Row = {
      date: c[idx("Date")], home: c[idx("HomeTeam")], away: c[idx("AwayTeam")],
      ftr: c[idx("FTR")] as Outcome,
      ps:   [num("PSH"), num("PSD"), num("PSA")],
      max:  [num("MaxH"), num("MaxD"), num("MaxA")],
      psc:  [num("PSCH"), num("PSCD"), num("PSCA")],
      maxc: [num("MaxCH"), num("MaxCD"), num("MaxCA")],
    };
    const all = [...r.ps, ...r.max, ...r.psc, ...r.maxc];
    if (all.some((x) => !isFinite(x) || x <= 1)) continue;   // fila incompleta
    if (!OUTCOMES.includes(r.ftr)) continue;
    rows.push(r);
  }
  return rows;
}

interface Bet {
  date: string; match: string; pick: Outcome;
  fairProb: number; odds: number; edge: number; stake: number;
  won: boolean; profit: number;
  clvVsMaxClose: number;    // ¿batí la mejor cuota de cierre?
  clvVsFairClose: number;   // ¿batí la probabilidad REAL de cierre?
}

function run(rows: Row[], minEdge: number, maxOddsCap = 8, onePerMatch = true) {
  const bets: Bet[] = [];

  for (const r of rows) {
    const fair = devig(r.ps, DEVIG_METHOD);          // prob. justa en apertura
    const fairClose = devig(r.psc, DEVIG_METHOD);    // prob. justa al cierre

    const cands: Bet[] = [];
    for (let i = 0; i < 3; i++) {
      const odds = r.max[i];
      if (odds > maxOddsCap || odds < 1.35) continue;

      const e = edgePct(fair[i], odds);
      if (e < minEdge) continue;

      const stake = stakeUnits(fair[i], odds, KELLY);
      if (stake <= 0) continue;

      const won = r.ftr === OUTCOMES[i];
      cands.push({
        date: r.date, match: `${r.home} v ${r.away}`, pick: OUTCOMES[i],
        fairProb: fair[i], odds, edge: e, stake, won,
        profit: profitUnits(won ? "win" : "loss", stake, odds),
        clvVsMaxClose: clvPct(odds, r.maxc[i]),
        // cuota justa de cierre = 1/prob_real_cierre. Batirla = EV+ real.
        clvVsFairClose: clvPct(odds, 1 / fairClose[i]),
      });
    }

    if (!cands.length) continue;
    if (onePerMatch) {
      cands.sort((a, b) => b.edge - a.edge);
      bets.push(cands[0]);
    } else {
      bets.push(...cands);
    }
  }

  return summarize(bets);
}

function summarize(bets: Bet[]) {
  const n = bets.length;
  if (!n) return { n: 0 } as ReturnType<typeof summarize>;

  const staked = bets.reduce((s, b) => s + b.stake, 0);
  const profit = bets.reduce((s, b) => s + b.profit, 0);
  const wins = bets.filter((b) => b.won).length;
  const avg = (f: (b: Bet) => number) => bets.reduce((s, b) => s + f(b), 0) / n;
  const pct = (f: (b: Bet) => boolean) => (bets.filter(f).length / n) * 100;

  // Drawdown máximo sobre la curva de capital
  let peak = 0, cum = 0, maxDD = 0;
  for (const b of bets) {
    cum += b.profit;
    peak = Math.max(peak, cum);
    maxDD = Math.max(maxDD, peak - cum);
  }

  return {
    n, staked, profit, wins,
    roi: (profit / staked) * 100,
    hitRate: (wins / n) * 100,
    avgOdds: avg((b) => b.odds),
    avgEdge: avg((b) => b.edge),
    avgStake: avg((b) => b.stake),
    clvMax: avg((b) => b.clvVsMaxClose),
    clvFair: avg((b) => b.clvVsFairClose),
    beatMax: pct((b) => b.clvVsMaxClose > 0),
    beatFair: pct((b) => b.clvVsFairClose > 0),
    maxDD,
    bets,
  };
}

// ── Ejecución ──────────────────────────────────────────────────────────────
const files = process.argv.slice(2);
if (!files.length) { console.error("uso: backtest.ts <csv...>"); process.exit(1); }

const rows = files.flatMap(loadCsv);
console.log(`\n${"═".repeat(72)}`);
console.log(`BACKTEST · ${rows.length} partidos con datos completos`);
console.log(`devig=${DEVIG_METHOD}  kelly=${KELLY}  1 pick por partido`);
console.log("═".repeat(72));

// ── Control: apostar TODO a la mejor cuota, sin filtro de valor ───────────
// Si la estrategia filtrada no supera a esto, el filtro no aporta nada.
let ctrlStake = 0, ctrlProfit = 0;
for (const r of rows) {
  for (let i = 0; i < 3; i++) {
    ctrlStake += 1;
    ctrlProfit += r.ftr === OUTCOMES[i] ? r.max[i] - 1 : -1;
  }
}
console.log(`\n▸ CONTROL (apostar los 3 resultados de todos los partidos a la mejor cuota)`);
console.log(`  ${rows.length * 3} apuestas · ROI ${((ctrlProfit / ctrlStake) * 100).toFixed(2)}%`);
console.log(`  Esto es la línea base. La estrategia tiene que batirla claramente.`);

// ── Barrido de umbrales de edge ───────────────────────────────────────────
console.log(`\n▸ ESTRATEGIA por umbral mínimo de valor\n`);
console.log(
  "  edge≥   n   ROI%    acierto  cuota  stake  CLV(fair)  %bate  maxDD"
);
console.log("  " + "─".repeat(66));

const thresholds = [0, 1, 2, 3, 4, 5, 7, 10];
const results: Record<number, ReturnType<typeof summarize>> = {};

for (const t of thresholds) {
  const r = run(rows, t);
  results[t] = r;
  if (!r.n) { console.log(`  ${String(t).padStart(4)}%   0   —`); continue; }
  console.log(
    `  ${String(t).padStart(4)}% ` +
    `${String(r.n).padStart(3)} ` +
    `${r.roi.toFixed(1).padStart(7)} ` +
    `${r.hitRate.toFixed(1).padStart(8)}% ` +
    `${r.avgOdds.toFixed(2).padStart(6)} ` +
    `${r.avgStake.toFixed(2).padStart(6)} ` +
    `${r.clvFair.toFixed(2).padStart(9)}% ` +
    `${r.beatFair.toFixed(0).padStart(5)}% ` +
    `${r.maxDD.toFixed(1).padStart(6)}u`
  );
}

// ── Diagnóstico del umbral de producción (2%) ─────────────────────────────
const prod = results[2];
if (prod.n) {
  console.log(`\n${"═".repeat(72)}`);
  console.log(`DIAGNÓSTICO · umbral de producción (edge ≥ 2%)`);
  console.log("═".repeat(72));
  console.log(`  Picks generados        ${prod.n} de ${rows.length} partidos (${((prod.n / rows.length) * 100).toFixed(0)}%)`);
  console.log(`  Capital arriesgado     ${prod.staked.toFixed(1)}u`);
  console.log(`  Beneficio              ${prod.profit > 0 ? "+" : ""}${prod.profit.toFixed(2)}u`);
  console.log(`  ROI                    ${prod.roi > 0 ? "+" : ""}${prod.roi.toFixed(2)}%`);
  console.log(`  Acierto                ${prod.hitRate.toFixed(1)}%  (cuota media ${prod.avgOdds.toFixed(2)})`);
  console.log(`  Drawdown máximo        ${prod.maxDD.toFixed(1)}u`);
  console.log("");
  console.log(`  ── CLV: la prueba de fuego ──`);
  console.log(`  vs mejor cuota cierre  ${prod.clvMax > 0 ? "+" : ""}${prod.clvMax.toFixed(2)}%   (bate el ${prod.beatMax.toFixed(0)}%)`);
  console.log(`  vs prob. real cierre   ${prod.clvFair > 0 ? "+" : ""}${prod.clvFair.toFixed(2)}%   (bate el ${prod.beatFair.toFixed(0)}%)`);
  console.log("");
  console.log(`  Lectura: "vs prob. real cierre" es la métrica honesta. Por encima`);
  console.log(`  del 50% de picks batiendo el cierre = el proceso tiene ventaja.`);

  console.log(`\n  ── Muestra de picks ──`);
  for (const b of prod.bets.slice(0, 8)) {
    console.log(
      `  ${b.date} ${b.match.padEnd(28).slice(0, 28)} ${b.pick} @${b.odds.toFixed(2)}` +
      ` edge ${b.edge.toFixed(1).padStart(5)}%  ${b.won ? "GANA" : "pierde"}` +
      `  clv ${b.clvVsFairClose > 0 ? "+" : ""}${b.clvVsFairClose.toFixed(1)}%`
    );
  }
}

console.log(`\n${"═".repeat(72)}`);
console.log(`AVISO: ${rows.length} partidos es una muestra pequeña. El ROI aquí es`);
console.log(`ruido estadístico. El CLV es lo único con significado a este tamaño.`);
console.log(`Para conclusiones fiables: 2.000+ partidos (varias ligas × temporadas).`);
console.log("═".repeat(72) + "\n");
