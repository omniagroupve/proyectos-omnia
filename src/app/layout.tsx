import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { Nav, Footer } from "@/components/SiteChrome";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tudominio.com";
const BRAND = process.env.NEXT_PUBLIC_BRAND || "Omnia Picks";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${BRAND} · IA Picks para apuestas deportivas`,
    template: `%s · ${BRAND}`,
  },
  description:
    "IA Picks generados por un modelo cuantitativo sobre el consenso de 40+ casas. Track record auditable, CLV publicado, sin promesas de ganancias.",
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["es_MX", "es_VE", "es_AR", "es_CO"],
    siteName: BRAND,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/*
          Space Grotesk (display) + JetBrains Mono (cifras tabulares).
          Se cargan por <link> en lugar de next/font/google porque el build
          de este entorno no tiene acceso a fonts.googleapis.com.

          MEJORA RECOMENDADA en tu máquina: cambia a `next/font/google`.
          Autoaloja los ficheros, elimina la petición externa y quita el
          desplazamiento de layout al cargar. Gana en Core Web Vitals.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
