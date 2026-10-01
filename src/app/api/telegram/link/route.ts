// Genera el código de vinculación que el usuario pega en el bot.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Sin I, O, 0, 1: se confunden al copiarlos a mano desde el móvil. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const sb = supabaseAdmin();
  const code = makeCode();
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  // Invalida los códigos anteriores del usuario: uno vivo a la vez
  await sb.from("telegram_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id).is("used_at", null);

  const { error } = await sb.from("telegram_link_codes")
    .insert({ code, user_id: user.id, expires_at: expiresAt });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    code,
    expiresAt,
    botUrl: `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "tubot"}?start=link`,
  });
}
