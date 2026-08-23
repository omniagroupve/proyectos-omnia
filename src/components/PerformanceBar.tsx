export interface Performance {
  total_picks: number | null;
  wins: number | null;
  losses: number | null;
  net_units: number | null;
  roi_pct: number | null;
  hit_rate_pct: number | null;
  avg_clv_pct: number | null;
  clv_beat_pct: number | null;
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-accent" : tone === "bad" ? "text-danger" : "text-white";
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className={`stat mt-1.5 ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

const n = (v: number | null | undefined) => Number(v ?? 0);
const tone = (v: number) => (v > 0 ? "good" : v < 0 ? "bad" : "default");

export default function PerformanceBar({ p }: { p: Performance | null }) {
  if (!p || !p.total_picks) {
    return (
      <div className="card p-6 text-sm text-muted">
        Aún no hay picks liquidados. Las métricas aparecen automáticamente en
        cuanto el cron de liquidación procese los primeros resultados.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Stat
        label="Unidades netas"
        value={`${n(p.net_units) > 0 ? "+" : ""}${n(p.net_units).toFixed(1)}u`}
        tone={tone(n(p.net_units))}
        hint={`${p.total_picks} picks liquidados`}
      />
      <Stat
        label="ROI"
        value={`${n(p.roi_pct) > 0 ? "+" : ""}${n(p.roi_pct).toFixed(1)}%`}
        tone={tone(n(p.roi_pct))}
        hint="sobre capital arriesgado"
      />
      <Stat
        label="Acierto"
        value={`${n(p.hit_rate_pct).toFixed(1)}%`}
        hint={`${p.wins}G · ${p.losses}P`}
      />
      {/* CLV es la métrica que un apostador informado mira primero.
          Ponerla en portada filtra curiosos y atrae al cliente que paga. */}
      <Stat
        label="CLV medio"
        value={`${n(p.avg_clv_pct) > 0 ? "+" : ""}${n(p.avg_clv_pct).toFixed(2)}%`}
        tone={tone(n(p.avg_clv_pct))}
        hint="vs. cuota de cierre"
      />
      <Stat
        label="Picks que baten el cierre"
        value={`${n(p.clv_beat_pct).toFixed(0)}%`}
        tone={n(p.clv_beat_pct) > 50 ? "good" : "default"}
        hint="por encima del 50% = edge real"
      />
    </div>
  );
}
