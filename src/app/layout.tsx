import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { Nav, Footer } from "@/components/SiteChrome";

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
