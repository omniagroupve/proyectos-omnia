// Resuelve piernas mandadas por el cliente contra el último snapshot de
// cuotas de cada evento: rellena fairProb, etiqueta y book si faltan.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParlayLegInput, ParlayLeg as ApiLeg } from "@/lib/api-types";
import type { ParlayLeg } from "@/lib/parlay";
import { fairProbFor } from "@/lib/market-summary";
import { edgePct } from "@/lib/devig";
import type { Bookmaker } from "@/lib/odds";

interface EventRow { id: string; home_team: string; away_team: string; league_slug: string; commence_time: string }

export async function latestSnapshots(sb: SupabaseClient, eventIds: string[]) {
  const out = new Map<string, { bookmakers: Bookmaker[]; capturedAt: string }>();
  if (eventIds.length === 0) return out;
  const { data } = await sb
    .from("odds_snapshots")
    .select("event_id, payload, captured_at")
    .in("event_id", eventIds)
    .order("captured_at", { ascending: false })
    .limit(eventIds.length * 4);
  for (const row of data ?? []) {
    if (!out.has(row.event_id)) out.set(row.event_id, { bookmakers: row.payload as Bookmaker[], capturedAt: row.captured_at });
  }
  return out;
}

export function legLabel(ev: EventRow, leg: { market: string; selection: string; line?: number | null }): string {
  const lineTxt = leg.line != null ? ` ${leg.line > 0 && leg.market === "spreads" ? "+" : ""}${leg.line}` : "";
  const what =
    leg.market === "totals" ? `${leg.selection === "Over" ? "Más de" : "Menos de"}${lineTxt}` :
    leg.market === "spreads" ? `${leg.selection}${lineTxt}` :
    leg.selection === "Draw" ? "Empate" : `Gana ${leg.selection}`;
  return `${ev.home_team} vs ${ev.away_team} · ${what}`;
}

export async function resolveLegs(
  sb: SupabaseClient,
  input: ParlayLegInput[]
): Promise<{ legs: ParlayLeg[]; api: ApiLeg[]; errors: string[] }> {
  const ids = [...new Set(input.map((l) => l.eventId))];
  const [{ data: events }, snaps] = await Promise.all([
    sb.from("events").select("id, home_team, away_team, league_slug, commence_time").in("id", ids),
    latestSnapshots(sb, ids),
  ]);
  const byId = new Map((events ?? []).map((e) => [e.id, e as EventRow]));
  const errors: string[] = [];
  const legs: ParlayLeg[] = [];
  const api: ApiLeg[] = [];

  for (const l of input) {
    const ev = byId.get(l.eventId);
    if (!ev) { errors.push(`Evento ${l.eventId} no existe.`); continue; }
    let fairProb = l.fairProb ?? null;
    if (fairProb == null) {
      const snap = snaps.get(l.eventId);
      fairProb = snap ? fairProbFor(snap.bookmakers, l.market, l.selection, l.line) : null;
    }
    if (fairProb == null) { errors.push(`Sin cuota de consenso para ${l.selection} en ${ev.home_team} vs ${ev.away_team}.`); continue; }
    const label = legLabel(ev, l);
    legs.push({
      eventId: l.eventId, market: l.market, selection: l.selection, line: l.line ?? null,
      odds: l.odds, fairProb, book: l.book ?? "manual", label,
    });
    api.push({
      eventId: l.eventId, market: l.market, selection: l.selection, line: l.line ?? null,
      odds: l.odds, fairProb, book: l.book ?? "manual", label,
      edgePct: Math.round(edgePct(fairProb, l.odds) * 1000) / 1000, rationale: null,
    });
  }
  return { legs, api, errors };
}
