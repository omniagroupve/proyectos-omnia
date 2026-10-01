// ═══════════════════════════════════════════════════════════════════════════
// PIX · carga del histórico propio en Supabase
// ═══════════════════════════════════════════════════════════════════════════
//
//   bash scripts/fetch-data.sh      # 1. descargar (no funciona en el sandbox)
//   npm run data:seed               # 2. cargar a Supabase
//
// Lee data/raw/*.csv en los dos esquemas de football-data.co.uk:
//
//   A) Liga europea (E0_2425.csv): Date, HomeTeam, AwayTeam, FTHG, FTAG, FTR,
//      PSH/PSD/PSA (Pinnacle apertura), PSCH/PSCD/PSCA (cierre), Max*/Max*C.
//   B) Liga extra   (extra_MEX.csv): Date, Home, Away, HG, AG, Res, Season,
//      PH/PD/PA, PSCH/PSCD/PSCA, MaxH/…
//
// Idempotente: cada fila lleva un hash de origen con índice único, así que
// re-ejecutar no duplica nada.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DIR = process.argv[2] ?? "data/raw";
const BATCH = 500;

// Código de fichero → liga en nuestro catálogo
const LEAGUE_BY_CODE: Record<string, string> = {
  E0: "premier", SP1: "laliga", I1: "serie-a", D1: "bundesliga", F1: "ligue-1",
  MEX: "liga-mx", ARG: "liga-argentina", BRA: "brasileirao", USA: "mls",
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`\nFalta ${name}. Crea .env.local a partir de .env.example y expórtalo:`);
    console.error(`  set -a && source .env.local && set +a && npm run data:seed\n`);
    process.exit(1);
  }
  return v;
}

/** Cliente perezoso: así el parser se puede probar sin claves. */
function db() {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** CSV con comillas: football-data mete comas dentro de nombres de árbitro. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === "," && !quoted) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** dd/mm/yy o dd/mm/yyyy → ISO. */
function toIsoDate(s: string): string | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

interface Match {
  league_code: string; season: string; match_date: string;
  home_team: string; away_team: string;
  home_score: number | null; away_score: number | null;
  result: string | null;
  odds: Array<{ book: string; is_closing: boolean; home: number; draw: number; away: number }>;
  source_row_hash: string;
}

export function parseFile(path: string): Match[] {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "").trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const head = parseLine(lines[0]);
  const at = (name: string) => head.indexOf(name);
  const file = basename(path, ".csv");
  const extra = file.startsWith("extra_");
  const codeFromFile = extra ? file.slice(6) : file.split("_")[0];
  const seasonFromFile = extra ? null : file.split("_")[1] ?? "";

  // Nombres de columna según esquema
  const C = extra
    ? { home: "Home", away: "Away", hg: "HG", ag: "AG", res: "Res", season: "Season", pin: ["PH", "PD", "PA"], max: ["MaxH", "MaxD", "MaxA"] }
    : { home: "HomeTeam", away: "AwayTeam", hg: "FTHG", ag: "FTAG", res: "FTR", season: null, pin: ["PSH", "PSD", "PSA"], max: ["MaxH", "MaxD", "MaxA"] };
  const CLOSE = ["PSCH", "PSCD", "PSCA"];
  const MAXCLOSE = ["MaxCH", "MaxCD", "MaxCA"];

  const out: Match[] = [];
  for (const line of lines.slice(1)) {
    const c = parseLine(line);
    const get = (name: string) => (at(name) >= 0 ? c[at(name)] : "");
    const num = (name: string) => { const v = Number(get(name)); return isFinite(v) && v > 1 ? v : null; };

    const date = toIsoDate(get("Date"));
    const home = get(C.home), away = get(C.away);
    if (!date || !home || !away) continue;

    const trio = (names: string[]) => names.map(num);
    const odds: Match["odds"] = [];
    const push = (book: string, isClosing: boolean, names: string[]) => {
      const [h, d, a] = trio(names);
      if (h && d && a) odds.push({ book, is_closing: isClosing, home: h, draw: d, away: a });
    };
    push("pinnacle", false, C.pin);
    push("pinnacle", true, CLOSE);
    push("max", false, C.max);
    push("max", true, MAXCLOSE);

    const season = C.season ? (get(C.season) || "") : (seasonFromFile ?? "");
    const hg = Number(get(C.hg)), ag = Number(get(C.ag));

    out.push({
      league_code: codeFromFile,
      season: String(season || date.slice(0, 4)),
      match_date: date,
      home_team: home,
      away_team: away,
      home_score: isFinite(hg) ? hg : null,
      away_score: isFinite(ag) ? ag : null,
      result: ["H", "D", "A"].includes(get(C.res)) ? get(C.res) : null,
      odds,
      source_row_hash: createHash("sha1")
        .update(`${codeFromFile}|${date}|${home}|${away}`)
        .digest("hex")
        .slice(0, 24),
    });
  }
  return out;
}

async function main() {
  const sb = db();
  if (!existsSync(DIR)) {
    console.error(`No existe ${DIR}. Ejecuta primero: bash scripts/fetch-data.sh`);
    process.exit(1);
  }
  const files = readdirSync(DIR).filter((f) => f.endsWith(".csv")).sort();
  if (files.length === 0) {
    console.error(`No hay CSV en ${DIR}. Ejecuta primero: bash scripts/fetch-data.sh`);
    process.exit(1);
  }

  console.log(`\n${files.length} ficheros en ${DIR}\n`);
  let totalMatches = 0, totalOdds = 0, skipped = 0;

  for (const f of files) {
    const matches = parseFile(join(DIR, f));
    if (matches.length === 0) { console.log(`  · ${f}: sin filas útiles`); continue; }

    const league = LEAGUE_BY_CODE[matches[0].league_code] ?? null;
    let inserted = 0;

    for (let i = 0; i < matches.length; i += BATCH) {
      const chunk = matches.slice(i, i + BATCH);
      const { data, error } = await sb.from("hist_matches").upsert(
        chunk.map((m) => ({
          sport_key: "soccer",
          league_slug: league,
          league_code: m.league_code,
          season: m.season,
          match_date: m.match_date,
          home_team: m.home_team,
          away_team: m.away_team,
          home_score: m.home_score,
          away_score: m.away_score,
          result: m.result,
          source: "fdcouk",
          source_row_hash: m.source_row_hash,
        })),
        { onConflict: "source,source_row_hash" }
      ).select("id, source_row_hash");

      if (error) { console.error(`  ✗ ${f}: ${error.message}`); skipped++; break; }

      const idByHash = new Map((data ?? []).map((r) => [r.source_row_hash, r.id]));
      inserted += data?.length ?? 0;

      const oddsRows = chunk.flatMap((m) => {
        const id = idByHash.get(m.source_row_hash);
        return id ? m.odds.map((o) => ({
          match_id: id, book: o.book, market: "h2h" as const, is_closing: o.is_closing,
          home_odds: o.home, draw_odds: o.draw, away_odds: o.away,
        })) : [];
      });
      if (oddsRows.length) {
        const { error: oe } = await sb.from("hist_odds").upsert(oddsRows, { onConflict: "match_id,book,market,is_closing" });
        if (oe) console.error(`  ✗ cuotas de ${f}: ${oe.message}`);
        else totalOdds += oddsRows.length;
      }
    }

    totalMatches += inserted;
    console.log(`  ✓ ${f.padEnd(20)} ${String(inserted).padStart(5)} partidos → ${league ?? matches[0].league_code}`);
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`${totalMatches} partidos · ${totalOdds} líneas de cuotas${skipped ? ` · ${skipped} ficheros con error` : ""}\n`);
}

// Sólo corre como CLI; al importarlo (tests) no toca la red.
if (process.argv[1]?.endsWith("seed-history.ts")) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
