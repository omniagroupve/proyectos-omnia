// ═══════════════════════════════════════════════════════════════════════════
// BROADCAST · envía los picks a Telegram
// ═══════════════════════════════════════════════════════════════════════════
// Lo llama el cron de ingesta al terminar de publicar picks.
//
// Dos destinos:
//   · Suscriptores individuales con el tier suficiente → mensaje directo
//   · Canal público → sólo el pick free, y con 3h de retraso
//
// LÍMITE DE TELEGRAM: ~30 mensajes/segundo. Enviamos por lotes con pausa;
// pasarse implica un 429 y bloqueo temporal del bot.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendMessage, formatPick, type PickMessage } from "@/lib/telegram";
import { canAccess, type TierId } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 25;
const PAUSE_MS = 1100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { pickIds } = (await req.json().catch(() => ({}))) as { pickIds?: string[] };

  // Picks a enviar: los indicados, o los de la última hora sin notificar
  let q = sb
    .from("picks")
    .select(`
      id, market, selection, line, odds_taken, book, edge_pct, stake_units,
      confidence, rationale, tier_required, notified_at,
      events!inner ( home_team, away_team, sport_title, commence_time )
    `)
    .is("notified_at", null)
    .eq("result", "pending");

  if (pickIds?.length) q = q.in("id", pickIds);
  else q = q.gte("published_at", new Date(Date.now() - 3600_000).toISOString());

  const { data: picks } = await q.limit(50);
  if (!picks?.length) return NextResponse.json({ ok: true, sent: 0, note: "nada que enviar" });

  // Suscriptores con Telegram vinculado y suscripción vigente
  const { data: subs } = await sb
    .from("profiles")
    .select("telegram_chat_id, tier, tier_expires_at")
    .not("telegram_chat_id", "is", null);

  const active = (subs ?? []).filter(
    (s) => !s.tier_expires_at || new Date(s.tier_expires_at) > new Date()
  );

  const report = { picks: picks.length, sent: 0, failed: 0, channel: 0 };

  for (const p of picks) {
    const ev = (p as unknown as {
      events: { home_team: string; away_team: string; sport_title: string; commence_time: string };
    }).events;

    const msg: PickMessage = {
      sport: ev.sport_title,
      home: ev.home_team,
      away: ev.away_team,
      commenceTime: ev.commence_time,
      market: p.market,
      selection: p.selection,
      line: p.line,
      odds: Number(p.odds_taken),
      book: p.book,
      edge: Number(p.edge_pct),
      stake: Number(p.stake_units),
      confidence: p.confidence,
      rationale: p.rationale,
    };

    const body = formatPick(msg, false);
    const recipients = active.filter((s) =>
      canAccess(s.tier as TierId, p.tier_required as TierId)
    );

    for (let i = 0; i < recipients.length; i += BATCH) {
      const slice = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        slice.map((s) => sendMessage(s.telegram_chat_id!, body))
      );
      report.sent += results.filter((r) => r.status === "fulfilled").length;
      report.failed += results.filter((r) => r.status === "rejected").length;
      if (i + BATCH < recipients.length) await sleep(PAUSE_MS);
    }

    await sb.from("picks").update({ notified_at: new Date().toISOString() }).eq("id", p.id);
  }

  return NextResponse.json({ ok: true, ...report });
}

/**
 * GET · publica en el canal público los picks cuya ventana de retraso ya pasó.
 * Cron aparte cada 30 min. Es el motor de captación: el canal público enseña
 * que el pick funcionaba cuando ya no se puede aprovechar la cuota.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const channel = process.env.TELEGRAM_CHANNEL_PUBLIC;
  if (!channel) return NextResponse.json({ ok: true, note: "canal público sin configurar" });

  const sb = supabaseAdmin();
  const { data: picks } = await sb
    .from("picks")
    .select(`
      id, market, selection, line, odds_taken, book, edge_pct, stake_units,
      confidence, rationale,
      events!inner ( home_team, away_team, sport_title, commence_time )
    `)
    .is("channel_posted_at", null)
    .lte("free_visible_at", new Date().toISOString())
    .order("confidence", { ascending: false })
    .limit(3);

  let posted = 0;
  for (const p of picks ?? []) {
    const ev = (p as unknown as {
      events: { home_team: string; away_team: string; sport_title: string; commence_time: string };
    }).events;
    try {
      await sendMessage(channel, formatPick({
        sport: ev.sport_title, home: ev.home_team, away: ev.away_team,
        commenceTime: ev.commence_time, market: p.market, selection: p.selection,
        line: p.line, odds: Number(p.odds_taken), book: p.book,
        edge: Number(p.edge_pct), stake: Number(p.stake_units),
        confidence: p.confidence, rationale: p.rationale,
      }, true));
      await sb.from("picks")
        .update({ channel_posted_at: new Date().toISOString() })
        .eq("id", p.id);
      posted++;
      await sleep(PAUSE_MS);
    } catch (e) {
      console.error("canal público", e);
    }
  }

  return NextResponse.json({ ok: true, posted });
}
