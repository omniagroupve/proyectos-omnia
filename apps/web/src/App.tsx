// ═══════════════════════════════════════════════════════════════════════════
// BANCO DE PRUEBAS DE LA CONEXIÓN · pantalla temporal
// ═══════════════════════════════════════════════════════════════════════════
//
// Esto NO es el diseño de Pix: es la prueba viva de que el frontend habla con
// el backend. Codex reemplaza este archivo por la UI real de pix-local y se
// queda con `src/lib/api.ts` y `src/lib/supabase.ts`, que es la plomería.
//
// Mientras exista, sirve para verificar de un vistazo que la API responde.

import { useEffect, useState } from "react";
import { api, PixApiError, type Parlay, type ParlayEvaluation } from "./lib/api";
import { isAuthConfigured } from "./lib/supabase";

export default function App() {
  const [parlays, setParlays] = useState<Parlay[] | null>(null);
  const [calc, setCalc] = useState<ParlayEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.demo()
      .then((r) => setParlays(r.parlays))
      .catch((e: PixApiError) => setError(e.message));

    api.evaluateParlay({
      legs: [
        { eventId: "demo-a", market: "h2h", selection: "Club América", odds: 2.10, fairProb: 0.5 },
        { eventId: "demo-b", market: "h2h", selection: "Boca Juniors", odds: 2.10, fairProb: 0.5 },
      ],
      bankroll: 1000,
    })
      .then(setCalc)
      .catch((e: PixApiError) => setError(e.message));
  }, []);

  return (
    <main style={S.page}>
      <header style={S.head}>
        <strong style={S.brand}>pix</strong>
        <span style={S.tag}>banco de pruebas · sustituir por pix-local</span>
      </header>

      {error && <p style={S.error}>Error: {error}</p>}

      <section style={S.card}>
        <h2 style={S.h2}>Conexión con el backend</h2>
        <Row label="GET /parlays/demo" value={parlays ? `${parlays.length} parlays` : "…"} ok={!!parlays} />
        <Row label="POST /parlays/evaluate" value={calc ? `cuota ${calc.combinedOdds} · EV ${calc.edgePct}%` : "…"} ok={!!calc} />
        <Row label="Auth (Supabase)" value={isAuthConfigured ? "configurada" : "sin claves — modo demo"} ok={isAuthConfigured} />
      </section>

      {calc && (
        <section style={S.card}>
          <h2 style={S.h2}>Calculadora · 2 piernas a 2.10</h2>
          <Row label="Probabilidad conjunta" value={`${(calc.jointProb * 100).toFixed(1)} %`} />
          <Row label="Cuota combinada" value={calc.combinedOdds.toFixed(2)} />
          <Row label="Cuota justa" value={calc.fairOdds.toFixed(2)} />
          <Row label="Valor esperado" value={`${calc.edgePct > 0 ? "+" : ""}${calc.edgePct.toFixed(2)} %`} />
          <Row label="Stake sugerido" value={`${calc.stakeUnits} u${calc.stakeAmount ? ` · $${calc.stakeAmount}` : ""}`} />
          {calc.warnings.map((w) => <p key={w} style={S.warn}>{w}</p>)}
        </section>
      )}

      {parlays?.map((p) => (
        <section key={p.id} style={S.card}>
          <h2 style={S.h2}>{p.title}</h2>
          <p style={S.muted}>{p.summary}</p>
          {p.legs.map((l, i) => (
            <div key={i} style={S.leg}>
              <span>{l.label}</span>
              <b style={S.mono}>{l.odds.toFixed(2)}</b>
            </div>
          ))}
          <Row label="Cuota combinada" value={p.combinedOdds.toFixed(2)} />
          <Row label="Valor esperado" value={`+${p.edgePct.toFixed(1)} %`} />
        </section>
      ))}

      <footer style={S.foot}>
        <strong>+18</strong> · Juega con responsabilidad. Nunca apuestes dinero que no puedas permitirte perder.
        Los datos de esta pantalla son ilustrativos.
      </footer>
    </main>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={S.row}>
      <span style={S.muted}>{label}</span>
      <span style={{ ...S.mono, color: ok === undefined ? "#e9e3f5" : ok ? "#5fd39a" : "#e6b45c" }}>{value}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: "0 auto", padding: 20, fontFamily: "system-ui, sans-serif", background: "#14111b", color: "#f1edf5", minHeight: "100vh" },
  head: { display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 },
  brand: { fontSize: 28, letterSpacing: "-0.03em" },
  tag: { fontSize: 12, color: "#948aa6" },
  card: { background: "#1c1826", border: "1px solid #332c44", borderRadius: 14, padding: 16, marginBottom: 12 },
  h2: { fontSize: 15, margin: "0 0 10px" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 13.5 },
  leg: { display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 13, borderBottom: "1px solid #2a2438" },
  muted: { color: "#948aa6", fontSize: 13 },
  mono: { fontFamily: "ui-monospace, monospace" },
  warn: { color: "#e6b45c", fontSize: 12.5, margin: "6px 0 0" },
  error: { color: "#f08080", fontSize: 13 },
  foot: { marginTop: 24, fontSize: 11.5, color: "#948aa6", lineHeight: 1.6 },
};
