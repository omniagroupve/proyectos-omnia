#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Descarga histórico de cuotas de football-data.co.uk
# Gratis, sin API key, sin registro. Incluye cuotas de CIERRE de Pinnacle.
# ═══════════════════════════════════════════════════════════════════════════
#
#   bash scripts/fetch-data.sh
#   node --experimental-strip-types scripts/backtest.ts data/raw/*.csv
#
# ~15.000 partidos en unos 30 segundos. Con eso el ROI del backtest ya
# significa algo (con 200 partidos no significa nada).

set -euo pipefail
OUT="data/raw"
mkdir -p "$OUT"

# Ligas: E0=Premier D1=Bundesliga I1=SerieA SP1=LaLiga F1=Ligue1
#        N1=Eredivisie P1=Portugal B1=Bélgica T1=Turquía SC0=Escocia
LEAGUES=(E0 E1 D1 D2 I1 I2 SP1 SP2 F1 F2 N1 P1 B1 T1 SC0)

# Temporadas. Las cuotas de CIERRE (columnas *C*) existen desde 2019/20.
SEASONS=(1920 2021 2122 2223 2324 2425 2526)

n=0
for s in "${SEASONS[@]}"; do
  for l in "${LEAGUES[@]}"; do
    f="$OUT/${l}_${s}.csv"
    [ -f "$f" ] && continue
    if curl -sfL --max-time 30 "https://www.football-data.co.uk/mmz4281/$s/$l.csv" -o "$f"; then
      # Descarta ficheros vacíos o sin columnas de cierre
      if [ "$(wc -l < "$f")" -lt 20 ] || ! head -1 "$f" | grep -q "PSCH"; then
        rm -f "$f"
      else
        n=$((n+1)); echo "  ✓ $l $s  ($(( $(wc -l < "$f") - 1 )) partidos)"
      fi
    else
      rm -f "$f"
    fi
    sleep 0.3   # cortesía con el servidor
  done
done

echo ""
echo "$n ficheros en $OUT/"
echo "Partidos totales: $(cat "$OUT"/*.csv 2>/dev/null | wc -l)"
echo ""
echo "Siguiente paso:"
echo "  node --experimental-strip-types scripts/backtest.ts $OUT/*.csv"
echo "  node --experimental-strip-types scripts/diagnose.ts $OUT/*.csv"
