import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { demoPicks } from "@/lib/demo-parlays";
import PickCard, { type PickView } from "@/components/PickCard";
import TelegramConnect from "@/components/TelegramConnect";
import { canAccess, TIERS, type TierId, FREE_DELAY_HOURS } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Picks de hoy de la IA",
  description:
    "Las predicciones que el modelo publica hoy, con su cuota, su casa y su razón. Las que fallan se publican igual.",
};

export default async function PicksPage() {
  const user = await getSessionUser();

  // SIN SESIÓN NO SE REDIRIGE AL LOGIN. Quien llega de un anuncio o de
  // Telegram tiene que ver el producto antes de dar un correo: un muro de
  // registro en la pantalla que anuncia el menú mata la conversión. Se
  // enseñan los picks del plan gratuito y se invita a entrar para el resto.
  if (!user) return <PicksPublicos />;

  const sb = await supabaseServer();

  // RLS ya filtra lo que este usuario NO puede ver.
  // Aquí solo decidimos qué se muestra bloqueado como gancho de upsell.
  const { data } = await sb
    .from("picks")
    .select(`
      id, market, selection, line, odds_taken, book, edge_pct, stake_units,
      confidence, rationale, tier_required, published_at, result, clv_pct, profit_units,
      events!inner ( home_team, away_team, sport_title, league_slug, slug, commence_time )
    `)
    .gte("published_at", new Date(Date.now() - 36 * 3600_000).toISOString())
    .order("confidence", { ascending: false })
    .order("edge_pct", { ascending: false })
    .limit(60);

  const picks = (data ?? []) as unknown as PickView[];

  const { data: prof } = await sb
    .from("profiles").select("telegram_chat_id").eq("id", user.id).maybeSingle();
  const tgConnected = Boolean(prof?.telegram_chat_id);
  const pending = picks.filter((p) => p.result === "pending");
  const tier = TIERS[user.tier as TierId];

  return (
    <div className="container-x py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Picks activos</h1>
          <p className="mt-2 text-sm text-muted">
            Plan <strong className="uppercase text-accent">{tier.name}</strong>
            {user.tierExpiresAt && (
              <> · renueva el {new Date(user.tierExpiresAt).toLocaleDateString("es")}</>
            )}
            {" · "}bankroll ${user.bankroll.toLocaleString("es")} ({user.unitSizePct}% por unidad)
          </p>
        </div>
        {user.tier !== "elite" && (
          <Link href="/precios" className="btn-primary">
            {user.tier === "free" ? "Desbloquear todos los picks" : "Subir a Elite"}
          </Link>
        )}
      </div>

      <div className="mb-8">
        <TelegramConnect connected={tgConnected} />
      </div>

      {/* Banda de upsell para el plan free: el retraso es el argumento. */}
      {user.tier === "free" && (
        <div className="card mb-8 border-accent/40 bg-accent/5 p-5">
          <h2 className="font-semibold">Estás viendo los picks con {FREE_DELAY_HOURS}h de retraso</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Para cuando los ves, el mercado ya ha corregido la cuota y la ventaja
            se ha ido. Es intencional: así compruebas que el modelo acierta antes
            de pagar nada. Con Pro los recibes en el momento de publicarse, que es
            cuando la cuota todavía tiene valor.
          </p>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-muted">
            No hay picks activos ahora mismo. El modelo solo publica cuando
            encuentra ventaja real — un día sin picks es mejor que un día con
            picks malos.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((p) => (
            <PickCard
              key={p.id}
              pick={p}
              locked={!canAccess(user.tier, p.tier_required as TierId)}
              bankroll={user.bankroll}
              unitPct={user.unitSizePct}
            />
          ))}
        </div>
      )}

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-bold">Liquidados recientemente</h2>
        <div className="grid gap-4">
          {picks
            .filter((p) => p.result !== "pending")
            .slice(0, 10)
            .map((p) => (
              <PickCard key={p.id} pick={p} bankroll={user.bankroll} unitPct={user.unitSizePct} />
            ))}
        </div>
      </section>
    </div>
  );
}


/**
 * Vista para visitantes. Usa los picks reales del plan gratuito si hay base de
 * datos; si no, la piscina de ejemplo, marcada como tal.
 */
async function PicksPublicos() {
  let picks = demoPicks() as unknown as PickView[];
  let demo = true;

  if (isSupabaseConfigured()) {
    try {
      const sb = await supabaseServer();
      const { data } = await sb
        .from("picks")
        .select(`
          id, market, selection, line, odds_taken, book, edge_pct, stake_units,
          confidence, rationale, tier_required, published_at, result, clv_pct, profit_units,
          events!inner ( home_team, away_team, sport_title, league_slug, slug, commence_time )
        `)
        .eq("result", "pending")
        .lte("free_visible_at", new Date().toISOString())
        .order("confidence", { ascending: false })
        .limit(12);
      if (data?.length) { picks = data as unknown as PickView[]; demo = false; }
    } catch {
      // Una base a medio configurar no debe tumbar una página pública.
    }
  }

  return (
    <div className="container-x py-12">
      <header className="mb-10 max-w-2xl">
        <div className="label mb-3">Picks de hoy</div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Lo que la IA publica hoy
        </h1>
        <p className="mt-4 leading-relaxed text-muted">
          Cada pick sale con su cuota, la casa que la paga y la razón por la que
          el modelo la considera barata. Queda registrado con la hora: cuando
          falla, se publica igual.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/armar" className="btn-primary">Armar mi parlay</Link>
          <Link href="/rendimiento" className="btn-ghost">Ver el historial</Link>
        </div>
      </header>

      {demo && (
        <p className="card mb-8 p-4 text-xs leading-relaxed text-muted">
          <strong className="text-white">Datos de ejemplo.</strong> Cuotas
          realistas para que veas el formato. Con el motor conectado a cuotas en
          vivo, aquí salen los picks del día.
        </p>
      )}

      <div className="grid gap-4">
        {picks.map((p) => (
          <PickCard key={p.id} pick={p} bankroll={500} unitPct={1} />
        ))}
      </div>

      <div className="card mt-10 border-accent/40 bg-accent/5 p-6">
        <h2 className="font-semibold">Los ves con {FREE_DELAY_HOURS}h de retraso</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Para cuando llegan aquí, el mercado ya corrigió la cuota. Es a
          propósito: así compruebas que el modelo acierta antes de pagar nada.
          Con Pro los recibes en el momento de publicarse, que es cuando la
          cuota todavía tiene valor.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/precios" className="btn-primary">Ver los planes</Link>
          <Link href="/login" className="btn-ghost">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
