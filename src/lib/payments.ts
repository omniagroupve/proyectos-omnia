// ═══════════════════════════════════════════════════════════════════════════
// PAGOS · Lemon Squeezy
// ═══════════════════════════════════════════════════════════════════════════
//
// POR QUÉ NO STRIPE:
// Stripe clasifica los servicios de pronósticos deportivos como negocio
// restringido. Es habitual que aprueben la cuenta, dejen operar unos meses
// y luego la cierren reteniendo el saldo 90-180 días. Es el fallo más común
// en este tipo de proyecto — y el más caro, porque llega cuando ya facturas.
//
// Lemon Squeezy y Paddle actúan como "merchant of record": ellos son el
// vendedor legal, asumen el riesgo del procesador y gestionan el IVA/VAT
// internacional (relevante si vendes a España y LatAm a la vez).
//
// Coste: ~5% + $0.50 vs ~2.9% + $0.30 de Stripe. Ese ~2% extra es el seguro
// contra que te congelen la facturación entera. Pagalo.
//
// PLAN B: ten una segunda cuenta abierta con Paddle desde el día 1.
// ═══════════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";
import type { TierId } from "./config";

const LS_API = "https://api.lemonsqueezy.com/v1";

function headers() {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

export function variantForTier(tier: Exclude<TierId, "free">): string | undefined {
  return tier === "pro"
    ? process.env.LEMONSQUEEZY_VARIANT_PRO
    : process.env.LEMONSQUEEZY_VARIANT_ELITE;
}

/** Crea un checkout y devuelve la URL a la que redirigir. */
export async function createCheckout(params: {
  tier: Exclude<TierId, "free">;
  userId: string;
  email: string;
}): Promise<string> {
  const variantId = variantForTier(params.tier);
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!variantId || !storeId) throw new Error("Lemon Squeezy sin configurar");

  const res = await fetch(`${LS_API}/checkouts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: params.email,
            // custom viaja de vuelta en el webhook: así atamos pago ↔ usuario
            custom: { user_id: params.userId, tier: params.tier },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/picks?bienvenida=1`,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: String(storeId) } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Lemon Squeezy ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data.attributes.url as string;
}

/**
 * Verifica la firma HMAC del webhook.
 * Sin esto, cualquiera puede regalarse el tier Elite con un curl.
 */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Eventos que otorgan acceso vs. los que lo retiran. */
export const GRANTING_EVENTS = new Set([
  "subscription_created",
  "subscription_resumed",
  "subscription_unpaused",
  "subscription_payment_success",
]);

export const REVOKING_EVENTS = new Set([
  "subscription_expired",
  "subscription_cancelled",   // ojo: cancelled = no renovará; sigue activo hasta ends_at
  "subscription_paused",
]);
