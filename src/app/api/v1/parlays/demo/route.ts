import { ok } from "@/lib/api/http";
import { DEMO_PARLAYS, DEMO_EVENTS_TONIGHT } from "@/lib/demo-parlays";

export const revalidate = 300;

/** Datos de ejemplo para desarrollo del frontend. Nunca son historial real. */
export async function GET() {
  return ok({ demo: true, parlays: DEMO_PARLAYS, events: DEMO_EVENTS_TONIGHT });
}
