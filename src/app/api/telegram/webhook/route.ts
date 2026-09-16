// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK DE TELEGRAM · comandos del bot
// ═══════════════════════════════════════════════════════════════════════════
//
// Comandos:
//   /start          bienvenida
//   /vincular CODE  ata el chat de Telegram a la cuenta web
//   /stats          track record actual
//   /plan           qué plan tiene y hasta cuándo
//   /baja           desvincula
//
// SEGURIDAD: Telegram envía la cabecera X-Telegram-Bot-Api-Secret-Token.
// Sin verificarla, cualquiera puede simular mensajes contra este endpoint.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendMessage, esc, createInviteLink } from "@/lib/telegram";

export const dynamic = "force-dynamic";

interface TgUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
}

const HELP = [
  "*Omnia IA Picks*",
  "",
  "`/vincular CÓDIGO` — conecta tu cuenta",
  "`/stats` — rendimiento actual",
  "`/plan` — tu plan y renovación",
  "`/baja` — desvincular este chat",
  "",
  "Consigue tu código en la web, en *Picks → Conectar Telegram*\\.",
  "",
  "\\+18 · Juega con responsabilidad",
].join("\n");

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  let update: TgUpdate;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const msg = update.message;
  if (!msg?.text || !msg.from) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const tgUserId = msg.from.id;
  const text = msg.text.trim();
  const sb = supabaseAdmin();

  try {
    // ── /start ────────────────────────────────────────────────────────────
    if (text.startsWith("/start")) {
      await sendMessage(chatId, HELP);
      return NextResponse.json({ ok: true });
    }

    // ── /vincular CODE ────────────────────────────────────────────────────
    if (text.startsWith("/vincular")) {
      const code = text.split(/\s+/)[1]?.toUpperCase();
      if (!code) {
        await sendMessage(chatId, "Uso: `/vincular TUCÓDIGO`");
        return NextResponse.json({ ok: true });
      }

      const { data: link } = await sb
        .from("telegram_link_codes")
        .select("user_id, expires_at, used_at")
        .eq("code", code)
        .maybeSingle();

      if (!link || link.used_at || new Date(link.expires_at) < new Date()) {
        await sendMessage(chatId, "❌ Código inválido o caducado\\. Genera uno nuevo en la web\\.");
        return NextResponse.json({ ok: true });
      }

      await sb.from("profiles")
        .update({ telegram_chat_id: String(chatId), telegram_user_id: tgUserId })
        .eq("id", link.user_id);
      await sb.from("telegram_link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("code", code);

      const { data: profile } = await sb
        .from("profiles").select("tier").eq("id", link.user_id).single();
      const tier = profile?.tier ?? "free";

      // Los planes de pago reciben además invitación al canal privado
      let extra = "";
      if (tier !== "free" && process.env.TELEGRAM_CHANNEL_PRO) {
        try {
          const inv = await createInviteLink(process.env.TELEGRAM_CHANNEL_PRO, 30);
          extra = `\n\nTu acceso al canal: ${esc(inv.invite_link)}\n_Enlace de un solo uso, caduca en 30 min\\._`;
        } catch { /* el canal puede no estar configurado todavía */ }
      }

      await sendMessage(
        chatId,
        `✅ *Cuenta vinculada*\n\nPlan: *${esc(tier.toUpperCase())}*\nRecibirás los picks aquí en cuanto se publiquen\\.${extra}`
      );
      return NextResponse.json({ ok: true });
    }

    // ── Resto de comandos: requieren cuenta vinculada ──────────────────────
    const { data: profile } = await sb
      .from("profiles")
      .select("id, tier, tier_expires_at")
      .eq("telegram_chat_id", String(chatId))
      .maybeSingle();

    if (text.startsWith("/stats")) {
      const { data: perf } = await sb.from("v_performance").select("*").single();
      if (!perf?.total_picks) {
        await sendMessage(chatId, "Aún no hay picks liquidados\\.");
        return NextResponse.json({ ok: true });
      }
      const n = (v: unknown) => Number(v ?? 0);
      await sendMessage(chatId, [
        "📈 *Rendimiento*",
        "",
        `Picks liquidados: *${esc(String(perf.total_picks))}*`,
        `Unidades: *${esc((n(perf.net_units) > 0 ? "+" : "") + n(perf.net_units).toFixed(2))}u*`,
        `ROI: *${esc((n(perf.roi_pct) > 0 ? "+" : "") + n(perf.roi_pct).toFixed(2))}%*`,
        `Acierto: *${esc(n(perf.hit_rate_pct).toFixed(1))}%*`,
        `CLV medio: *${esc((n(perf.avg_clv_pct) > 0 ? "+" : "") + n(perf.avg_clv_pct).toFixed(2))}%*`,
        `Bate el cierre: *${esc(n(perf.clv_beat_pct).toFixed(0))}%* de los picks`,
        "",
        "_El CLV es la métrica que importa\\. El ROI con muestra corta es ruido\\._",
      ].join("\n"));
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/plan")) {
      if (!profile) {
        await sendMessage(chatId, "No hay cuenta vinculada\\. Usa `/vincular CÓDIGO`\\.");
        return NextResponse.json({ ok: true });
      }
      const exp = profile.tier_expires_at
        ? new Date(profile.tier_expires_at).toLocaleDateString("es")
        : "—";
      await sendMessage(chatId, `Plan: *${esc(String(profile.tier).toUpperCase())}*\nRenovación: ${esc(exp)}`);
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/baja")) {
      if (profile) {
        await sb.from("profiles")
          .update({ telegram_chat_id: null, telegram_user_id: null })
          .eq("id", profile.id);
      }
      await sendMessage(chatId, "Chat desvinculado\\. No recibirás más picks aquí\\.");
      return NextResponse.json({ ok: true });
    }

    await sendMessage(chatId, HELP);
  } catch (e) {
    console.error("telegram webhook", e);
  }

  return NextResponse.json({ ok: true });
}
