// ═══════════════════════════════════════════════════════════════════════════
// /armar · la pantalla principal del producto
// ═══════════════════════════════════════════════════════════════════════════
//
// Es pública a propósito: quien llega desde un anuncio o desde Telegram tiene
// que poder usar el producto antes de registrarse. Pedir cuenta para ver si la
// herramienta sirve mata la conversión.
//
// Con base de datos, las selecciones son los picks reales del motor. Sin ella,
// la piscina de ejemplo. En los dos casos la matemática la hace el motor de
// verdad a través de /api/v1/parlays/evaluate.

import Link from "next/link";
import { isSupabaseConfigured, supabasePublic } from "@/lib/supabase/server";
import { DEMO_CANDIDATES } from "@/lib/demo-parlays";
import ParlayBuilder, { type Candidate } from "@/components/ParlayBuilder";
import { legLabel } from "@/lib/api/legs";

export const revalidate = 300;

export const metadata = {
  title: "Arma tu parlay con IA · Pix",
  description:
    "Elige tus partidos y Pix te dice al instante si la combinación paga más de lo que vale. Gratis, sin registro.",
  alternates: { canonical: "/armar" },
};

type Fila = {
  id: string;
  event_id: string;
  market: "h2h" | "spreads" | "totals";
  selection: string;
  line: number | null;
  odds_taken: number;
  book: string;
  fair_prob: number;
  rationale: string | null;
  events: {
    home_team: string;
    away_team: string;
    sport_title: string;
    league_slug: string;
    commence_time: string;
  };
};

async function candidatosReales(): Promise<Candidate[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = supabasePublic();
    const { data } = await sb
      .from("picks")
      .select(
        "id, event_id, market, selection, line, odds_taken, book, fair_prob, rationale, events!inner(home_team, away_team, sport_title, league_slug, commence_time)"
      )
      .eq("result", "pending")
      .gte("events.commence_time", new Date().toISOString())
      .order("edge_pct", { ascending: false })
      .limit(24);

    return ((data ?? []) as unknown as Fila[]).map((p) => ({
      pickId: p.id,
      eventId: p.event_id,
      label: `${p.events.home_team} vs ${p.events.away_team}`,
      pick: legLabel(p.events as never, { market: p.market, selection: p.selection, line: p.line })
        .split("·")
        .slice(1)
        .join("·")
        .trim() || p.selection,
      market: p.market,
      selection: p.selection,
      line: p.line == null ? null : Number(p.line),
      odds: Number(p.odds_taken),
      fairProb: Number(p.fair_prob),
      book: p.book,
      league: p.events.league_slug,
      sport: p.events.sport_title,
      commenceTime: p.events.commence_time,
      rationale: p.rationale ?? "",
    }));
  } catch {
    // Una base mal configurada no debe tumbar la página más importante:
    // se cae a los datos de ejemplo y el producto sigue enseñándose.
    return [];
  }
}

export default async function ArmarPage() {
  const reales = await candidatosReales();
  const demo = reales.length < 2;
  const candidates = demo ? DEMO_CANDIDATES : reales;

  return (
    <div className="container-x py-10 md:py-14">
      <header className="mb-10 max-w-2xl">
        <div className="label mb-3">Constructor</div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Arma tu parlay.
          <br />
          <span className="text-accent">Te decimos si vale.</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Elige los partidos que te gusten. Pix calcula la cuota justa de la combinación
          y la compara con lo que te pagan. Si pagan menos de lo que vale, te lo dice.
        </p>
        <p className="mt-3 text-sm text-muted">
          Gratis y sin registro.{" "}
          <Link href="/precios" className="text-accent hover:underline">
            Los planes
          </Link>{" "}
          son para recibir los picks del modelo en el momento de publicarse.
        </p>
      </header>

      <ParlayBuilder candidates={candidates} demo={demo} />

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <Explica titulo="Cuota justa" texto="Quitamos el margen de cada casa por separado y promediamos. Eso da la probabilidad real, sin el recargo del operador." />
        <Explica titulo="Valor, no corazonadas" texto="Si la cuota combinada paga por encima de la justa, hay valor. Si no, la combinación pierde a largo plazo aunque acierte hoy." />
        <Explica titulo="Tamaño sensato" texto="La sugerencia sale de Kelly fraccionado, con tope. Nunca te vamos a decir que juegues todo a una." />
      </section>
    </div>
  );
}

function Explica({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="card p-5">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      <p className="text-sm leading-relaxed text-muted">{texto}</p>
    </div>
  );
}
