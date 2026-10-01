// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAR LAS LIGAS CONTRA THE ODDS API
// ═══════════════════════════════════════════════════════════════════════════
//
//   ODDS_API_KEY=… npm run leagues:verify
//
// El endpoint /sports es GRATIS: no consume créditos. Úsalo al configurar la
// API key y una vez al mes, porque los sport_key cambian cuando una
// competición entra o sale de temporada — y una liga mal escrita es una liga
// que nunca genera picks y nadie nota.

import { LEAGUES, POLL_HOURS } from "../src/lib/config.ts";
import { fetchSports } from "../src/lib/odds.ts";

async function main() {
  if (!process.env.ODDS_API_KEY) {
    console.error("\nFalta ODDS_API_KEY.\n  set -a && source .env.local && set +a && npm run leagues:verify\n");
    process.exit(1);
  }

  const { data: remote } = await fetchSports();
  const byKey = new Map(remote.map((s) => [s.key, s]));

  const ok: string[] = [], inactive: string[] = [], missing: string[] = [];
  for (const l of LEAGUES) {
    const r = byKey.get(l.key);
    if (!r) missing.push(`${l.slug.padEnd(18)} ${l.key}`);
    else if (!r.active) inactive.push(`${l.slug.padEnd(18)} ${l.key}`);
    else ok.push(l.slug);
  }

  console.log(`\n${ok.length} activas · ${inactive.length} fuera de temporada · ${missing.length} no existen\n`);

  if (missing.length) {
    console.log("✗ NO EXISTEN en The Odds API — corrige el key en config.ts:");
    missing.forEach((m) => console.log(`    ${m}`));
    console.log("");
  }
  if (inactive.length) {
    console.log("· Fuera de temporada (normal, volverán solas):");
    inactive.forEach((m) => console.log(`    ${m}`));
    console.log("");
  }

  // Ligas de LatAm disponibles que todavía no tenemos: dinero en la mesa.
  const nuestras = new Set(LEAGUES.map((l) => l.key));
  const latam = remote.filter(
    (s) => s.active && !nuestras.has(s.key) &&
      /mexico|argentina|brazil|colombia|chile|peru|ecuador|uruguay|venezuela|bolivia|paraguay|conmebol|copa/i.test(s.key)
  );
  if (latam.length) {
    console.log("+ Disponibles en LatAm y NO configuradas (candidatas a añadir):");
    latam.forEach((s) => console.log(`    ${s.key.padEnd(44)} ${s.title}`));
    console.log("");
  }

  // Presupuesto de créditos con el escalonado actual
  const mercados = (process.env.ODDS_MARKETS ?? "h2h,spreads,totals").split(",").length;
  const regiones = (process.env.ODDS_REGIONS ?? "eu,us").split(",").length;
  const porLlamada = mercados * regiones;
  const activas = LEAGUES.filter((l) => byKey.get(l.key)?.active);
  const mes = activas.reduce((s, l) => s + (24 / POLL_HOURS[l.priority]) * porLlamada * 30, 0);

  console.log(`Créditos: ${porLlamada}/llamada · ~${Math.round(mes).toLocaleString("es")}/mes con las ${activas.length} activas`);
  if (mes > 90_000) console.log("⚠ Te acercas al límite del plan de 100.000. Baja alguna liga a prioridad 3.");
  else console.log("✓ Dentro del plan de 100.000 créditos.\n");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
