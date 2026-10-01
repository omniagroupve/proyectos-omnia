// Test del motor matemático. Ejecutar: npm run test:engine
// Sin dependencias externas — solo node.

import {
  devigMultiplicative, devigPower, devigShin, overround, vigPct,
  edgePct, kellyFraction, stakeUnits, clvPct, profitUnits,
  americanToDecimal, decimalToAmerican,
} from "../src/lib/devig.ts";

let pass = 0, fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}
function near(a: number, b: number, tol = 1e-6) { return Math.abs(a - b) < tol; }
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

console.log("\n── overround / vig ──");
// Mercado 1X2 típico con ~5% de margen
const market = [2.10, 3.40, 3.60];
check("overround > 1", overround(market) > 1, `= ${overround(market)}`);
check("vig entre 3% y 8%", vigPct(market) > 3 && vigPct(market) < 8, `= ${vigPct(market).toFixed(2)}%`);
// Mercado sin margen: 2.00 / 2.00
check("mercado justo → vig 0", near(vigPct([2, 2]), 0, 1e-9));

console.log("\n── devig: los tres métodos suman 1 ──");
for (const [name, fn] of [
  ["multiplicative", devigMultiplicative],
  ["power", devigPower],
  ["shin", devigShin],
] as const) {
  const p = fn(market);
  check(`${name} suma 1`, near(sum(p), 1, 1e-8), `= ${sum(p)}`);
  check(`${name} todas en (0,1)`, p.every((x) => x > 0 && x < 1));
}

console.log("\n── devig: coherencia entre métodos ──");
const pm = devigMultiplicative(market);
const pp = devigPower(market);
const ps = devigShin(market);
check("los 3 dan resultados cercanos (<4pp)",
  Math.abs(pm[0] - pp[0]) < 0.04 && Math.abs(pp[0] - ps[0]) < 0.04,
  `mult=${pm[0].toFixed(4)} pow=${pp[0].toFixed(4)} shin=${ps[0].toFixed(4)}`);

// El favourite-longshot bias: power debe dar MENOS probabilidad al underdog
// que el multiplicativo (le quita más margen a las cuotas altas).
check("power penaliza más al underdog que multiplicative",
  pp[2] < pm[2],
  `pow=${pp[2].toFixed(4)} mult=${pm[2].toFixed(4)}`);

console.log("\n── devig: mercado ya sin vig no se altera ──");
const fairMkt = devigPower([2, 2]);
check("2.00/2.00 → 50%/50%", near(fairMkt[0], 0.5, 1e-6) && near(fairMkt[1], 0.5, 1e-6));

console.log("\n── devig: mercado de 2 vías con vig alto ──");
const juiced = [1.87, 1.87]; // -115/-115, ~7% vig
const pj = devigPower(juiced);
check("suma 1", near(sum(pj), 1, 1e-8));
check("simétrico → 50/50", near(pj[0], 0.5, 1e-6), `= ${pj[0]}`);

console.log("\n── edge ──");
check("prob 52% @ 2.10 → +9.2%", near(edgePct(0.52, 2.10), 9.2, 0.05), `= ${edgePct(0.52, 2.10).toFixed(3)}`);
check("prob justa → edge 0", near(edgePct(0.5, 2.0), 0, 1e-9));
check("prob baja → edge negativo", edgePct(0.40, 2.0) < 0);

console.log("\n── Kelly ──");
// cuota 2.50 (b=1.5), p=0.45 → f* = (1.5*0.45 - 0.55)/1.5 = 0.08333
check("Kelly completo correcto", near(kellyFraction(0.45, 2.5, 1.0), 0.083333, 1e-5),
  `= ${kellyFraction(0.45, 2.5, 1.0)}`);
check("cuarto de Kelly = 1/4 del completo",
  near(kellyFraction(0.45, 2.5, 0.25), kellyFraction(0.45, 2.5, 1.0) / 4, 1e-9));
check("sin ventaja → Kelly 0", kellyFraction(0.40, 2.5, 0.25) === 0);
check("edge negativo → nunca apuesta", kellyFraction(0.30, 2.0) === 0);

console.log("\n── stake ──");
check("stake > 0 con ventaja", stakeUnits(0.55, 2.0, 0.25) > 0);
check("stake capado a 5u", stakeUnits(0.95, 5.0, 1.0) <= 5,
  `= ${stakeUnits(0.95, 5.0, 1.0)}`);
check("stake 0 sin ventaja", stakeUnits(0.45, 2.0, 0.25) === 0);

console.log("\n── CLV ──");
check("2.10 vs cierre 1.95 → +7.69%", near(clvPct(2.10, 1.95), 7.6923, 1e-3),
  `= ${clvPct(2.10, 1.95).toFixed(4)}`);
check("cuota peor que el cierre → CLV negativo", clvPct(1.90, 2.00) < 0);
check("misma cuota → CLV 0", near(clvPct(2.0, 2.0), 0, 1e-12));

console.log("\n── profit ──");
check("win @2.50 con 2u → +3.00u", near(profitUnits("win", 2, 2.5), 3, 1e-9));
check("loss con 2u → -2u", near(profitUnits("loss", 2, 2.5), -2, 1e-9));
check("push → 0", profitUnits("push", 2, 2.5) === 0);

console.log("\n── conversión de formatos ──");
check("+150 → 2.50", near(americanToDecimal(150), 2.5, 1e-9));
check("-200 → 1.50", near(americanToDecimal(-200), 1.5, 1e-9));
check("2.50 → +150", decimalToAmerican(2.5) === 150);
check("1.50 → -200", decimalToAmerican(1.5) === -200);
check("ida y vuelta estable", decimalToAmerican(americanToDecimal(-110)) === -110);

console.log("\n── caso realista end-to-end ──");
// Pinnacle 1.95/1.95 (mercado justo ~2.6% vig) y una casa blanda paga 2.10
const sharp = [1.95, 1.95];
const fairP = devigPower(sharp)[0];
const softOdds = 2.10;
const e = edgePct(fairP, softOdds);
const st = stakeUnits(fairP, softOdds, 0.25);
console.log(`  prob justa=${(fairP * 100).toFixed(2)}%  edge=${e.toFixed(2)}%  stake=${st}u`);
check("detecta valor real", e > 5, `edge=${e.toFixed(2)}%`);
check("stake razonable (0-3u)", st > 0 && st <= 3, `= ${st}`);

console.log(`\n${"─".repeat(50)}`);
console.log(`${pass} pasados · ${fail} fallidos\n`);
process.exit(fail > 0 ? 1 : 0);
