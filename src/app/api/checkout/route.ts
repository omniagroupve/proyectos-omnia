import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createCheckout } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión primero" }, { status: 401 });
  }

  const { tier } = await req.json();
  if (tier !== "pro" && tier !== "elite") {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  }

  try {
    const url = await createCheckout({
      tier,
      userId: user.id,
      email: user.email ?? "",
    });
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
