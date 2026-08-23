import type { MetadataRoute } from "next";
import { SEO_LEAGUES } from "@/lib/config";
import { GUIDES } from "@/lib/guides";
import { supabasePublic, isSupabaseConfigured } from "@/lib/supabase/server";

export const revalidate = 3600;

/**
 * El sitemap es lo que decide si tus miles de páginas programáticas existen
 * para Google o no. El fallo clásico del pSEO es generar 10.000 URLs y que
 * Google indexe 300.
 *
 * Dos reglas que aplicamos aquí:
 *  1. Solo incluimos partidos con datos reales (ingestados), no combinaciones
 *     teóricas. Una página vacía indexada daña la calidad de todo el dominio.
 *  2. Priority y changeFrequency reflejan el ciclo de vida real de la página.
 *
 * Si superas las 50.000 URLs, hay que partirlo en varios sitemaps con índice.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tudominio.com";
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/precios`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/rendimiento`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pronosticos`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/herramientas/calculadora-valor`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  const leagueUrls: MetadataRoute.Sitemap = SEO_LEAGUES.map((l) => ({
    url: `${base}/pronosticos/${l.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const guideUrls: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${base}/guias/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  let eventUrls: MetadataRoute.Sitemap = [];
  try {
    if (!isSupabaseConfigured()) throw new Error("sin credenciales");
    const sb = supabasePublic();
    const { data } = await sb
      .from("events")
      .select("league_slug, slug, commence_time, completed, updated_at")
      // Ventana de 90 días hacia atrás: las páginas viejas ya actualizadas con
      // resultado siguen atrayendo búsquedas de "resultado X vs Y".
      .gte("commence_time", new Date(Date.now() - 90 * 86400_000).toISOString())
      .order("commence_time", { ascending: false })
      .limit(20000);

    eventUrls = (data ?? []).map((e) => ({
      url: `${base}/pronosticos/${e.league_slug}/${e.slug}`,
      lastModified: new Date(e.updated_at),
      changeFrequency: e.completed ? ("monthly" as const) : ("hourly" as const),
      priority: e.completed ? 0.4 : 0.7,
    }));
  } catch {
    // Sin DB configurada el sitemap sigue siendo válido con las páginas fijas.
  }

  return [...staticUrls, ...leagueUrls, ...guideUrls, ...eventUrls];
}
