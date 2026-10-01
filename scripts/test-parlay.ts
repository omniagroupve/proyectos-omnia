// Test del motor de parlays. Ejecutar: npm run test:parlay
import {
  evaluateParlay, buildParlays, settleParlay, parlayProfitUnits, PARLAY,
  type ParlayLeg,
} from "../src/lib/parlay.ts";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

const leg = (id: string, odds: number, fairProb: number, extra: Partial<ParlayLeg> = {}): ParlayLeg => ({
  eventId: id, market: "h2h", selection: `sel-${id}`, line: null, odds, fairProb, book: "Bet365", ...extra,
});

console.log("\n── evaluateParlay · matemática ──");
// Dos piernas justas 50% @ 2.10 → P = 0.25, cuota 4.41, EV = 0.25·4.41 − 1 = +10.25%
const ev = evaluateParlay([leg("a", 2.10, 0.5), leg("b", 2.10, 0.5)]);
check("prob conjunta = producto", near(ev.jointProb, 0.25));
check("cuota combinada = producto", near(ev.combinedOdds, 4.41, 1e-3));
check("cuota justa = 1/P", near(ev.fairOdds, 4.0, 1e-3));
check("EV +10.25%", near(ev.edgePct, 10.25, 1e-2), `= ${ev.edgePct}`);
check("stake > 0 y ≤ 5u", ev.stakeUnits > 0 && ev.stakeUnits <= 5, `= ${ev.stakeUnits}`);
check("válido sin avisos", ev.valid && ev.warnings.length === 0, JSON.stringify(ev.warnings));

console.log("\n── evaluateParlay · guardas ──");
const one = evaluateParlay([leg("a", 2.0, 0.5)]);
check("1 pierna → inválido", !one.valid);
const same = evaluateParlay([leg("a", 2.0, 0.5), leg("a", 1.9, 0.55)]);
check("mismo evento → aviso de correlación", same.warnings.some((w) => w.includes("mismo partido")));
const neg = evaluateParlay([leg("a", 1.8, 0.5), leg("b", 1.8, 0.5)]);
check("sin valor → EV negativo y aviso", neg.edgePct < 0 && neg.warnings.some((w) => w.includes("valor esperado")));
check("sin valor → stake 0", neg.stakeUnits === 0);
const bad = evaluateParlay([leg("a", 0.9, 0.5), leg("b", 2.0, 0.5)]);
check("cuota inválida → error", !bad.valid && bad.errors.length > 0);
const huge = evaluateParlay([leg("a", 6, 0.2), leg("b", 6, 0.2), leg("c", 6, 0.2)]);
check("cuota combinada > tope → aviso", huge.warnings.some((w) => w.includes("tope")));
const capped = evaluateParlay([leg("a", 1.5, 0.9), leg("b", 1.5, 0.9), leg("c", 1.5, 0.9)]);
check("stake capado a 5u", capped.stakeUnits <= PARLAY.capUnits);

console.log("\n── buildParlays ──");
const pool: ParlayLeg[] = [
  leg("e1", 1.95, 0.55), leg("e1", 2.40, 0.45),  // mismo evento: sólo entra el mejor
  leg("e2", 2.10, 0.52), leg("e3", 1.70, 0.62),
  leg("e4", 3.20, 0.34), leg("e5", 1.60, 0.60),
  leg("e6", 2.05, 0.50), leg("e7", 1.90, 0.50),  // e7 sin edge → fuera
  leg("e8", 9.00, 0.15),                          // fuera de banda en cualquier riesgo
];
const med = buildParlays(pool, { risk: "medium", legs: 3, maxResults: 3 });
check("devuelve parlays", med.length > 0, `= ${med.length}`);
check("máx 3 resultados", med.length <= 3);
check("3 piernas cada uno", med.every((p) => p.legsCount === 3));
check("sin eventos repetidos", med.every((p) => new Set(p.legs.map((l) => l.eventId)).size === 3));
check("ordenados por EV desc", med.every((p, i) => i === 0 || med[i - 1].edgePct >= p.edgePct));
check("todos con EV > 0", med.every((p) => p.edgePct > 0));
check("dentro del tope de riesgo", med.every((p) => p.combinedOdds <= PARLAY.risk.medium.maxCombinedOdds));
check("excluye la pierna sin edge (e7)", med.every((p) => !p.legs.some((l) => l.eventId === "e7")));
check("excluye cuota fuera de banda (e8)", med.every((p) => !p.legs.some((l) => l.eventId === "e8")));

const low = buildParlays(pool, { risk: "low" });
check("riesgo bajo → sólo cuotas ≤ 1.80", low.every((p) => p.legs.every((l) => l.odds <= 1.80)));
check("riesgo bajo → 2 piernas por defecto", low.every((p) => p.legsCount === 2));

const none = buildParlays([leg("a", 2.0, 0.55)], { legs: 3 });
check("pool insuficiente → vacío", none.length === 0);

const filtered = buildParlays(pool, { risk: "medium", legs: 2, allowedEventIds: new Set(["e2", "e3"]) });
check("filtro por eventos permitidos", filtered.length === 1 && filtered[0].legs.every((l) => ["e2", "e3"].includes(l.eventId)));

console.log("\n── liquidación ──");
check("una pierna perdida → perdido", settleParlay(["win", "loss", "win"]) === "lost");
check("pendiente si falta alguna", settleParlay(["win", "pending"]) === "pending");
check("todas ganadas → ganado", settleParlay(["win", "win"]) === "won");
check("win + push → ganado", settleParlay(["win", "push"]) === "won");
check("todo push → push", settleParlay(["push", "push"]) === "push");
check("todo void → void", settleParlay(["void", "void"]) === "void");
check("perdido paga −stake", parlayProfitUnits([{ odds: 2, result: "loss" }, { odds: 2, result: "win" }], 1.5) === -1.5);
check("push retira la pierna", near(parlayProfitUnits([{ odds: 2, result: "win" }, { odds: 3, result: "push" }], 1), 1));
check("ganado paga (Π cuotas − 1)·stake", near(parlayProfitUnits([{ odds: 2, result: "win" }, { odds: 1.5, result: "win" }], 2), 4));

console.log(`\n${"─".repeat(50)}`);
console.log(`${pass} pasados · ${fail} fallidos\n`);
process.exit(fail > 0 ? 1 : 0);
