import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { Nav, Footer } from "@/components/SiteChrome";
import { LEAGUES } from "@/lib/config";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tudominio.com";
const BRAND = process.env.NEXT_PUBLIC_BRAND || "Pix";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // El término por el que queremos que nos encuentren es "app de predicciones
  // deportivas con IA": es como se busca la categoría, y es lo que somos.
  title: {
    default: `${BRAND} · App de predicciones deportivas con IA`,
    template: `%s · ${BRAND}`,
  },
  description:
    "Predicciones deportivas con IA para 29 ligas. Calculamos la probabilidad exacta de los 121 marcadores posibles de cada partido y la comparamos con lo que pagan 40+ casas. Historial público, incluidas las que fallan. No aceptamos apuestas.",
  keywords: [
    "predicciones deportivas con IA",
    "app de predicciones deportivas",
    "pronósticos deportivos inteligencia artificial",
    "AI sports predictions",
    "parlay con IA",
    "comparador de cuotas",
  ],
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["es_MX", "es_VE", "es_AR", "es_CO"],
    siteName: BRAND,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

/**
 * Datos estructurados del sitio.
 *
 * `Organization` y `WebSite` son la base que usa Google para el panel de
 * marca y el cuadro de búsqueda. `SoftwareApplication` es lo que nos clasifica
 * como app —la categoría por la que queremos salir— y permite declarar que el
 * plan de entrada cuesta cero.
 *
 * `isAccessibleForFree` y la descripción dejan explícito lo que más se
 * malinterpreta: que esto analiza cuotas, no acepta apuestas.
 */
function datosEstructurados() {
  const org = {
    "@type": "Organization",
    "@id": `${SITE}/#organizacion`,
    name: BRAND,
    url: SITE,
    logo: `${SITE}/icon`,
    description:
      "Servicio de información y análisis de mercados deportivos. No es una casa de apuestas.",
    areaServed: ["MX", "AR", "BR", "CO", "CL", "PE", "VE", "ES", "US"],
  };

  const sitio = {
    "@type": "WebSite",
    "@id": `${SITE}/#sitio`,
    url: SITE,
    name: BRAND,
    inLanguage: "es",
    publisher: { "@id": `${SITE}/#organizacion` },
  };

  const app = {
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#app`,
    name: BRAND,
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    url: `${SITE}/armar`,
    description:
      `App de predicciones deportivas con IA. Calcula la probabilidad real de cada partido ` +
      `sobre ${LEAGUES.length} competiciones y la compara con las cuotas de más de 40 casas ` +
      `para detectar dónde pagan por encima de lo que vale.`,
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Constructor de parlays, calculadora e historial, sin registro.",
    },
    publisher: { "@id": `${SITE}/#organizacion` },
  };

  return { "@context": "https://schema.org", "@graph": [org, sitio, app] };
}

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados()) }}
        />
        <I18nProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
