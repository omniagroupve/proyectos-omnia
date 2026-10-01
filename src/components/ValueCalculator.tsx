"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT } from "@/components/I18nProvider";

/**
 * CALCULADORA DE VALOR · directa, sin sermones.
 * Entra, mete cuota, ve el número, actúa. Todo el texto largo vive en las
 * guías, no aquí.
 */

function devigTwoWay(a: number, b: number): [number, number] {
  const qa = 1 / a, qb = 1 / b;
  const s = qa + qb;
  return [qa / s, qb / s];
}

export default function ValueCalculator() {
  const s = useT().calculator;
  const [odds, setOdds] = useState("2.10");
  const [prob, setProb] = useState("52");
  const [bankroll, setBankroll] = useState("5000");
  const [mode, setMode] = useState<"prob" | "sharp">("prob");
  const [sharpA, setSharpA] = useState("1.95");
  const [sharpB, setSharpB] = useState("1.95");

  const r = useMemo(() => {
    const o = parseFloat(odds);
    const bk = parseFloat(bankroll);
    if (!isFinite(o) || o <= 1) return null;

    let p: number;
    if (mode === "sharp") {
      const a = parseFloat(sharpA), b = parseFloat(sharpB);
      if (!isFinite(a) || !isFinite(b) || a <= 1 || b <= 1) return null;
      p = devigTwoWay(a, b)[0];
    } else {
      const pct = parseFloat(prob);
      if (!isFinite(pct) || pct <= 0 || pct >= 100) return null;
      p = pct / 100;
    }

    const ev = p * o - 1;
    const b = o - 1;
    const kFull = (b * p - (1 - p)) / b;
    const kelly = kFull > 1e-9 ? kFull * 0.25 : 0;

    return {
      p, ev,
      fairOdds: 1 / p,
      stake: isFinite(bk) ? bk * kelly : 0,
      kelly,
    };
  }, [odds, prob, bankroll, mode, sharpA, sharpB]);

  const good = r !== null && r.ev > 0.02;
  const bad = r !== null && r.ev <= 0;

  const field =
    "w-full rounded-xl border border-line bg-ink px-4 py-3.5 font-mono text-xl tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-line">
        {([["prob", s.tabProb], ["sharp", s.tabSharp]] as const).map(
          ([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 px-4 py-3.5 text-sm font-semibold transition ${
                mode === m ? "bg-accent/10 text-accent" : "text-muted hover:text-white"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      <div className="grid gap-8 p-6 md:grid-cols-[1fr_1.1fr] md:p-8">
        {/* Entradas */}
        <div className="space-y-4">
          <div>
            <label className="label mb-1.5 block">{s.odds}</label>
            <input className={field} value={odds} onChange={(e) => setOdds(e.target.value)} inputMode="decimal" />
          </div>

          {mode === "prob" ? (
            <div>
              <label className="label mb-1.5 block">{s.realProb}</label>
              <input className={field} value={prob} onChange={(e) => setProb(e.target.value)} inputMode="decimal" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">{s.sharpFor}</label>
                <input className={field} value={sharpA} onChange={(e) => setSharpA(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label className="label mb-1.5 block">{s.sharpAgainst}</label>
                <input className={field} value={sharpB} onChange={(e) => setSharpB(e.target.value)} inputMode="decimal" />
              </div>
            </div>
          )}

          <div>
            <label className="label mb-1.5 block">{s.bankroll}</label>
            <input className={field} value={bankroll} onChange={(e) => setBankroll(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        {/* Resultado */}
        <div className="flex flex-col justify-center">
          {!r ? (
            <p className="text-center text-sm text-muted">{s.invalidValues}</p>
          ) : (
            <>
              <div
                key={`${r.ev.toFixed(3)}`}
                className={`animate-scale-in rounded-2xl border p-6 text-center ${
                  good
                    ? "border-accent/60 bg-accent/10 shadow-[0_0_60px_-20px_rgba(0,214,128,.6)]"
                    : bad
                    ? "border-danger/40 bg-danger/5"
                    : "border-line bg-ink/50"
                }`}
              >
                <div className="label">{s.expectedValue}</div>
                <div
                  className={`mt-1 font-mono text-5xl font-bold tabular-nums ${
                    r.ev > 0 ? "text-accent" : "text-danger"
                  }`}
                >
                  {r.ev > 0 ? "+" : ""}
                  {(r.ev * 100).toFixed(2)}%
                </div>
                <div className="mt-2 text-sm font-medium">
                  {good ? (
                    <span className="text-accent">{s.goodValue}</span>
                  ) : bad ? (
                    <span className="text-danger">{s.noValue}</span>
                  ) : (
                    <span className="text-muted">{s.marginalValue}</span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-line bg-ink/50 p-4">
                  <div className="label">{s.fairOdds}</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                    {r.fairOdds.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-ink/50 p-4">
                  <div className="label">{s.stakeKelly}</div>
                  <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-accent">
                    {r.kelly > 0 ? `$${Math.round(r.stake).toLocaleString("es")}` : "—"}
                  </div>
                </div>
              </div>

              <Link
                href="/precios"
                className="btn-primary mt-5 w-full"
              >
                {good ? s.ctaGood : s.ctaBad}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
