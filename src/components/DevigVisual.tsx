"use client";

import { useEffect, useRef, useState } from "react";
import { devig, impliedProb, edgePct } from "@/lib/devig";
import { useT } from "@/components/I18nProvider";

/**
 * MOMENTO FIRMA · el devig, visto
 * ───────────────────────────────
 * Todo el producto se apoya en una idea que casi nadie entiende: las
 * probabilidades implícitas de un mercado suman MÁS del 100%, y ese exceso es
 * el margen de la casa. Explicarlo con texto cuesta tres párrafos. Enseñarlo
 * cuesta tres segundos.
 *
 * La barra apilada arranca desbordando la marca del 100%. El trozo que sobra
 * ES el margen. Al colapsar a 100% aparecen las probabilidades reales, y con
 * ellas la cuota justa — que comparada con la mejor cuota del mercado revela
 * el valor.
 *
 * Los números no están escritos a mano: salen de la misma función `devig()`
 * que usa el motor en producción. Si algún día cambia el método, este gráfico
 * cambia con él.
 */

// Mercado realista de LaLiga
const MARKET = [
  { label: "Local", odds: 2.10, best: 2.18 },
  { label: "Empate", odds: 3.45, best: 3.72 },
  { label: "Visitante", odds: 3.60, best: 3.75 },
];

const COLORS = ["bg-accent", "bg-gold", "bg-sky-400"];

export default function DevigVisual() {
  const s = useT().devig;
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0); // 0 esperando · 1 con vig · 2 sin vig · 3 valor

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setStage(3); return; }

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setStage(1);
      const a = setTimeout(() => setStage(2), 1600);
      const b = setTimeout(() => setStage(3), 3200);
      return () => { clearTimeout(a); clearTimeout(b); };
    }, { threshold: 0.45 });

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const implied = MARKET.map((m) => impliedProb(m.odds));
  const overround = implied.reduce((a, b) => a + b, 0);
  const vig = (overround - 1) * 100;
  const fair = devig(MARKET.map((m) => m.odds), "power");

  // La selección con más valor comparando la mejor cuota con la justa
  const edges = MARKET.map((m, i) => edgePct(fair[i], m.best));
  const bestIdx = edges.indexOf(Math.max(...edges));

  const showFair = stage >= 2;
  const widths = showFair ? fair : implied;
  // Con vig la barra desborda la marca del 100%: ese desbordamiento es el margen
  const scale = showFair ? 100 : 100 * overround;

  return (
    <div ref={ref} className="card overflow-hidden">
      <div className="border-b border-line px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="label">{s.marketLabel}</div>
            <div className="mt-0.5 font-mono text-sm text-muted">
              {MARKET.map((m) => m.odds.toFixed(2)).join("  ·  ")}
            </div>
          </div>
          <div
            className={`rounded-lg border px-3 py-1.5 font-mono text-sm font-bold transition-all duration-700 ${
              showFair
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-danger/50 bg-danger/10 text-danger"
            }`}
          >
            {(showFair ? 100 : 100 * overround).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8">
        {/* ── Barra apilada ── */}
        <div className="relative">
          {/* Marca del 100%: la referencia contra la que se lee el desbordamiento */}
          <div className="absolute -top-6 bottom-[-1.75rem] left-0 z-20 w-full">
            <div className="absolute right-0 top-0 h-full border-r-2 border-dashed border-white/25" />
            <span className="absolute -top-1 right-2 font-mono text-[10px] text-muted">
              100%
            </span>
          </div>

          <div className="relative h-16 w-full">
            <div
              className="absolute left-0 top-0 flex h-full overflow-hidden rounded-xl transition-all duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ width: `${stage === 0 ? 0 : scale}%` }}
            >
              {MARKET.map((m, i) => (
                <div
                  key={m.label}
                  className={`relative flex items-center justify-center transition-all duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] ${COLORS[i]} ${
                    stage >= 3 && i === bestIdx ? "ring-2 ring-inset ring-white/70" : ""
                  }`}
                  style={{ width: `${(widths[i] / (showFair ? 1 : overround)) * 100}%` }}
                >
                  <span className="px-1 font-mono text-xs font-bold text-ink/85">
                    {(widths[i] * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Etiqueta del margen sobrante */}
          <div
            className={`mt-3 text-center transition-all duration-500 ${
              stage === 1 ? "opacity-100" : "h-0 overflow-hidden opacity-0"
            }`}
          >
            <span className="rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger">
              {s.marginNotePrefix} {vig.toFixed(1)}% {s.marginNoteSuffix}
            </span>
          </div>
        </div>

        {/* ── Leyenda ── */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {MARKET.map((m, i) => {
            const fairOdds = 1 / fair[i];
            const isBest = stage >= 3 && i === bestIdx;
            return (
              <div
                key={m.label}
                className={`rounded-xl border p-4 transition-all duration-700 ${
                  isBest ? "border-accent/60 bg-accent/10" : "border-line bg-ink/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${COLORS[i]}`} />
                  <span className="text-sm font-semibold">{s.selections[m.label] ?? m.label}</span>
                </div>

                <dl className="mt-3 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted">{s.fairOdds}</dt>
                    <dd className={showFair ? "text-white" : "text-muted/40"}>
                      {showFair ? fairOdds.toFixed(2) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">{s.bestOdds}</dt>
                    <dd className="text-white">{m.best.toFixed(2)}</dd>
                  </div>
                </dl>

                <div
                  className={`mt-3 rounded-lg py-1.5 text-center font-mono text-sm font-bold transition-all duration-500 ${
                    stage < 3
                      ? "bg-line/40 text-muted/40"
                      : edges[i] >= 2
                      ? "bg-accent/20 text-accent"
                      : "bg-line/40 text-muted"
                  }`}
                >
                  {stage < 3
                    ? "···"
                    : `${edges[i] > 0 ? "+" : ""}${edges[i].toFixed(1)}%`}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Conclusión ── */}
        <div
          className={`mt-6 transition-all duration-700 ${
            stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <p className="text-center text-sm leading-relaxed text-muted">
            {s.concl1} <strong className="text-white">{s.selections[MARKET[bestIdx].label] ?? MARKET[bestIdx].label}</strong>{" "}
            {s.concl2} {(1 / fair[bestIdx]).toFixed(2)} {s.concl3}{" "}
            <strong className="text-accent">{MARKET[bestIdx].best.toFixed(2)}</strong>.
            {" "}{s.concl4} <strong className="text-accent">+{edges[bestIdx].toFixed(1)}%</strong> {s.concl5}
          </p>
        </div>
      </div>
    </div>
  );
}
