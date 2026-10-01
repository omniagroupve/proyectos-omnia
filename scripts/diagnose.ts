// ═══════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO · ¿dónde gana y dónde pierde la estrategia?
// ═══════════════════════════════════════════════════════════════════════════
// El backtest dice SI funciona. Esto dice POR QUÉ, que es lo que permite
// arreglarlo sin gastar dinero en datos nuevos.

import { devig, edgePct, stakeUnits, profitUnits, clvPct } from "../src/lib/devig.ts";
import { readFileSync } from "node:fs";

const OUT = ["H", "D", "A"] as const;
type O = (typeof OUT)[number];

interface Row { ps: number[]; max: number[]; psc: number[]; ftr: O; }

function load(p: string): Row[] {
  const l = readFileSync(p, "utf8").trim().split("\n");
  const h = l[0].split(","); const i = (n: string) => h.indexOf(n);
  return l.slice(1).map((line) => {
    const c = line.split(","); const n = (x: string) => Number(c[i(x)]);
    return {
      ps: [n("PSH"), n("PSD"), n("PSA")], max: [n("MaxH"), n("MaxD"), n("MaxA")],
      psc: [n("PSCH"), n("PSCD"), n("PSCA")], ftr: c[i("FTR")] as O,
    };
  }).filter((r) => [...r.ps, ...r.max, ...r.psc].every((x) => isFinite(x) && x > 1) && OUT.includes(r.ftr));
}

interface B { pick: O; odds: number; edge: number; stake: number; won: boolean; profit: number; clv: number; }

function bets(rows: Row[], minEdge: number, oddsMax: number, oddsMin = 1.35): B[] {
  const out: B[] = [];
  for (const r of rows) {
    const fair = devig(r.ps, "power");
    const fc = devig(r.psc, "power");
    const c: B[] = [];
    for (let i = 0; i < 3; i++) {
      const o = r.max[i];
      if (o > oddsMax || o < oddsMin) continue;
      const e = edgePct(fair[i], o);
      if (e < minEdge) continue;
      // filtro anti-outlier de producción: descarta precios irreales
      if (o / (1 / fair[i]) > 1.25) continue;
      const s = stakeUnits(fair[i], o, 0.25);
      if (s <= 0) continue;
      const won = r.ftr === OUT[i];
      c.push({ pick: OUT[i], odds: o, edge: e, stake: s, won,
        profit: profitUnits(won ? "win" : "loss", s, o), clv: clvPct(o, 1 / fc[i]) });
    }
    if (c.length) { c.sort((a, b) => b.edge - a.edge); out.push(c[0]); }
  }
  return out;
}

function stat(b: B[]) {
  if (!b.length) return null;
  const st = b.reduce((s, x) => s + x.stake, 0);
  const pr = b.reduce((s, x) => s + x.profit, 0);
  return {
    n: b.length, roi: (pr / st) * 100, profit: pr,
    hit: (b.filter((x) => x.won).length / b.length) * 100,
    clv: b.reduce((s, x) => s + x.clv, 0) / b.length,
    beat: (b.filter((x) => x.clv > 0).length / b.length) * 100,
  };
}

const rows = process.argv.slice(2).flatMap(load);
console.log(`\n${"═".repeat(70)}\nDIAGNÓSTICO · ${rows.length} partidos\n${"═".repeat(70)}`);

const base = bets(rows, 2, 8);

// ── 1. ¿Qué resultado estamos apostando? ──────────────────────────────────
console.log(`\n▸ POR TIPO DE RESULTADO (edge≥2%, cuotas 1.35-8.00)\n`);
console.log("  pick   n   ROI%   acierto   CLV%   %bate");
console.log("  " + "─".repeat(44));
for (const o of OUT) {
  const s = stat(base.filter((b) => b.pick === o));
  const name = o === "H" ? "Local" : o === "D" ? "Empate" : "Visit.";
  if (!s) { console.log(`  ${name.padEnd(6)}  0`); continue; }
  console.log(`  ${name.padEnd(6)}${String(s.n).padStart(3)} ${s.roi.toFixed(1).padStart(7)} ${s.hit.toFixed(0).padStart(7)}% ${s.clv.toFixed(2).padStart(7)} ${s.beat.toFixed(0).padStart(6)}%`);
}

// ── 2. ¿En qué rango de cuota? ────────────────────────────────────────────
console.log(`\n▸ POR RANGO DE CUOTA\n`);
console.log("  rango        n   ROI%   acierto   CLV%   %bate");
console.log("  " + "─".repeat(48));
const buckets: [string, number, number][] = [
  ["1.35-2.00", 1.35, 2], ["2.00-3.00", 2, 3],
  ["3.00-4.50", 3, 4.5], ["4.50-8.00", 4.5, 8],
];
for (const [label, lo, hi] of buckets) {
  const s = stat(base.filter((b) => b.odds >= lo && b.odds < hi));
  if (!s) { console.log(`  ${label.padEnd(11)}  0`); continue; }
  console.log(`  ${label.padEnd(11)}${String(s.n).padStart(3)} ${s.roi.toFixed(1).padStart(7)} ${s.hit.toFixed(0).padStart(7)}% ${s.clv.toFixed(2).padStart(7)} ${s.beat.toFixed(0).padStart(6)}%`);
}

// ── 3. Comparar variantes de configuración ────────────────────────────────
console.log(`\n▸ VARIANTES DE CONFIGURACIÓN\n`);
console.log("  configuración                  n   ROI%    CLV%   %bate");
console.log("  " + "─".repeat(55));
const variants: [string, number, number, number][] = [
  ["base (edge2, cuota<8)",        2, 8,    1.35],
  ["cuota máx 4.50",               2, 4.5,  1.35],
  ["cuota máx 3.50",               2, 3.5,  1.35],
  ["cuota máx 3.00",               2, 3.0,  1.35],
  ["cuota 1.50-3.00",              2, 3.0,  1.50],
  ["edge 1%, cuota máx 3.50",      1, 3.5,  1.35],
  ["edge 3%, cuota máx 3.50",      3, 3.5,  1.35],
];
for (const [label, e, omax, omin] of variants) {
  const s = stat(bets(rows, e, omax, omin));
  if (!s) { console.log(`  ${label.padEnd(28)}  0`); continue; }
  console.log(`  ${label.padEnd(28)}${String(s.n).padStart(3)} ${s.roi.toFixed(1).padStart(7)} ${s.clv.toFixed(2).padStart(7)} ${s.beat.toFixed(0).padStart(6)}%`);
}

console.log(`\n${"═".repeat(70)}`);
console.log(`Con n<100 el ROI de cada celda es ruido. Lee el CLV y el %bate:`);
console.log(`esos convergen antes y señalan dónde el proceso tiene ventaja real.`);
console.log("═".repeat(70) + "\n");
