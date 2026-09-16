import type { Metadata } from "next";
import Link from "next/link";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import PerformanceBar, { type Performance } from "@/components/PerformanceBar";
import PickCard, { type PickView } from "@/components/PickCard";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Track record verificable",
  description:
    "Histórico completo de picks con ROI, unidades netas, acierto y CLV. Sin filtrar: los picks perdedores también están publicados.",
  alternates: { canonical: "/rendimiento" },
};

interface MonthRow {
  month: string;
  picks: number;
  net_units: number;
  roi_pct: number;
  avg_clv_pct: number;
}
interface SportRow {
  sport_title: string;
  picks: number;
  net_units: number;
  roi_pct: number;
}

async function getData() {
  const empty = {
    perf: null as Performance | null,
    monthRows: [] as MonthRow[],
    sportRows: [] as SportRow[],
    picks: [] as PickView[],
  };
  if (!isSupabaseConfigured()) return empty;

  try {
    const sb = supabasePublic();
    const [perf, months, sports, settled] = await Promise.all([
      sb.from("v_performance").select("*").single(),
      sb.from("v_performance_by_month").select("*").limit(24),
      sb.from("v_performance_by_sport").select("*").limit(30),
      sb
        .from("picks")
        .select(`
          id, market, selection, line, odds_taken, book, edge_pct, stake_units,
          confidence, rationale, tier_required, published_at, result, clv_pct, profit_units,
          events!inner ( home_team, away_team, sport_title, league_slug, slug, commence_time )
        `)
        .neq("result", "pending")
        .order("published_at", { ascending: false })
        .limit(60),
    ]);

    return {
      perf: (perf.data ?? null) as Performance | null,
      monthRows: (months.data ?? []) as MonthRow[],
      sportRows: (sports.data ?? []) as SportRow[],
      picks: (settled.data ?? []) as unknown as PickView[],
    };
  } catch {
    return empty;
  }
}

export default async function RendimientoPage() {
  const { perf, monthRows, sportRows, picks } = await getData();
  const num = (v: number | null) => Number(v ?? 0);

  return (
    <div className="container-x py-14">
      <h1 className="text-4xl font-bold tracking-tight">Track record</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Todo lo que ves se calcula automáticamente desde la base de datos sobre
        los picks liquidados. No hay curación manual, no se borra nada y las
        cuotas de cierre se guardan antes de que empiece cada partido.
      </p>

      <div className="mt-10">
        <PerformanceBar p={perf} />
      </div>

      {/* Nota de honestidad: paradójicamente sube la conversión.
          El cliente que paga $197/mes ya sabe cómo funciona la varianza. */}
      <div className="card mt-6 border-gold/30 bg-gold/5 p-5 text-sm leading-relaxed text-muted">
        <strong className="text-gold">Cómo leer estos números.</strong> Por debajo
        de 500 picks liquidados, el ROI es en gran medida ruido estadístico: una
        muestra pequeña puede dar +20% por pura suerte. El <strong>CLV medio</strong> converge
        mucho más rápido y es la métrica que deberías mirar primero. Un CLV
        positivo sostenido con ROI plano indica un modelo bueno con mala racha;
        un ROI alto con CLV negativo indica suerte que no se va a repetir.
      </div>

      {monthRows.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Por mes</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-line text-left">
                <tr className="label">
                  <th className="p-4">Mes</th>
                  <th className="p-4 text-right">Picks</th>
                  <th className="p-4 text-right">Unidades</th>
                  <th className="p-4 text-right">ROI</th>
                  <th className="p-4 text-right">CLV</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((m) => (
                  <tr key={m.month} className="border-b border-line/50 last:border-0">
                    <td className="p-4 font-medium">
                      {new Date(m.month).toLocaleDateString("es", { month: "long", year: "numeric" })}
                    </td>
                    <td className="p-4 text-right font-mono tabular-nums text-muted">{m.picks}</td>
                    <td className={`p-4 text-right font-mono tabular-nums ${num(m.net_units) >= 0 ? "text-accent" : "text-danger"}`}>
                      {num(m.net_units) > 0 ? "+" : ""}{num(m.net_units).toFixed(2)}u
                    </td>
                    <td className={`p-4 text-right font-mono tabular-nums ${num(m.roi_pct) >= 0 ? "text-accent" : "text-danger"}`}>
                      {num(m.roi_pct) > 0 ? "+" : ""}{num(m.roi_pct).toFixed(1)}%
                    </td>
                    <td className="p-4 text-right font-mono tabular-nums text-muted">
                      {num(m.avg_clv_pct) > 0 ? "+" : ""}{num(m.avg_clv_pct).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {sportRows.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Por deporte</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sportRows.map((s) => (
              <div key={s.sport_title} className="card flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{s.sport_title}</div>
                  <div className="text-xs text-muted">{s.picks} picks</div>
                </div>
                <div className={`font-mono font-bold tabular-nums ${num(s.net_units) >= 0 ? "text-accent" : "text-danger"}`}>
                  {num(s.net_units) > 0 ? "+" : ""}{num(s.net_units).toFixed(1)}u
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-bold">Historial de picks</h2>
        {picks.length === 0 ? (
          <div className="card p-6 text-sm text-muted">
            Todavía no hay picks liquidados.
          </div>
        ) : (
          <div className="grid gap-4">
            {picks.map((p) => <PickCard key={p.id} pick={p} />)}
          </div>
        )}
      </section>

      <div className="mt-14 text-center">
        <Link href="/precios" className="btn-primary">Ver planes</Link>
      </div>
    </div>
  );
}
