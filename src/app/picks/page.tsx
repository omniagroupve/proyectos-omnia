import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import PickCard, { type PickView } from "@/components/PickCard";
import TelegramConnect from "@/components/TelegramConnect";
import { canAccess, TIERS, type TierId, FREE_DELAY_HOURS } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "Picks del día", robots: { index: false } };

export default async function PicksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/picks");

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
