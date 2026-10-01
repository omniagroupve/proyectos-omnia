import Link from "next/link";
import { decimalToAmerican } from "@/lib/devig";

export interface PickView {
  id: string;
  market: string;
  selection: string;
  line: number | null;
  odds_taken: number;
  book: string;
  edge_pct: number;
  stake_units: number;
  confidence: number;
  rationale: string | null;
  tier_required: string;
  published_at: string;
  result: string;
  clv_pct: number | null;
  profit_units: number | null;
  events?: {
    home_team: string;
    away_team: string;
    sport_title: string;
    league_slug: string;
    slug: string;
    commence_time: string;
  } | null;
}

const MARKET_LABEL: Record<string, string> = {
  h2h: "Ganador",
  spreads: "Hándicap",
  totals: "Total",
  props: "Prop",
};

const RESULT_STYLE: Record<string, string> = {
  win: "bg-accent/15 text-accent border-accent/40",
  loss: "bg-danger/15 text-danger border-danger/40",
  push: "bg-white/10 text-muted border-line",
  void: "bg-white/10 text-muted border-line",
  pending: "bg-gold/10 text-gold border-gold/40",
};

const RESULT_LABEL: Record<string, string> = {
  win: "Ganado",
  loss: "Perdido",
  push: "Nulo",
  void: "Anulado",
  pending: "En juego",
};

export default function PickCard({
  pick,
  locked = false,
  bankroll,
  unitPct = 1,
}: {
  pick: PickView;
  locked?: boolean;
  bankroll?: number;
  unitPct?: number;
}) {
  const ev = pick.events;
  const line =
    pick.line !== null && pick.line !== undefined
      ? ` ${pick.line > 0 ? "+" : ""}${pick.line}`
      : "";

  // Traducir unidades a dinero real: reduce muchísimo la fricción mental
  // y es una de las features más valoradas por suscriptores de pago.
  const money =
    bankroll != null
      ? Math.round(bankroll * (unitPct / 100) * pick.stake_units)
      : null;

  return (
    <article className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="label truncate">
            {ev?.sport_title ?? "—"}
            {ev && (
              <> · {new Date(ev.commence_time).toLocaleString("es", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })}</>
            )}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold">
            {ev ? (
              <Link href={`/pronosticos/${ev.league_slug}/${ev.slug}`} className="hover:text-accent">
                {ev.home_team} vs {ev.away_team}
              </Link>
            ) : (
              "Evento"
            )}
          </h3>
        </div>
        <span className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${RESULT_STYLE[pick.result]}`}>
          {RESULT_LABEL[pick.result]}
        </span>
      </div>

      <div className={locked ? "blur-locked" : ""}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-line bg-ink/50 p-4">
          <div>
            <div className="label">Pick</div>
            <div className="mt-0.5 font-semibold">
              {MARKET_LABEL[pick.market] ?? pick.market}: {pick.selection}{line}
            </div>
          </div>
          <div>
            <div className="label">Cuota</div>
            <div className="mt-0.5 font-mono font-semibold tabular-nums">
              {Number(pick.odds_taken).toFixed(2)}
              <span className="ml-1.5 text-xs text-muted">
                ({decimalToAmerican(Number(pick.odds_taken)) > 0 ? "+" : ""}
                {decimalToAmerican(Number(pick.odds_taken))})
              </span>
            </div>
          </div>
          <div>
            <div className="label">Casa</div>
            <div className="mt-0.5 text-sm font-medium">{pick.book}</div>
          </div>
          <div>
            <div className="label">Valor</div>
            <div className="mt-0.5 font-mono font-semibold tabular-nums text-accent">
              +{Number(pick.edge_pct).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="label">Stake</div>
            <div className="mt-0.5 font-mono font-semibold tabular-nums">
              {Number(pick.stake_units).toFixed(1)}u
              {money !== null && <span className="ml-1.5 text-xs text-muted">≈ ${money}</span>}
            </div>
          </div>
          <div>
            <div className="label">Confianza</div>
            <div className="mt-0.5 font-mono text-gold">
              {"★".repeat(pick.confidence)}
              <span className="text-line">{"★".repeat(5 - pick.confidence)}</span>
            </div>
          </div>
        </div>

        {pick.rationale && (
          <p className="mt-3 text-sm leading-relaxed text-muted">{pick.rationale}</p>
        )}
      </div>

      {locked && (
        <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <span className="text-sm text-muted">
            Este pick es de{" "}
            <strong className="uppercase text-accent">{pick.tier_required}</strong>
          </span>
          <Link href="/precios" className="btn-primary !px-4 !py-2 !text-xs">
            Desbloquear
          </Link>
        </div>
      )}

      {pick.result !== "pending" && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-xs">
          <span className="text-muted">
            Resultado:{" "}
            <strong className={Number(pick.profit_units) >= 0 ? "text-accent" : "text-danger"}>
              {Number(pick.profit_units) > 0 ? "+" : ""}
              {Number(pick.profit_units ?? 0).toFixed(2)}u
            </strong>
          </span>
          {pick.clv_pct !== null && (
            <span className="text-muted">
              CLV:{" "}
              <strong className={Number(pick.clv_pct) >= 0 ? "text-accent" : "text-danger"}>
                {Number(pick.clv_pct) > 0 ? "+" : ""}
                {Number(pick.clv_pct).toFixed(2)}%
              </strong>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
