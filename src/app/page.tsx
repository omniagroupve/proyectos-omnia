import Link from "next/link";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import PerformanceBar, { type Performance } from "@/components/PerformanceBar";
import PickCard, { type PickView } from "@/components/PickCard";
import PricingTable from "@/components/PricingTable";
import ValueCalculator from "@/components/ValueCalculator";
import HeroCanvas from "@/components/HeroCanvas";
import DevigVisual from "@/components/DevigVisual";
import ScrollProcess from "@/components/ScrollProcess";
import { Reveal, CountUp, LiveDot } from "@/components/Motion";
import { SEO_LEAGUES } from "@/lib/config";

export const revalidate = 900;

const PICK_SELECT = `
  id, market, selection, line, odds_taken, book, edge_pct, stake_units,
  confidence, rationale, tier_required, published_at, result, clv_pct, profit_units,
  events!inner ( home_team, away_team, sport_title, league_slug, slug, commence_time )
`;

async function getData() {
  const empty = { perf: null as Performance | null, recent: [] as PickView[] };
  if (!isSupabaseConfigured()) return empty;
  try {
    const sb = supabasePublic();
    const [perf, recent] = await Promise.all([
      sb.from("v_performance").select("*").single(),
      sb.from("picks").select(PICK_SELECT)
        .neq("result", "pending")
        .order("published_at", { ascending: false })
        .limit(3),
    ]);
    return {
      perf: (perf.data ?? null) as Performance | null,
      recent: (recent.data ?? []) as unknown as PickView[],
    };
  } catch {
    return empty;
  }
}

const HERO_STATS = [
  { v: 40, suf: "+", l: "casas leídas" },
  { v: 3.81, suf: "%", l: "CLV medio", dec: 2, pre: "+" },
  { v: 83, suf: "%", l: "bate el cierre" },
  { v: 2, suf: "h", l: "ciclo de análisis" },
];

export default async function Home() {
  const { perf, recent } = await getData();

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        {/* Capas de profundidad: canvas de datos, malla, viñeta */}
        <HeroCanvas className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] w-full opacity-[0.55]" />
        <div className="pointer-events-none absolute inset-0 grid-bg" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] bg-gradient-to-b from-transparent via-ink/40 to-ink" />

        <div className="container-x relative pb-20 pt-28 text-center sm:pt-36">
          <div className="mx-auto mb-8 inline-flex animate-fade-up items-center gap-2.5 rounded-full border border-line bg-panel/70 px-4 py-2 text-xs backdrop-blur-md">
            <LiveDot />
            <span className="text-muted">Analizando</span>
            <span className="font-mono font-semibold text-white">20</span>
            <span className="text-muted">competiciones ahora mismo</span>
          </div>

          <h1 className="mx-auto max-w-5xl animate-fade-up text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.03em] [animation-delay:80ms]">
            El mercado se equivoca
            <br />
            <span className="text-gradient">y nosotros lo medimos</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:160ms] sm:text-xl">
            IA Picks sobre el consenso de 40+ casas. Cada pick queda publicado
            con fecha, hora y cuota de cierre — incluidos los que fallan.
          </p>

          <div className="mt-11 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:240ms]">
            <Link href="/precios" className="btn-primary !px-8 !py-4 !text-base">
              Empezar gratis
            </Link>
            <Link href="/rendimiento" className="btn-ghost !px-8 !py-4 !text-base">
              Auditar el track record
            </Link>
          </div>

          <p className="mt-6 animate-fade-in text-xs text-muted [animation-delay:400ms]">
            Sin tarjeta · +18 · No garantizamos beneficios
          </p>

          <div className="mx-auto mt-20 grid max-w-3xl animate-fade-up grid-cols-2 gap-3 sm:grid-cols-4 [animation-delay:320ms]">
            {HERO_STATS.map((s) => (
              <div key={s.l} className="card card-hover p-5">
                <div className="font-mono text-2xl font-bold tabular-nums text-accent sm:text-3xl">
                  <CountUp to={s.v} decimals={s.dec ?? 0} prefix={s.pre ?? ""} suffix={s.suf} />
                </div>
                <div className="mt-1.5 text-xs leading-tight text-muted">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MOMENTO FIRMA · el devig ═══════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-28">
          <div className="mb-10 text-center">
            <div className="label">Por qué existe el producto</div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight">
              Una cuota de 2.00 no significa 50%
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted">
              Las probabilidades de un mercado suman más del 100%. Ese exceso es
              el margen de la casa, y mientras no lo elimines todas las apuestas
              parecen tener valor.
            </p>
          </div>
          <DevigVisual />
        </section>
      </Reveal>

      {/* ═══ PRUEBA SOCIAL ══════════════════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-28">
          <PerformanceBar p={perf} />
          <p className="mt-5 text-center text-xs text-muted">
            Calculado automáticamente sobre todos los picks liquidados. Sin
            selección manual de resultados.{" "}
            <Link href="/rendimiento" className="text-accent hover:underline">
              Ver histórico completo →
            </Link>
          </p>
        </section>
      </Reveal>

      {/* ═══ PROCESO ════════════════════════════════════════════════════ */}
      <section className="container-x mt-32">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <div className="label">El motor</div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight">
              No predecimos partidos.
              <br />
              Detectamos precios mal puestos.
            </h2>
          </div>
        </Reveal>
        <ScrollProcess />
      </section>

      {/* ═══ MODELO PROPIO ══════════════════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-32">
          <div className="card overflow-hidden">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                <div className="label">Modelo propio</div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  Dixon-Coles mezclado con el precio del mercado
                </h2>
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
                  <p>
                    Cada equipo tiene dos parámetros latentes estimados por máxima
                    verosimilitud sobre su histórico de goles: fuerza atacante y
                    fuerza defensiva. Más ventaja de campo y una corrección de
                    dependencia para los resultados de pocos goles.
                  </p>
                  <p>
                    Esa corrección importa: sin ella el modelo infravalora el
                    empate de forma sistemática, que es justo donde el backtest
                    detectó que se concentra el valor.
                  </p>
                </div>
              </div>

              <div className="relative border-t border-line bg-ink/50 p-8 lg:border-l lg:border-t-0 lg:p-12">
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
                <div className="relative">
                  <div className="label mb-5">Validación · recuperación de parámetros</div>
                  <dl className="space-y-3.5 text-sm">
                    {[
                      ["Fuerza atacante", "r = 0.91"],
                      ["Fuerza defensiva", "r = 0.94"],
                      ["Ventaja de campo (real 0.26)", "0.258"],
                      ["Correlación ρ (real −0.08)", "−0.084"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line/60 pb-2.5">
                        <dt className="text-muted">{k}</dt>
                        <dd className="font-mono font-semibold tabular-nums text-accent">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-8 rounded-xl border border-line bg-panel p-5">
                    <div className="label">Peso máximo del modelo propio</div>
                    <div className="mt-1 font-mono text-3xl font-bold text-white">35%</div>
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      El log loss medido del mercado es 0.946 frente a 1.090 de la
                      frecuencia base. Es un predictor muy fuerte: un modelo propio
                      que se le imponga con peso alto empeora las probabilidades.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ═══ PICKS RECIENTES ════════════════════════════════════════════ */}
      {recent.length > 0 && (
        <Reveal>
          <section className="container-x mt-32">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Últimos picks liquidados</h2>
                <p className="mt-2 text-muted">Públicos y sin editar. Los perdedores también.</p>
              </div>
              <Link href="/rendimiento" className="hidden text-sm text-accent hover:underline sm:block">
                Ver todos →
              </Link>
            </div>
            <div className="grid gap-4">
              {recent.map((p) => <PickCard key={p.id} pick={p} />)}
            </div>
          </section>
        </Reveal>
      )}

      {/* ═══ CALCULADORA ════════════════════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-32">
          <div className="mb-10 text-center">
            <div className="label">Gratis, sin registro</div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight">
              Compruébalo tú mismo
            </h2>
          </div>
          <ValueCalculator />
        </section>
      </Reveal>

      {/* ═══ PRECIOS ════════════════════════════════════════════════════ */}
      <Reveal>
        <section id="precios" className="container-x mt-32">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight">Planes</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              Empieza gratis. Sube cuando el track record te convenza — no antes.
            </p>
          </div>
          <PricingTable />
        </section>
      </Reveal>

      {/* ═══ SEO INTERNO ════════════════════════════════════════════════ */}
      <section className="container-x mt-32">
        <h2 className="text-xl font-bold">Pronósticos por competición</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {SEO_LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/pronosticos/${l.slug}`}
              className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-muted transition hover:border-accent/50 hover:text-accent"
            >
              Pronósticos {l.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
