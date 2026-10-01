// ═══════════════════════════════════════════════════════════════════════════
// DOCTOR · qué falta para que Pix arranque
// ═══════════════════════════════════════════════════════════════════════════
//
//   npm run doctor              revisa el entorno · no sale a la red · $0
//   npm run doctor -- --online  además pregunta saldo, base de datos y bot
//
// Existe porque el día que tengas las llaves no deberías ir probando script
// por script a ver cuál truena. Esto te dice de una sola vez qué está puesto,
// qué falta y qué está mal escrito, separando lo imprescindible de lo que
// puede esperar.
//
// NUNCA IMPRIME EL VALOR DE UNA CLAVE. Sólo si está y si tiene la forma
// correcta. Puedes pegar su salida en un chat sin filtrar nada.
//
// Lee `.env.local` solo (ver el script en package.json), así que no hace falta
// exportar nada a mano.

import { LEAGUES, POLL_HOURS } from "../src/lib/config.ts";
import { externalPaused } from "../src/lib/odds.ts";
import { readFileSync } from "node:fs";

// ─── Presentación ──────────────────────────────────────────────────────────

type Nivel = "clave" | "opcional";
type Estado = "ok" | "falta" | "mal" | "aviso";

interface Resultado {
  nombre: string;
  nivel: Nivel;
  estado: Estado;
  detalle: string;
}

const resultados: Resultado[] = [];
const SIMBOLO: Record<Estado, string> = { ok: "✓", falta: "·", mal: "✗", aviso: "!" };

/** 6750 → "6.750". `toLocaleString` no separa miles en todos los runtimes. */
const miles = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function seccion(titulo: string) {
  console.log(`\n── ${titulo} ${"─".repeat(Math.max(0, 62 - titulo.length))}`);
}

function linea(r: Resultado) {
  const etiqueta = r.nivel === "clave" && r.estado !== "ok" ? " (imprescindible)" : "";
  console.log(`  ${SIMBOLO[r.estado]} ${r.nombre}${etiqueta}${r.detalle ? " — " + r.detalle : ""}`);
}

/** Comprueba una variable y la reporta sin revelar su contenido. */
function variable(
  nombre: string,
  nivel: Nivel,
  opciones: { minimo?: number; forma?: RegExp; formaDice?: string } = {}
): string | null {
  const valor = process.env[nombre];
  if (!valor) {
    const r: Resultado = { nombre, nivel, estado: nivel === "clave" ? "mal" : "falta", detalle: "sin poner" };
    resultados.push(r);
    linea(r);
    return null;
  }
  if (opciones.minimo && valor.length < opciones.minimo) {
    const r: Resultado = { nombre, nivel, estado: "mal", detalle: `demasiado corta (${valor.length}, mínimo ${opciones.minimo})` };
    resultados.push(r);
    linea(r);
    return valor;
  }
  if (opciones.forma && !opciones.forma.test(valor)) {
    const r: Resultado = { nombre, nivel, estado: "mal", detalle: opciones.formaDice ?? "no tiene la forma esperada" };
    resultados.push(r);
    linea(r);
    return valor;
  }
  const r: Resultado = { nombre, nivel, estado: "ok", detalle: "" };
  resultados.push(r);
  linea(r);
  return valor;
}

function nota(nombre: string, estado: Estado, detalle: string, nivel: Nivel = "opcional") {
  const r: Resultado = { nombre, nivel, estado, detalle };
  resultados.push(r);
  linea(r);
}

// ─── Coste de créditos según la configuración actual ───────────────────────

/**
 * Llamadas a /odds al mes con el escalonado por prioridad que ya está en
 * `leaguesForHour`. No es una estimación a ojo: sale de las mismas constantes
 * que usa el cron.
 */
function llamadasPorMes(): number {
  const porDia = LEAGUES.reduce((n, l) => n + 24 / POLL_HOURS[l.priority], 0);
  return Math.round(porDia * 30);
}

function planNecesario(creditos: number): string {
  if (creditos <= 20_000) return "el plan de $30 (20.000) sobra";
  if (creditos <= 100_000) return "hace falta el plan de $59 (100.000)";
  return "por encima de 100.000: hay que recortar mercados o regiones";
}

// ─── Revisión sin red ──────────────────────────────────────────────────────

function revisarBaseDeDatos() {
  seccion("Supabase · base de datos y sesión");
  variable("NEXT_PUBLIC_SUPABASE_URL", "clave", {
    forma: /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/,
    formaDice: "debería ser https://algo.supabase.co, sin ruta detrás",
  });
  variable("NEXT_PUBLIC_SUPABASE_ANON_KEY", "clave", { minimo: 40 });
  const servicio = variable("SUPABASE_SERVICE_ROLE_KEY", "clave", { minimo: 40 });

  // El error de seguridad más caro y más fácil de cometer: publicar al
  // navegador la clave que salta RLS. Se busca por nombre y por valor.
  const publicadas = Object.entries(process.env).filter(
    ([k, v]) =>
      k.startsWith("NEXT_PUBLIC_") &&
      (/SERVICE_ROLE|SECRET|PRIVATE/i.test(k) || (servicio ? v === servicio : false))
  );
  if (publicadas.length) {
    nota(
      "clave de servicio expuesta",
      "mal",
      `${publicadas.map(([k]) => k).join(", ")} llega al navegador y salta RLS. Quítale el prefijo NEXT_PUBLIC_ ya`,
      "clave"
    );
  } else {
    nota("ninguna clave secreta con prefijo NEXT_PUBLIC_", "ok", "");
  }
}

function revisarCuotas() {
  seccion("The Odds API · cuotas en vivo");
  variable("ODDS_API_KEY", "clave", { minimo: 20 });

  // Los mismos valores por defecto que src/lib/odds.ts, para no subestimar
  // el gasto de quien no puso las variables.
  const mercados = (process.env.ODDS_MARKETS ?? "h2h,spreads,totals").split(",").map((s) => s.trim()).filter(Boolean);
  const regiones = (process.env.ODDS_REGIONS ?? "eu,us").split(",").map((s) => s.trim()).filter(Boolean);

  const validos = ["h2h", "spreads", "totals"];
  const malMercado = mercados.filter((m) => !validos.includes(m));
  if (malMercado.length) nota("ODDS_MARKETS", "mal", `mercado desconocido: ${malMercado.join(", ")}`, "clave");

  const llamadas = llamadasPorMes();
  const creditos = llamadas * mercados.length * regiones.length;
  nota(
    "presupuesto de créditos",
    creditos <= 20_000 ? "ok" : creditos <= 100_000 ? "aviso" : "mal",
    `${LEAGUES.length} ligas escalonadas = ${miles(llamadas)} llamadas/mes × ` +
      `${mercados.length} mercado(s) × ${regiones.length} región(es) = ` +
      `${miles(creditos)} créditos/mes · ${planNecesario(creditos)}`
  );
}

function revisarCron() {
  seccion("Cron · lo que mantiene vivo el track record");
  variable("CRON_SECRET", "clave", { minimo: 32 });
  nota(
    "recordatorio",
    "aviso",
    "los horarios de GitHub Actions sólo corren desde la rama principal, y necesitan PIX_URL y CRON_SECRET en los secretos del repo"
  );
}

function revisarMotor() {
  seccion("Motor · umbrales (todos tienen valor por defecto)");
  const kelly = Number(process.env.KELLY_FRACTION ?? 0.25);
  if (kelly > 0.5) {
    nota("KELLY_FRACTION", "mal", `${kelly} rompe el invariante: Kelly fraccionado nunca por encima de 0.5`, "clave");
  } else {
    nota("KELLY_FRACTION", "ok", String(kelly));
  }

  const devig = process.env.DEVIG_METHOD ?? "power";
  if (!["power", "multiplicative", "shin"].includes(devig)) {
    nota("DEVIG_METHOD", "mal", `"${devig}" no existe · usa power, multiplicative o shin`, "clave");
  } else {
    nota("DEVIG_METHOD", "ok", devig);
  }

  nota("MIN_EDGE_PCT", "ok", String(process.env.MIN_EDGE_PCT ?? 2.0));
  nota("MAX_PICKS_PER_DAY", "ok", String(process.env.MAX_PICKS_PER_DAY ?? 25));
}

function revisarIa() {
  seccion("IA · opcional, el producto funciona sin ella");
  const modo = process.env.NARRATION_MODE ?? "auto";
  if (!["auto", "templates", "ai"].includes(modo)) {
    nota("NARRATION_MODE", "mal", `"${modo}" no existe · usa auto, templates o ai`, "clave");
  } else {
    nota("NARRATION_MODE", "ok", modo);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    nota("ANTHROPIC_API_KEY", "falta", "sin ella Pix narra con plantillas y cuesta $0 · enciéndela cuando factures");
  } else if (modo === "templates") {
    nota("ANTHROPIC_API_KEY", "aviso", "hay clave pero NARRATION_MODE=templates la ignora a propósito");
  } else {
    nota("ANTHROPIC_API_KEY", "ok", "");
  }
}

function revisarTelegram() {
  seccion("Telegram · opcional, es el canal de distribución");
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    nota("TELEGRAM_BOT_TOKEN", "falta", "sin bot no hay difusión, pero la web funciona igual");
    return;
  }
  variable("TELEGRAM_BOT_TOKEN", "opcional", {
    forma: /^\d+:[A-Za-z0-9_-]{30,}$/,
    formaDice: "debería ser 1234567890:AA… tal y como lo da @BotFather",
  });
  variable("TELEGRAM_WEBHOOK_SECRET", "opcional", { minimo: 32 });
  if (!process.env.TELEGRAM_CHANNEL_PUBLIC) {
    nota("TELEGRAM_CHANNEL_PUBLIC", "falta", "sin canal público no hay captación por picks diferidos");
  } else {
    nota("TELEGRAM_CHANNEL_PUBLIC", "ok", "");
  }
}

function revisarPagos() {
  seccion("Lemon Squeezy · opcional hasta que quieras cobrar");
  const campos = [
    "LEMONSQUEEZY_API_KEY",
    "LEMONSQUEEZY_STORE_ID",
    "LEMONSQUEEZY_WEBHOOK_SECRET",
    "LEMONSQUEEZY_VARIANT_PRO",
    "LEMONSQUEEZY_VARIANT_ELITE",
  ];
  const puestos = campos.filter((c) => process.env[c]);
  if (puestos.length === 0) {
    nota("cobro", "falta", "sin configurar · nadie puede pagar todavía");
  } else if (puestos.length === campos.length) {
    nota("cobro", "ok", "los cinco campos están");
  } else {
    // A medias es peor que nada: el checkout arranca y el webhook no cierra.
    nota(
      "cobro",
      "mal",
      `a medias · faltan ${campos.filter((c) => !process.env[c]).join(", ")}`,
      "clave"
    );
  }
}

function revisarFrenos() {
  seccion("Frenos de seguridad");
  const pausa = process.env.PIX_PAUSE_EXTERNAL === "1";
  const simulacro = process.env.TELEGRAM_DRY_RUN === "1";
  const produccion = process.env.NODE_ENV === "production";

  nota("PIX_PAUSE_EXTERNAL", pausa ? "ok" : "aviso",
    pausa ? "puesto · ninguna llamada de pago sale a la red" : "quitado · las llamadas de pago salen de verdad");

  if (simulacro) {
    nota("TELEGRAM_DRY_RUN", "ok", "puesto · el broadcast calcula pero no envía");
  } else if (produccion) {
    nota("TELEGRAM_DRY_RUN", "ok", "quitado en producción · es lo correcto, los mensajes salen");
  } else {
    nota("TELEGRAM_DRY_RUN", "aviso",
      "quitado fuera de producción · ejecutar el broadcast ahora manda mensajes REALES a personas reales");
  }

  // Un .env.local versionado publica todas las claves en GitHub.
  try {
    const ignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
    const protegido = /^\s*\.env(\*|\.local)?\s*$/m.test(ignore) || /^\s*\.env\*/m.test(ignore);
    nota(".env.local fuera de git", protegido ? "ok" : "mal",
      protegido ? "" : "no aparece en .gitignore · tus claves acabarían en GitHub", protegido ? "opcional" : "clave");
  } catch {
    nota(".gitignore", "aviso", "no se pudo leer");
  }
}

// ─── Revisión con red ──────────────────────────────────────────────────────

async function revisarEnLinea() {
  seccion("Con red · saldo, base de datos y bot");

  if (externalPaused()) {
    nota("--online", "aviso",
      "PIX_PAUSE_EXTERNAL=1 está puesto: no se consultó nada. Quítalo si de verdad quieres preguntar a los proveedores");
    return;
  }

  // The Odds API · /sports no cuesta créditos y devuelve el saldo en cabeceras
  if (process.env.ODDS_API_KEY) {
    try {
      const { fetchSports } = await import("../src/lib/odds.ts");
      const { data, quota } = await fetchSports();
      const activas = data.filter((s) => s.active).length;
      nota("The Odds API responde", "ok", `${activas} competiciones activas`);
      if (quota.remaining !== null) {
        const mercados = (process.env.ODDS_MARKETS ?? "h2h,spreads,totals").split(",").filter(Boolean).length;
        const regiones = (process.env.ODDS_REGIONS ?? "eu,us").split(",").filter(Boolean).length;
        const mes = llamadasPorMes() * mercados * regiones;
        const dias = Math.floor((quota.remaining / mes) * 30);
        nota("créditos restantes", quota.remaining > mes / 4 ? "ok" : "aviso",
          `${miles(quota.remaining)} · a este ritmo duran ~${dias} días`);
      }
    } catch (e) {
      nota("The Odds API", "mal", (e as Error).message, "clave");
    }
  }

  // Supabase · ¿responde y están corridas las migraciones?
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const tablas: Array<[string, string]> = [
      ["picks", "schema.sql"],
      ["parlays", "migrations/002_pix.sql"],
      ["ai_requests", "migrations/002_pix.sql"],
      ["jurisdictions", "migrations/002_pix.sql"],
    ];
    for (const [tabla, origen] of tablas) {
      try {
        const res = await fetch(`${url}/rest/v1/${tabla}?select=*&limit=0`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}`, Prefer: "count=exact" },
        });
        if (res.ok) {
          const rango = res.headers.get("content-range") ?? "";
          const total = rango.split("/")[1] ?? "?";
          nota(`tabla ${tabla}`, "ok", `${total} filas`);
        } else {
          nota(`tabla ${tabla}`, "mal", `no existe · falta correr ${origen} en el editor SQL`, "clave");
        }
      } catch (e) {
        nota(`tabla ${tabla}`, "mal", (e as Error).message, "clave");
      }
    }

    // El catálogo de LatAm es datos, no estructura: se comprueba contando.
    try {
      const res = await fetch(`${url}/rest/v1/leagues?select=slug&limit=0`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, Prefer: "count=exact" },
      });
      const total = Number((res.headers.get("content-range") ?? "/0").split("/")[1] ?? 0);
      nota("catálogo de ligas cargado", total >= LEAGUES.length ? "ok" : "aviso",
        `${total} en la base contra ${LEAGUES.length} en config.ts` +
          (total < LEAGUES.length ? " · puede faltar migrations/003_latam.sql" : ""));
    } catch { /* ya se reportó arriba si la base no responde */ }
  }

  // Telegram · getMe no envía nada a nadie
  if (process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
      const body = (await res.json()) as { ok: boolean; result?: { username: string } };
      if (body.ok) nota("bot de Telegram", "ok", `@${body.result?.username}`);
      else nota("bot de Telegram", "mal", "el token no es válido");
    } catch (e) {
      nota("bot de Telegram", "mal", (e as Error).message);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const online = process.argv.includes("--online");

  console.log("\n╭──────────────────────────────────────────────────────────────╮");
  console.log("│  PIX · DOCTOR                                                │");
  console.log("╰──────────────────────────────────────────────────────────────╯");
  console.log("\nNunca imprime el valor de una clave: puedes pegar esta salida donde quieras.");

  revisarBaseDeDatos();
  revisarCuotas();
  revisarCron();
  revisarMotor();
  revisarIa();
  revisarTelegram();
  revisarPagos();
  revisarFrenos();
  if (online) await revisarEnLinea();

  // ── Resumen ──
  const rotos = resultados.filter((r) => r.nivel === "clave" && (r.estado === "mal" || r.estado === "falta"));
  const avisos = resultados.filter((r) => r.estado === "aviso");
  const faltan = resultados.filter((r) => r.nivel === "opcional" && r.estado === "falta");

  console.log(`\n${"─".repeat(64)}`);
  if (rotos.length === 0) {
    console.log("\n  Todo lo imprescindible está puesto.\n");
  } else {
    console.log(`\n  FALTA LO IMPRESCINDIBLE (${rotos.length}):\n`);
    for (const r of rotos) console.log(`    ✗ ${r.nombre}${r.detalle ? " — " + r.detalle : ""}`);
    console.log("\n  Sin esto el motor no arranca. Míralo en docs/encender-el-motor.md\n");
  }

  if (avisos.length) {
    console.log(`  Avisos (${avisos.length}) — no bloquean, pero léelos:\n`);
    for (const r of avisos) console.log(`    ! ${r.nombre} — ${r.detalle}`);
    console.log();
  }

  if (faltan.length) {
    console.log(`  Opcionales sin configurar (${faltan.length}): ${faltan.map((r) => r.nombre).join(", ")}\n`);
  }

  if (!online) {
    console.log("  Para preguntar de verdad a los proveedores:  npm run doctor -- --online\n");
  }

  process.exit(rotos.length > 0 ? 1 : 0);
}

main();
