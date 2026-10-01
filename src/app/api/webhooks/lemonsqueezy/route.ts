import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyWebhook, GRANTING_EVENTS } from "@/lib/payments";
import type { TierId } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature");

  if (!verifyWebhook(raw, sig)) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  const body = JSON.parse(raw);
  const eventName: string = body?.meta?.event_name ?? "";
  const custom = body?.meta?.custom_data ?? {};
  const userId: string | undefined = custom.user_id;
  const tier: TierId = (custom.tier as TierId) ?? "pro";
  const attrs = body?.data?.attributes ?? {};

  const sb = supabaseAdmin();

  // Log completo: si algo se descuadra, aquí está la verdad.
  await sb.from("subscription_events").insert({
    user_id: userId ?? null,
    ls_event: eventName,
    ls_payload: body,
  });

  if (!userId) return NextResponse.json({ ok: true, note: "sin user_id" });

  if (GRANTING_EVENTS.has(eventName)) {
    // renews_at/ends_at marca hasta cuándo tiene acceso pagado.
    // Usamos eso en vez de un booleano: si el pago falla, el acceso
    // caduca solo sin necesidad de otro webhook.
    const expires = attrs.renews_at ?? attrs.ends_at ?? null;
    await sb
      .from("profiles")
      .update({
        tier,
        ls_customer_id: String(attrs.customer_id ?? ""),
        ls_subscription_id: String(body?.data?.id ?? ""),
        tier_expires_at: expires,
      })
      .eq("id", userId);
  }

  if (eventName === "subscription_expired" || eventName === "subscription_paused") {
    await sb
      .from("profiles")
      .update({ tier: "free", tier_expires_at: null })
      .eq("id", userId);
  }

  // "cancelled" NO revoca: el usuario pagó el mes, lo termina.
  // Revocar aquí es la forma más rápida de ganarte un chargeback.
  if (eventName === "subscription_cancelled") {
    await sb
      .from("profiles")
      .update({ tier_expires_at: attrs.ends_at ?? null })
      .eq("id", userId);
  }

  return NextResponse.json({ ok: true });
}
