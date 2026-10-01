import type { MetadataRoute } from "next";

/**
 * robots.txt
 *
 * Dos públicos distintos y los dos importan:
 *
 *  · BUSCADORES CLÁSICOS (Google, Bing). Les interesa el contenido público:
 *    el constructor, los picks del plan gratuito, el historial, las guías y
 *    las páginas de partido.
 *
 *  · MOTORES GENERATIVOS (ChatGPT, Perplexity, Claude, AI Overviews). Cada vez
 *    más gente pregunta «¿qué app de predicciones deportivas con IA hay?» en
 *    lugar de buscarlo. Si sus rastreadores no pueden leernos, no existimos en
 *    esa respuesta. Se les deja pasar explícitamente, no por omisión, para que
 *    quede claro que es una decisión y no un descuido.
 *
 * Lo único cerrado es lo que no tiene sentido indexar: la API, el login y el
 * área privada. `/picks` SÍ se indexa: la vista pública enseña los picks del
 * plan gratuito, que es contenido nuevo cada día y es lo que nos trae gente.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tudominio.com";

  const privado = ["/api/", "/login", "/cuenta"];

  // Rastreadores de motores generativos. Se nombran uno a uno porque algunos
  // ignoran el comodín y porque así se ve a simple vista a quién dejamos leer.
  const generativos = [
    "GPTBot",            // OpenAI · entrenamiento
    "OAI-SearchBot",     // OpenAI · búsqueda en ChatGPT
    "ChatGPT-User",      // OpenAI · cuando un usuario pide abrir la página
    "ClaudeBot",         // Anthropic
    "Claude-User",
    "PerplexityBot",     // Perplexity
    "Perplexity-User",
    "Google-Extended",   // Gemini y AI Overviews
    "Applebot-Extended", // Apple Intelligence
    "Bingbot",           // Copilot se apoya en el índice de Bing
    "cohere-ai",
    "meta-externalagent",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privado },
      ...generativos.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privado,
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
