// ═══════════════════════════════════════════════════════════════════════════
// PRUEBAS DE INTEGRACIÓN DE /api/v1
// ═══════════════════════════════════════════════════════════════════════════
//
//   npm run dev                       # en otra terminal
//   npm run test:api                  # contra http://localhost:3000
//   PIX_API=https://… npm run test:api
//
// Comprueba el contrato tal y como lo va a consumir el frontend: forma de la
// respuesta, códigos de error y matemática de la calculadora. Los endpoints
// que necesitan base de datos deben responder 503 cuando no hay claves — eso
// también se verifica, porque un 500 ahí sería un fallo real.

const BASE = (process.env.PIX_API ?? "http://localhost:3000") + "/api/v1";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? "  " + detail : ""}`); }
}
const near = (a: number, b: number, tol = 1e-2) => Math.abs(a - b) < tol;

async function call(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const dbBacked = ["/sports", "/leagues", "/jurisdictions", "/events", "/picks", "/parlays", "/performance"];

async function main() {
  console.log(`\nProbando ${BASE}\n`);

  // ── 1 · Disponible siempre ─────────────────────────────────────────────
  console.log("── /parlays/demo ──");
  {
    const { status, body } = await call("/parlays/demo");
    check("responde 200", status === 200, `= ${status}`);
    check("marca los datos como demo", body?.demo === true);
    check("trae parlays", Array.isArray(body?.parlays) && body.parlays.length > 0);
    const p = body?.parlays?.[0];
    check("cada parlay trae piernas", Array.isArray(p?.legs) && p.legs.length >= 2);
    check("cuota combinada = producto de piernas",
      near(p.legs.reduce((o: number, l: { odds: number }) => o * l.odds, 1), p.combinedOdds, 0.05),
      `${p.combinedOdds}`);
    check("todas las piernas llevan etiqueta legible", p.legs.every((l: { label: string }) => typeof l.label === "string" && l.label.length > 3));
  }

  // ── 2 · Calculadora ────────────────────────────────────────────────────
  console.log("\n── /parlays/evaluate ──");
  {
    // 2 piernas justas al 50% pagadas a 2.10 → P=0.25, cuota 4.41, EV +10.25%
    const { status, body } = await call("/parlays/evaluate", {
      method: "POST",
      body: JSON.stringify({
        legs: [
          { eventId: "a", market: "h2h", selection: "A", odds: 2.10, fairProb: 0.5 },
          { eventId: "b", market: "h2h", selection: "B", odds: 2.10, fairProb: 0.5 },
        ],
        bankroll: 1000,
      }),
    });
    check("responde 200", status === 200, `= ${status}`);
    check("probabilidad conjunta = 0.25", near(body.jointProb, 0.25, 1e-3), `= ${body.jointProb}`);
    check("cuota combinada = 4.41", near(body.combinedOdds, 4.41, 1e-2), `= ${body.combinedOdds}`);
    check("cuota justa = 4.00", near(body.fairOdds, 4.0, 1e-2), `= ${body.fairOdds}`);
    check("EV = +10.25%", near(body.edgePct, 10.25, 0.05), `= ${body.edgePct}`);
    check("stake en unidades > 0", body.stakeUnits > 0, `= ${body.stakeUnits}`);
    check("stake en dinero sobre el bankroll", body.stakeAmount > 0, `= ${body.stakeAmount}`);
    check("válido y sin avisos", body.valid === true && body.warnings.length === 0);
  }
  {
    const { body } = await call("/parlays/evaluate", {
      method: "POST",
      body: JSON.stringify({ legs: [
        { eventId: "a", market: "h2h", selection: "A", odds: 1.80, fairProb: 0.5 },
        { eventId: "b", market: "h2h", selection: "B", odds: 1.80, fairProb: 0.5 },
      ] }),
    });
    check("sin valor → EV negativo", body.edgePct < 0, `= ${body.edgePct}`);
    check("sin valor → stake 0", body.stakeUnits === 0);
    check("sin valor → avisa en español", body.warnings.some((w: string) => w.includes("valor esperado")));
  }
  {
    const { body } = await call("/parlays/evaluate", {
      method: "POST",
      body: JSON.stringify({ legs: [
        { eventId: "mismo", market: "h2h", selection: "A", odds: 2.0, fairProb: 0.5 },
        { eventId: "mismo", market: "totals", selection: "Over", line: 2.5, odds: 1.9, fairProb: 0.55 },
      ] }),
    });
    check("dos piernas del mismo partido → aviso de correlación",
      body.warnings.some((w: string) => w.includes("mismo partido")));
  }
  {
    const { status, body } = await call("/parlays/evaluate", { method: "POST", body: JSON.stringify({ legs: [] }) });
    check("sin piernas → 400", status === 400, `= ${status}`);
    check("error con code y message", typeof body?.error?.code === "string" && typeof body?.error?.message === "string");
  }
  {
    const { body } = await call("/parlays/evaluate", {
      method: "POST",
      body: JSON.stringify({ legs: [{ eventId: "a", market: "h2h", selection: "A", odds: 2.0, fairProb: 0.55 }] }),
    });
    check("una sola pierna → valid:false con error legible", body.valid === false && body.errors.length > 0);
  }

  // ── 3 · Construcción con IA ────────────────────────────────────────────
  console.log("\n── /parlays/build ──");
  {
    const { status, body } = await call("/parlays/build", {
      method: "POST",
      body: JSON.stringify({ prompt: "algo de liga mx para hoy", count: 2 }),
    });
    if (body?.demo) {
      check("sin BD cae a demo (200)", status === 200);
      check("devuelve el intent interpretado", body.intent && typeof body.intent.legs === "number");
      check("respeta count", body.parlays.length <= 2);
    } else {
      check("con BD exige sesión (401) o devuelve parlays (200)", status === 401 || status === 200, `= ${status}`);
    }
  }

  // ── 4 · Degradado sin base de datos ────────────────────────────────────
  console.log("\n── endpoints con base de datos ──");
  for (const path of dbBacked) {
    const { status, body } = await call(path);
    const okShape = status === 200 || (status === 503 && body?.error?.code === "not_configured");
    check(`${path} → 200 o 503 limpio`, okShape, `= ${status}`);
    check(`${path} nunca 500`, status !== 500);
  }
  {
    const { status } = await call("/me");
    check("/me sin sesión → 401 o 503, nunca 200", status === 401 || status === 503, `= ${status}`);
  }
  {
    const { status } = await call("/parlays/no-existe/explain", { method: "POST", body: JSON.stringify({ question: "¿por qué?" }) });
    check("explain sin sesión → 401/403/503", [401, 403, 503].includes(status), `= ${status}`);
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`${pass} pasados · ${fail} fallidos\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`\nNo se pudo conectar con ${BASE}`);
  console.error("¿Está corriendo el backend?  npm run dev\n");
  console.error(e.message);
  process.exit(1);
});
