import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/85 backdrop-blur">
      <nav className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent font-mono text-sm text-ink">
            Ω
          </span>
          {BRAND}
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <Link href="/picks" className="hover:text-white">IA Picks</Link>
          <Link href="/rendimiento" className="hover:text-white">Rendimiento</Link>
          <Link href="/pronosticos" className="hover:text-white">Pronósticos</Link>
          <Link href="/herramientas/calculadora-valor" className="hover:text-white">Calculadora</Link>
          <Link href="/guias" className="hover:text-white">Guías</Link>
          <Link href="/precios" className="hover:text-white">Precios</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted hover:text-white">Entrar</Link>
          <Link href="/precios" className="btn-primary !px-4 !py-2">Empezar gratis</Link>
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line/70 py-12 text-sm text-muted">
      <div className="container-x grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-3 font-bold text-white">{BRAND}</div>
          <p className="max-w-md leading-relaxed">
            Análisis cuantitativo de mercados deportivos. No somos una casa de
            apuestas ni gestionamos dinero de terceros.
          </p>
        </div>
        <div>
          <div className="label mb-3">Producto</div>
          <ul className="space-y-2">
            <li><Link href="/rendimiento" className="hover:text-white">Track record</Link></li>
            <li><Link href="/precios" className="hover:text-white">Precios</Link></li>
            <li><Link href="/pronosticos" className="hover:text-white">Pronósticos</Link></li>
            <li><Link href="/herramientas/calculadora-valor" className="hover:text-white">Calculadora</Link></li>
          </ul>
        </div>
        <div>
          <div className="label mb-3">Legal</div>
          <ul className="space-y-2">
            <li><Link href="/legal/terminos" className="hover:text-white">Términos</Link></li>
            <li><Link href="/legal/privacidad" className="hover:text-white">Privacidad</Link></li>
            <li><Link href="/legal/juego-responsable" className="hover:text-white">Juego responsable</Link></li>
          </ul>
        </div>
      </div>

      {/* Aviso legal: obligatorio, y además protege el negocio. */}
      <div className="container-x mt-10 border-t border-line/70 pt-6 text-xs leading-relaxed text-muted/80">
        <p className="mb-2">
          <strong className="text-muted">+18.</strong> Prohibido para menores de edad.
          El juego puede causar adicción. Juega con responsabilidad y nunca apuestes
          dinero que no puedas permitirte perder.
        </p>
        <p>
          {BRAND} ofrece contenido informativo y analítico. Los resultados pasados no
          garantizan resultados futuros. No garantizamos beneficios de ningún tipo.
          Comprueba la legalidad del juego online en tu jurisdicción antes de operar.
          Algunos enlaces a operadores son de afiliación.
        </p>
      </div>
    </footer>
  );
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
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
