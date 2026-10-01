import Link from "next/link";
import { TIERS } from "@/lib/config";

/**
 * UPSELL HONESTO
 * ──────────────
 * Reglas que sigue este componente, y por qué:
 *
 *  1. **Comprueba el bankroll antes de vender.** Si el plan cuesta más del 5%
 *     del bankroll del usuario, le decimos que NO lo compre. Pierdes una venta
 *     y ganas un cliente que dura. El que compra por encima de sus medios
 *     cancela en 6 semanas y hace chargeback.
 *  2. **Sin urgencia falsa.** Ni cuentas atrás, ni "quedan 3 plazas" inventado.
 *     El cap de Elite es real y está en config.
 *  3. **Argumenta con datos, no con emoción.** Enseña el valor que el usuario
 *     ya ha visto funcionar, no lo que se está perdiendo.
 */

export function UpgradePrompt({
  variant,
  bankroll,
  context,
}: {
  variant: "pro" | "elite";
  bankroll?: number;
  context?: string;
}) {
  const tier = TIERS[variant];

  // Regla del 5%: si la cuota supera ese umbral, no vendemos.
  const affordable = bankroll === undefined || tier.price <= bankroll * 0.05;

  if (!affordable) {
    return (
      <div className="card border-gold/40 bg-gold/5 p-5">
        <h3 className="font-semibold text-gold">
          Con tu bankroll actual, {tier.name} no te compensa
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Has configurado un bankroll de ${bankroll?.toLocaleString("es")}. La
          cuota de {tier.name} (${tier.price}/mes) sería el{" "}
          {((tier.price / bankroll!) * 100).toFixed(0)}% de tu capital al mes:
          el coste se comería cualquier ventaja que el modelo pueda darte.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Quédate en el plan gratuito hasta que tu bankroll supere los{" "}
          <strong className="text-white">
            ${(tier.price * 20).toLocaleString("es")}
          </strong>
          . Preferimos decírtelo ahora que cobrarte tres meses.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-6">
      {context && <div className="label mb-2">{context}</div>}
      <h3 className="text-lg font-bold">
        {variant === "pro"
          ? "Los mismos picks, sin las 3 horas de retraso"
          : "Props, live y los picks de mayor convicción"}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {variant === "pro"
          ? "Cuando los ves con retraso, el mercado ya corrigió la cuota. Con Pro los recibes en el momento en que aparece el valor, que es cuando todavía se puede tomar."
          : "Los picks de mayor ventaja viven en mercados con límites bajos. Por eso Elite tiene plazas limitadas: si demasiada gente apuesta lo mismo, la cuota se corrige y el valor desaparece para todos."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href="/precios" className="btn-primary">
          Ver {tier.name} · ${tier.price}/mes
        </Link>
        <span className="text-xs text-muted">
          Cancela en un clic · sin permanencia
        </span>
      </div>
    </div>
  );
}

/**
 * MONETIZACIÓN DEL PLAN FREE · comparador de cuotas con afiliación
 * ───────────────────────────────────────────────────────────────
 * El comparador es contenido útil de verdad: enseña dónde está la mejor cuota
 * aunque el usuario no pague nada. Los enlaces son de afiliación y van
 * declarados.
 *
 * CUMPLIMIENTO: sólo se muestran operadores con licencia en el país del
 * visitante. Si no hay ninguno para ese país, la tabla se enseña sin enlaces
 * — sigue siendo información legal y útil.
 */
export interface BookOffer {
  book: string;
  odds: number;
  affiliateUrl?: string;
  licensedIn: string[];
}

export function OddsComparison({
  offers,
  country,
  selection,
}: {
  offers: BookOffer[];
  country?: string;
  selection: string;
}) {
  const sorted = [...offers].sort((a, b) => b.odds - a.odds);
  const best = sorted[0]?.odds;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <div className="label">Mejor cuota disponible · {selection}</div>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {sorted.map((o) => {
            const licensed = !country || o.licensedIn.includes(country);
            const canLink = licensed && o.affiliateUrl;
            return (
              <tr key={o.book} className="border-b border-line/50 last:border-0">
                <td className="px-5 py-3.5 font-medium">{o.book}</td>
                <td
                  className={`px-5 py-3.5 text-right font-mono tabular-nums ${
                    o.odds === best ? "font-bold text-accent" : ""
                  }`}
                >
                  {o.odds.toFixed(2)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {canLink ? (
                    <a
                      href={o.affiliateUrl}
                      rel="sponsored nofollow noopener"
                      target="_blank"
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Ir a la casa →
                    </a>
                  ) : (
                    <span className="text-xs text-muted">
                      {licensed ? "—" : "No disponible en tu país"}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-line bg-ink/40 px-5 py-3 text-xs leading-relaxed text-muted">
        Algunos enlaces son de afiliación. No alteran el análisis: el modelo
        selecciona siempre la mejor cuota disponible, tengamos acuerdo con esa
        casa o no. +18 · Juega con responsabilidad.
      </div>
    </div>
  );
}
