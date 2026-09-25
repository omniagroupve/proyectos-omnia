// ═══════════════════════════════════════════════════════════════════════════
// QUÉ CASAS TENEMOS REALMENTE · el dato que decide el negocio de afiliación
// ═══════════════════════════════════════════════════════════════════════════
//
//   ODDS_API_KEY=… npm run books:verify
//
// La afiliación sólo funciona si enseñamos la cuota de una casa donde el
// usuario PUEDE jugar. Este script cruza tres cosas:
//
//   1. qué casas devuelve de verdad The Odds API en cada región
//   2. cuáles tenemos en el catálogo (tabla `books`)
//   3. cuáles hemos declarado disponibles por país
//
// y te dice con cuáles puedes negociar YA (tienes su cuota) y cuáles son un
// enlace a ciegas (no tienes su cuota, sólo el logo).
//
// Gasta 1 llamada de /odds por región. Céntimos, no miles de créditos.

import { LEAGUES } from "../src/lib/config.ts";
import { fetchOdds } from "../src/lib/odds.ts";

// Casas que operan en LatAm y suelen tener programa de afiliación.
// Si alguna aparece en la salida como "con cuota", es candidata prioritaria.
const LATAM = /caliente|betano|codere|wplay|betplay|rushbet|bplay|coolbet|dorado|apuestatotal|betsson|strendus|sportingbet|kto|bet365|betfair|pinnacle|winamax|bwin/i;

async function main() {
  if (!process.env.ODDS_API_KEY) {
    console.error("\nFalta ODDS_API_KEY.\n  set -a && source .env.local && set +a && npm run books:verify\n");
    process.exit(1);
  }

  const regiones = (process.env.ODDS_REGIONS ?? "eu,us,uk,au").split(",");
  const liga = LEAGUES.find((l) => l.priority === 1) ?? LEAGUES[0];
  const porRegion = new Map<string, Map<string, string>>();

  for (const region of regiones) {
    try {
      const { data, quota } = await fetchOdds(liga.key, { regions: region, markets: "h2h" });
      const casas = new Map<string, string>();
      for (const ev of data) for (const bk of ev.bookmakers ?? []) casas.set(bk.key, bk.title);
      porRegion.set(region, casas);
      console.log(`  ${region}: ${casas.size} casas  (quedan ${quota.remaining ?? "?"} créditos)`);
    } catch (e) {
      console.log(`  ${region}: error — ${(e as Error).message}`);
    }
  }

  const todas = new Map<string, { title: string; regiones: string[] }>();
  for (const [region, casas] of porRegion) {
    for (const [key, title] of casas) {
      const cur = todas.get(key) ?? { title, regiones: [] };
      cur.regiones.push(region);
      todas.set(key, cur);
    }
  }

  console.log(`\n${"═".repeat(62)}`);
  console.log(`${todas.size} casas distintas disponibles con cuota real\n`);

  const relevantes = [...todas.entries()].filter(([k, v]) => LATAM.test(k) || LATAM.test(v.title));
  const resto = [...todas.entries()].filter(([k, v]) => !LATAM.test(k) && !LATAM.test(v.title));

  console.log("✓ CON CUOTA + operan en LatAm o España → negocia afiliación con estas PRIMERO:");
  if (relevantes.length === 0) console.log("    (ninguna — ver el aviso de abajo)");
  for (const [key, v] of relevantes) {
    console.log(`    ${key.padEnd(24)} ${v.title.padEnd(22)} [${v.regiones.join(",")}]`);
  }

  console.log(`\n· Otras ${resto.length} con cuota (sobre todo Europa/USA), útiles para el consenso`);
  console.log(`  pero no para enlazar a un usuario de LatAm:`);
  console.log(`    ${resto.slice(0, 12).map(([k]) => k).join(", ")}${resto.length > 12 ? ", …" : ""}`);

  // Las que pusimos en el catálogo sin tener su cuota
  const conCuota = new Set(todas.keys());
  const catalogo = ["caliente","betano","codere","wplay","betplay","rushbet","bplay","coolbet","doradobet","apuestatotal","sportingbet","kto","strendus"];
  const aCiegas = catalogo.filter((k) => !conCuota.has(k));

  if (aCiegas.length) {
    console.log(`\n⚠ EN EL CATÁLOGO PERO SIN CUOTA (${aCiegas.length}):`);
    console.log(`    ${aCiegas.join(", ")}`);
    console.log(`  De estas sabes el logo, no el precio. Dos opciones honestas:`);
    console.log(`    a) enseñarlas como "también disponible en tu país", sin cuota`);
    console.log(`    b) dejarlas fuera del comparador hasta conseguir su precio`);
    console.log(`  Lo que NO puedes hacer es enseñar la cuota de otra casa y enlazar a esta.`);
  }

  console.log(`\n${"═".repeat(62)}`);
  console.log("Siguiente paso: con las de la lista ✓, busca su programa de afiliación");
  console.log("y al firmar rellena affiliate_url y licensed en `book_availability`.\n");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
