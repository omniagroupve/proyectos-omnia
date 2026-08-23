import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tudominio.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /picks es contenido de pago: indexarlo regala el producto y además
        // genera páginas sin valor para el buscador.
        disallow: ["/api/", "/picks", "/login"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
