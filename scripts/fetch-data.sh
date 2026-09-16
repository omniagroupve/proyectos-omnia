#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# PIX · descarga del histórico deportivo
#   football-data.co.uk  → fútbol Europa + ligas extra (ARG, BRA, MEX, USA…)
#   tennis-data.co.uk    → ATP/WTA con cuotas desde 2001
# Gratis, sin API key, sin registro. Incluye cuotas de CIERRE de Pinnacle.
# ═══════════════════════════════════════════════════════════════════════════
#
#   bash scripts/fetch-data.sh
#   npm run backtest
#   npm run data:seed          # carga a Supabase (necesita claves)
#
# ~30.000 partidos en un par de minutos. Con eso el backtest ya significa algo.

set -uo pipefail
OUT="data/raw"
mkdir -p "$OUT"

ok=0; skip=0

dl() { # dl <url> <destino> <columna que debe existir>
  local url="$1" f="$2" col="$3"
  [ -f "$f" ] && { skip=$((skip+1)); return 0; }
  if curl -sfL --max-time 60 "$url" -o "$f"; then
    if [ "$(wc -l < "$f")" -lt 20 ] || ! head -1 "$f" | grep -qi "$col"; then
      rm -f "$f"; return 1
    fi
    ok=$((ok+1)); echo "  ✓ $(basename "$f")  ($(( $(wc -l < "$f") - 1 )) filas)"
  else
    rm -f "$f"; return 1
  fi
  sleep 0.3   # cortesía con el servidor
}

# ─── 1 · Fútbol Europa · una URL por liga y temporada ──────────────────────
# E0=Premier D1=Bundesliga I1=SerieA SP1=LaLiga F1=Ligue1 N1=Eredivisie
# P1=Portugal B1=Bélgica T1=Turquía SC0=Escocia  (+ segundas divisiones)
EURO=(E0 E1 D1 D2 I1 I2 SP1 SP2 F1 F2 N1 P1 B1 T1 SC0)
SEASONS=(1920 2021 2122 2223 2324 2425 2526)

echo "── Fútbol Europa ──"
for s in "${SEASONS[@]}"; do
  for l in "${EURO[@]}"; do
    dl "https://www.football-data.co.uk/mmz4281/$s/$l.csv" "$OUT/${l}_${s}.csv" "PSCH" || true
  done
done

# ─── 2 · Ligas extra · LatAm y USA · un único CSV con todo el histórico ────
# Estos ficheros traen todas las temporadas juntas y usan otro esquema:
# columnas Home/Away, HG/AG, Res, PH/PD/PA (Pinnacle) y PSCH/PSCD/PSCA cuando
# existe cierre. Por eso se comprueba "Home" y no "PSCH".
echo ""
echo "── Ligas extra (LatAm, USA, Asia) ──"
EXTRA=(ARG BRA MEX USA CHN JPN)
for l in "${EXTRA[@]}"; do
  dl "https://www.football-data.co.uk/new/$l.csv" "$OUT/extra_${l}.csv" "Home" || true
done

# ─── 3 · Tenis · un CSV por año y circuito ─────────────────────────────────
echo ""
echo "── Tenis ──"
for y in $(seq 2019 2026); do
  dl "http://www.tennis-data.co.uk/${y}/${y}.xlsx" "$OUT/atp_${y}.xlsx" "" || true
done

echo ""
echo "$ok ficheros nuevos · $skip ya estaban · en $OUT/"
echo "Partidos totales (aprox): $(cat "$OUT"/*.csv 2>/dev/null | wc -l)"
echo ""
echo "Siguiente paso:"
echo "  npm run backtest"
echo "  npm run data:seed      # carga el histórico en Supabase"
