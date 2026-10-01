// ═══════════════════════════════════════════════════════════════════════════
// PRUEBAS DE LOS FRENOS · que no gasten dinero de verdad
// ═══════════════════════════════════════════════════════════════════════════
//
//   npm run test:brakes
//
// Estas pruebas no comprueban que el código compile: comprueban que el freno
// de mano IMPIDE la llamada. Se ponen claves de API falsas a propósito — si
// algo se escapara a la red, el proveedor respondería 401 y la prueba lo vería
// como un fallo distinto al esperado.
//
// Existen porque la autonomía que se le puede dar a un agente depende de que
// estos frenos funcionen. Si esta suite se pone roja, baja la autonomía.

process.env.ODDS_API_KEY = "clave-falsa-no-deberia-usarse";
process.env.APIFOOTBALL_KEY = "clave-falsa-no-deberia-usarse";
process.env.ANTHROPIC_API_KEY = "sk-ant-falsa-no-deberia-usarse";
process.env.PIX_PAUSE_EXTERNAL = "1";

const { externalPaused, fetchOdds, fetchScores, fetchHistoricalOdds, fetchSports } =
  await import("../src/lib/odds.ts");
const { fetchFixtures } = await import("../src/lib/apifootball.ts");
const { isAiConfigured, narrateParlays } = await import("../src/lib/ai.ts");

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? "  " + detail : ""}`); }
}

console.log("\n── con PIX_PAUSE_EXTERNAL=1 ──");
check("externalPaused() lo detecta", externalPaused() === true);

const llamadas: Array<[string, () => Promise<unknown>]> = [
  ["fetchOdds", () => fetchOdds("soccer_mexico_ligamx")],
  ["fetchScores", () => fetchScores("soccer_mexico_ligamx")],
  ["fetchHistoricalOdds", () => fetchHistoricalOdds("soccer_epl", "2026-01-01T00:00:00Z")],
  ["fetchSports", () => fetchSports()],
  ["API-Football fetchFixtures", () => fetchFixtures(262, 2026, "2026-01-01", "2026-01-02")],
];

for (const [nombre, fn] of llamadas) {
  try {
    await fn();
    check(`${nombre} bloqueado`, false, "¡SALIÓ A LA RED!");
  } catch (e) {
    check(`${nombre} bloqueado`, (e as Error).name === "ExternalPausedError", `lanzó ${(e as Error).name}`);
  }
}

console.log("\n── la IA también se frena ──");
check("isAiConfigured() es false pese a haber key", isAiConfigured() === false);

const narracion = await narrateParlays([{
  legs: [
    { eventId: "a", market: "h2h", selection: "A", line: null, odds: 2.1, fairProb: 0.5, book: "X", label: "A vs B" },
    { eventId: "b", market: "h2h", selection: "B", line: null, odds: 2.1, fairProb: 0.5, book: "Y", label: "C vs D" },
  ],
  legsCount: 2, jointProb: 0.25, combinedOdds: 4.41, fairOdds: 4, edgePct: 10.25,
  kelly: 0.03, stakeUnits: 0.8, warnings: [], errors: [], valid: true,
}], "");

check("narrateParlays no llamó al modelo", narracion.meta.mocked === true);
check("y aun así devolvió texto usable", narracion.data[0].title.length > 3, narracion.data[0].title);
check("con una explicación por pierna", narracion.data[0].legRationales.length === 2);

console.log("\n── sin el freno, vuelve a intentar salir ──");
process.env.PIX_PAUSE_EXTERNAL = "0";
check("externalPaused() vuelve a false", externalPaused() === false);
try {
  await fetchSports();
  check("intenta la llamada real", false, "¿respondió sin red?");
} catch (e) {
  check("intenta la llamada real", (e as Error).name !== "ExternalPausedError", `sigue frenado: ${(e as Error).name}`);
}

console.log(`\n${"─".repeat(50)}`);
console.log(`${pass} pasados · ${fail} fallidos\n`);
process.exit(fail > 0 ? 1 : 0);
