"use client";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCTOR DE PARLAYS · el corazón del producto
// ═══════════════════════════════════════════════════════════════════════════
//
// El usuario toca selecciones y ve, al instante, si la combinación tiene valor.
// La matemática NO se hace aquí: cada cambio se manda a
// `/api/v1/parlays/evaluate`, que es el mismo motor que usa el cron. Si algún
// día el frontend y el backend discreparan, discreparían en todas partes a la
// vez, que es mucho más fácil de detectar que un cálculo duplicado que se
// desincroniza en silencio.
//
// Funciona sin base de datos y sin claves: las piernas llegan con su `fairProb`
// y `evaluate` las acepta tal cual. Por eso esta pantalla se puede enseñar el
// primer día.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DemoCandidate } from "@/lib/demo-parlays";
import type { ParlayEvaluation } from "@/lib/api-types";

/** Una pierna puede venir del motor (con pickId) o de la piscina de ejemplo. */
export type Candidate = DemoCandidate & { pickId?: string };

const MAX_LEGS = 6;

/** Clave estable de una selección. */
const keyOf = (c: Candidate) => `${c.eventId}|${c.market}|${c.selection}|${c.line ?? ""}`;

const fmt = (n: number, d = 2) => n.toFixed(d);
const pct = (n: number, d = 1) => `${n > 0 ? "+" : ""}${n.toFixed(d)} %`;

function horaLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ParlayBuilder({
  candidates,
  demo,
}: {
  candidates: Candidate[];
  demo: boolean;
}) {
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [bankroll, setBankroll] = useState<number | "">("");
  const [ev, setEv] = useState<ParlayEvaluation | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const porClave = useMemo(() => {
    const m = new Map<string, Candidate>();
    for (const c of candidates) m.set(keyOf(c), c);
    return m;
  }, [candidates]);

  const piernas = useMemo(
    () => elegidas.map((k) => porClave.get(k)).filter((c): c is Candidate => Boolean(c)),
    [elegidas, porClave]
  );

  // Un parlay no repite evento: la probabilidad conjunta es el producto de las
  // de cada pierna, y eso sólo vale si son independientes. Se bloquea en la
  // interfaz y se explica, en vez de dejar elegir y fallar después.
  const eventosTomados = useMemo(() => new Set(piernas.map((p) => p.eventId)), [piernas]);

  const alternar = useCallback((c: Candidate) => {
    const k = keyOf(c);
    setElegidas((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k);
      if (prev.length >= MAX_LEGS) return prev;
      return [...prev, k];
    });
  }, []);

  /** Una combinación ya armada: mayor edge, un evento cada una. */
  const sugerir = useCallback(() => {
    const vistos = new Set<string>();
    const elegidasNuevas: string[] = [];
    const ordenadas = [...candidates].sort(
      (a, b) => b.fairProb * b.odds - a.fairProb * a.odds
    );
    for (const c of ordenadas) {
      if (vistos.has(c.eventId)) continue;
      vistos.add(c.eventId);
      elegidasNuevas.push(keyOf(c));
      if (elegidasNuevas.length === 3) break;
    }
    setElegidas(elegidasNuevas);
  }, [candidates]);

  // ── Matemática: siempre del backend ──────────────────────────────────────
  const peticion = useRef(0);
  useEffect(() => {
    if (piernas.length < 2) {
      setEv(null);
      setFallo(null);
      return;
    }
    const mio = ++peticion.current;
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/parlays/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legs: piernas.map((p) => ({
              eventId: p.eventId, market: p.market, selection: p.selection,
              line: p.line, odds: p.odds, fairProb: p.fairProb, book: p.book,
            })),
            bankroll: typeof bankroll === "number" && bankroll > 0 ? bankroll : undefined,
          }),
        });
        const body = await res.json();
        if (mio !== peticion.current) return;          // llegó una respuesta vieja
        if (!res.ok) {
          setFallo(body?.error ?? "No se pudo evaluar la combinación.");
          setEv(null);
        } else {
          setEv(body.data ?? body);
          setFallo(null);
        }
      } catch {
        if (mio === peticion.current) setFallo("Sin conexión con el motor.");
      } finally {
        if (mio === peticion.current) setCargando(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [piernas, bankroll]);

  const porEvento = useMemo(() => {
    const g = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const l = g.get(c.eventId) ?? [];
      l.push(c);
      g.set(c.eventId, l);
    }
    return [...g.values()];
  }, [candidates]);

  const compartir = async () => {
    const texto = piernas.map((p) => `${p.label} · ${p.pick} @ ${fmt(p.odds)}`).join("\n");
    const resumen = ev ? `\n\nCuota combinada ${fmt(ev.combinedOdds)} · valor ${pct(ev.edgePct)}` : "";
    try {
      await navigator.clipboard.writeText(`Mi parlay en Pix:\n${texto}${resumen}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el navegador puede negar el portapapeles: no es crítico */
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* ── Selecciones ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-2">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label">Partidos de hoy</div>
            <p className="mt-1 text-sm text-muted">
              Toca lo que quieras jugar. Una selección por partido.
            </p>
          </div>
          <button onClick={sugerir} className="btn-ghost !px-4 !py-2 text-xs">
            Ármalo por mí
          </button>
        </div>

        <div className="space-y-4">
          {porEvento.map((grupo) => {
            const ev0 = grupo[0];
            const bloqueado = eventosTomados.has(ev0.eventId);
            return (
              <div key={ev0.eventId} className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{ev0.label}</div>
                    <div className="mt-0.5 text-xs text-muted">
                      {ev0.league} · {horaLocal(ev0.commenceTime)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-panel px-2 py-1 text-[10px] uppercase tracking-wider text-muted">
                    {ev0.sport}
                  </span>
                </div>

                <div className="divide-y divide-line/50">
                  {grupo.map((c) => {
                    const k = keyOf(c);
                    const activa = elegidas.includes(k);
                    // Otra pierna del mismo partido ya está dentro.
                    const vetada = !activa && bloqueado;
                    const edge = (c.fairProb * c.odds - 1) * 100;
                    return (
                      <button
                        key={k}
                        onClick={() => alternar(c)}
                        disabled={vetada}
                        aria-pressed={activa}
                        className={[
                          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                          activa ? "bg-accent/10" : "hover:bg-panel/60",
                          vetada ? "cursor-not-allowed opacity-40" : "",
                        ].join(" ")}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px]",
                                activa ? "border-accent bg-accent text-ink" : "border-line",
                              ].join(" ")}
                              aria-hidden
                            >
                              {activa ? "✓" : ""}
                            </span>
                            <span className="truncate text-sm">{c.pick}</span>
                          </div>
                          <div className="mt-1 pl-6 text-xs text-muted">
                            {vetada ? "Ya tienes una selección de este partido" : c.book}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-sm font-semibold tabular-nums">
                            {fmt(c.odds)}
                          </div>
                          {edge > 0 && (
                            <div className="text-[11px] font-semibold text-accent">
                              {pct(edge)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {demo && (
          <p className="mt-5 rounded-xl border border-line/70 bg-panel/40 px-4 py-3 text-xs leading-relaxed text-muted">
            <strong className="text-white">Datos de ejemplo.</strong> Cuotas realistas para
            que veas cómo funciona. Cuando el motor esté conectado a cuotas en vivo, aquí
            salen los partidos de verdad con la mejor cuota de cada casa.
          </p>
        )}
      </div>

      {/* ── El boleto ────────────────────────────────────────────────────── */}
      <div className="hidden lg:sticky lg:top-24 lg:col-span-1 lg:block lg:self-start">
        <Boleto
          piernas={piernas}
          ev={ev}
          cargando={cargando}
          fallo={fallo}
          bankroll={bankroll}
          setBankroll={setBankroll}
          quitar={(k) => setElegidas((p) => p.filter((x) => x !== k))}
          limpiar={() => setElegidas([])}
          compartir={compartir}
          copiado={copiado}
        />
      </div>

      {/* ── Móvil: el boleto vive en una hoja que sube desde abajo ────────── */}
      <div className="lg:hidden">
        {piernas.length > 0 && (
          <>
            {/* Hueco para que la barra fija no tape el último contenido. */}
            <div className="h-24" aria-hidden />
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur">
              {abierto && (
                <div className="max-h-[70vh] overflow-y-auto px-4 pt-4">
                  <Boleto
                    piernas={piernas}
                    ev={ev}
                    cargando={cargando}
                    fallo={fallo}
                    bankroll={bankroll}
                    setBankroll={setBankroll}
                    quitar={(k) => setElegidas((p) => p.filter((x) => x !== k))}
                    limpiar={() => setElegidas([])}
                    compartir={compartir}
                    copiado={copiado}
                  />
                </div>
              )}
              <button
                onClick={() => setAbierto((a) => !a)}
                aria-expanded={abierto}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <div>
                  <div className="text-xs text-muted">
                    {piernas.length} {piernas.length === 1 ? "selección" : "selecciones"}
                  </div>
                  <div className="font-mono text-xl font-bold tabular-nums">
                    {ev ? fmt(ev.combinedOdds) : "—"}
                  </div>
                </div>
                <div className="text-right">
                  {ev && (
                    <div
                      className={[
                        "text-sm font-semibold",
                        ev.edgePct > 0 ? "text-accent" : "text-danger",
                      ].join(" ")}
                    >
                      {pct(ev.edgePct)}
                    </div>
                  )}
                  <div className="text-xs text-muted">
                    {abierto ? "Ocultar" : "Ver boleto"}
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function Boleto({
  piernas, ev, cargando, fallo, bankroll, setBankroll, quitar, limpiar, compartir, copiado,
}: {
  piernas: Candidate[];
  ev: ParlayEvaluation | null;
  cargando: boolean;
  fallo: string | null;
  bankroll: number | "";
  setBankroll: (v: number | "") => void;
  quitar: (k: string) => void;
  limpiar: () => void;
  compartir: () => void;
  copiado: boolean;
}) {
  const vacio = piernas.length === 0;
  const insuficiente = piernas.length === 1;
  const conValor = ev != null && ev.edgePct > 0;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="label">Tu boleto</div>
        {!vacio && (
          <button onClick={limpiar} className="text-xs text-muted hover:text-white">
            Vaciar
          </button>
        )}
      </div>

      {vacio ? (
        <p className="py-8 text-center text-sm text-muted">
          Elige al menos dos selecciones y aquí verás si la combinación tiene valor.
        </p>
      ) : (
        <>
          <ul className="mb-4 space-y-2">
            {piernas.map((p) => (
              <li key={keyOf(p)} className="flex items-start gap-2 text-sm">
                <button
                  onClick={() => quitar(keyOf(p))}
                  aria-label={`Quitar ${p.pick}`}
                  className="mt-0.5 shrink-0 text-muted transition hover:text-danger"
                >
                  ×
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{p.pick}</div>
                  <div className="truncate text-xs text-muted">{p.label}</div>
                </div>
                <div className="shrink-0 font-mono text-sm tabular-nums">{fmt(p.odds)}</div>
              </li>
            ))}
          </ul>

          {insuficiente && (
            <p className="rounded-lg border border-line/70 bg-panel/40 px-3 py-2 text-xs text-muted">
              Un parlay necesita dos piernas o más.
            </p>
          )}

          {ev && (
            <div className="space-y-3 border-t border-line/70 pt-4">
              <Fila etiqueta="Cuota combinada" valor={fmt(ev.combinedOdds)} grande />
              <Fila etiqueta="Cuota justa" valor={fmt(ev.fairOdds)} />
              <Fila
                etiqueta="Probabilidad"
                valor={`${(ev.jointProb * 100).toFixed(1)} %`}
              />
              <Fila
                etiqueta="Valor sobre la justa"
                valor={pct(ev.edgePct)}
                tono={ev.edgePct > 0 ? "bueno" : "malo"}
              />

              <div className="border-t border-line/70 pt-3">
                <label className="label mb-2 block" htmlFor="bankroll">
                  Cuánto tienes para jugar (opcional)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-muted">$</span>
                  <input
                    id="bankroll"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={bankroll}
                    onChange={(e) =>
                      setBankroll(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="500"
                    className="w-full rounded-lg border border-line bg-ink px-3 py-2 font-mono text-sm tabular-nums outline-none focus:border-accent/60"
                  />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Sugerencia de tamaño: <strong className="text-white">{fmt(ev.stakeUnits, 2)} unidades</strong>
                  {ev.stakeAmount != null && (
                    <> · aprox. <strong className="text-white">${fmt(ev.stakeAmount)}</strong></>
                  )}
                </p>
              </div>

              {ev.warnings.length > 0 && (
                <ul className="space-y-1 border-t border-line/70 pt-3">
                  {ev.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gold">
                      <span aria-hidden>!</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}

              {ev.errors.length > 0 && (
                <ul className="space-y-1 border-t border-line/70 pt-3">
                  {ev.errors.map((e, i) => (
                    <li key={i} className="flex gap-2 text-xs text-danger">
                      <span aria-hidden>×</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* El veredicto, en una frase. Es lo que la gente viene a buscar. */}
              <div
                className={[
                  "rounded-xl border px-4 py-3 text-sm",
                  conValor
                    ? "border-accent/40 bg-accent/10 text-white"
                    : "border-danger/40 bg-danger/10 text-white",
                ].join(" ")}
              >
                {conValor ? (
                  <>
                    <strong>Esta combinación paga por encima de lo que vale.</strong> El
                    mercado la valora en {fmt(ev.fairOdds)} y la puedes jugar a{" "}
                    {fmt(ev.combinedOdds)}.
                  </>
                ) : (
                  <>
                    <strong>Esta combinación paga menos de lo que vale.</strong> Cambia
                    alguna pierna: así, a largo plazo, pierdes.
                  </>
                )}
              </div>

              <button onClick={compartir} className="btn-ghost w-full !py-2 text-xs">
                {copiado ? "Copiado" : "Copiar el boleto"}
              </button>
            </div>
          )}

          {cargando && !ev && (
            <p className="border-t border-line/70 pt-4 text-xs text-muted">Calculando…</p>
          )}
          {fallo && (
            <p className="border-t border-line/70 pt-4 text-xs text-danger">{fallo}</p>
          )}
        </>
      )}

      <p className="mt-5 border-t border-line/70 pt-4 text-[11px] leading-relaxed text-muted/80">
        Pix analiza cuotas y te dice dónde hay valor. No acepta apuestas ni custodia
        dinero: el boleto lo juegas tú en la casa que elijas. +18. Juega con cabeza.
      </p>
    </div>
  );
}

function Fila({
  etiqueta, valor, grande, tono,
}: {
  etiqueta: string;
  valor: string;
  grande?: boolean;
  tono?: "bueno" | "malo";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted">{etiqueta}</span>
      <span
        className={[
          "font-mono font-semibold tabular-nums",
          grande ? "text-2xl" : "text-sm",
          tono === "bueno" ? "text-accent" : tono === "malo" ? "text-danger" : "",
        ].join(" ")}
      >
        {valor}
      </span>
    </div>
  );
}
