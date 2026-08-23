"use client";

import { useState } from "react";
import { TIERS, TIER_ORDER } from "@/lib/config";

/**
 * PRICING SÁNDWICH
 * ────────────────
 * El orden visual y el peso importan tanto como los números:
 *
 *  Free ($0)   → columna estrecha, apagada. Su trabajo es capturar el email
 *                del tráfico SEO, no vender.
 *  Pro ($197)  → centro, elevada, con borde de acento y badge. Aquí converge
 *                el ojo. Es el plan que quieres vender.
 *  Elite ($497)→ el ancla. A 2.5x el precio de Pro, hace que $197 se lea como
 *                "la opción razonable" en vez de "197 dólares al mes".
 *
 * Sin Elite, Pro es el plan caro. Con Elite, Pro es el plan sensato.
 * Ese es todo el truco, y es la razón de que Elite exista aunque venda poco.
 */
export default function PricingTable({ currentTier }: { currentTier?: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(tier: "pro" | "elite") {
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else setError(json.error ?? "No se pudo iniciar el pago");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {TIER_ORDER.map((id) => {
          const t = TIERS[id] as typeof TIERS.pro & {
            limits?: string[];
            badge?: string;
            seatCap?: number;
          };
          const isPro = id === "pro";
          const isCurrent = currentTier === id;

          return (
            <div
              key={id}
              className={[
                "card relative flex flex-col p-7",
                isPro
                  ? "border-accent/60 shadow-[0_0_60px_-15px_rgba(0,214,128,0.4)] lg:-mt-4 lg:mb-4"
                  : "opacity-95",
              ].join(" ")}
            >
              {isPro && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                  {t.badge}
                </span>
              )}

              <div className="label">{t.name}</div>

              <div className="mt-3 flex items-baseline gap-1">
                <span className={`font-mono font-bold tabular-nums ${isPro ? "text-5xl text-accent" : "text-4xl"}`}>
                  {t.priceLabel}
                </span>
                <span className="text-sm text-muted">{t.cadence}</span>
              </div>

              <p className="mt-3 min-h-[42px] text-sm leading-relaxed text-muted">
                {t.tagline}
              </p>

              {id === "elite" && t.seatCap && (
                <div className="mt-1 text-xs font-semibold text-gold">
                  {t.seatCap} plazas máximo · los picks mueven la línea
                </div>
              )}

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className={isPro ? "text-accent" : "text-muted"}>✓</span>
                    <span className="text-white/90">{f}</span>
                  </li>
                ))}
                {t.limits?.map((f) => (
                  <li key={f} className="flex gap-2.5 text-muted">
                    <span>—</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || loading !== null}
                onClick={() => id !== "free" && subscribe(id as "pro" | "elite")}
                className={[
                  "mt-7 w-full",
                  isPro ? "btn-primary" : "btn-ghost",
                  isCurrent ? "cursor-default opacity-50" : "",
                ].join(" ")}
              >
                {isCurrent ? "Tu plan actual" : loading === id ? "Cargando…" : t.cta}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}

      <p className="mt-8 text-center text-xs leading-relaxed text-muted">
        Cancela cuando quieras desde tu panel. Sin permanencia.
        <br />
        Pagos gestionados por Lemon Squeezy · impuestos incluidos según tu país.
      </p>
    </div>
  );
}
