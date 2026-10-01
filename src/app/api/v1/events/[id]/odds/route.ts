import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";
import { ok, errors, countryFromRequest } from "@/lib/api/http";
import { latestSnapshots } from "@/lib/api/legs";
import type { EventOdds, BookQuote, Market } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return errors.notConfigured();
  const { id } = await params;
  const country = countryFromRequest(req);
  const sb = supabasePublic();

  const [snaps, { data: books }, { data: avail }] = await Promise.all([
    latestSnapshots(sb, [id]),
    sb.from("books").select("key, title, odds_api_key"),
    country
      ? sb.from("book_availability").select("book_key, affiliate_url, licensed, sort_order").eq("country_code", country)
      : Promise.resolve({ data: null }),
  ]);
  const snap = snaps.get(id);
  if (!snap) return errors.notFound("Evento o cuotas");

  const byOddsKey = new Map((books ?? []).filter((b) => b.odds_api_key).map((b) => [b.odds_api_key as string, b]));
  const availByKey = new Map((avail ?? []).map((a) => [a.book_key, a]));
  const restrict = avail != null && avail.length > 0;

  const quotes: BookQuote[] = [];
  for (const bk of snap.bookmakers) {
    const cat = byOddsKey.get(bk.key);
    const av = cat ? availByKey.get(cat.key) : undefined;
    if (restrict && !av) continue;
    const markets: BookQuote["markets"] = {};
    for (const m of bk.markets ?? []) {
      markets[m.key as Market] = m.outcomes.map((o) => ({ selection: o.name, line: o.point ?? null, odds: o.price }));
    }
    quotes.push({
      book: cat?.key ?? bk.key,
      title: cat?.title ?? bk.title,
      affiliateUrl: av?.affiliate_url ?? null,
      licensed: av?.licensed ?? false,
      markets,
    });
  }
  quotes.sort((a, b) => Number(b.licensed) - Number(a.licensed) || a.title.localeCompare(b.title));

  const body: EventOdds = { eventId: id, capturedAt: snap.capturedAt, books: quotes };
  return ok({ ...body, country });
}
