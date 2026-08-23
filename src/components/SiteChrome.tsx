"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BRAND = process.env.NEXT_PUBLIC_BRAND || "Omnia Picks";

export function Nav() {
  const s = useT().nav;
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
          <Link href="/picks" className="hover:text-white">{s.picks}</Link>
          <Link href="/rendimiento" className="hover:text-white">{s.performance}</Link>
          <Link href="/pronosticos" className="hover:text-white">{s.matches}</Link>
          <Link href="/herramientas/calculadora-valor" className="hover:text-white">{s.calculator}</Link>
          <Link href="/guias" className="hover:text-white">{s.guides}</Link>
          <Link href="/precios" className="hover:text-white">{s.pricing}</Link>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm text-muted hover:text-white">{s.login}</Link>
          <Link href="/precios" className="btn-primary !px-4 !py-2">{s.cta}</Link>
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  const s = useT().footer;
  return (
    <footer className="mt-24 border-t border-line/70 py-12 text-sm text-muted">
      <div className="container-x grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-3 font-bold text-white">{BRAND}</div>
          <p className="max-w-md leading-relaxed">{s.tagline}</p>
        </div>
        <div>
          <div className="label mb-3">{s.product}</div>
          <ul className="space-y-2">
            <li><Link href="/rendimiento" className="hover:text-white">{s.trackRecord}</Link></li>
            <li><Link href="/precios" className="hover:text-white">{s.pricing}</Link></li>
            <li><Link href="/pronosticos" className="hover:text-white">{s.matches}</Link></li>
            <li><Link href="/herramientas/calculadora-valor" className="hover:text-white">{s.calculator}</Link></li>
          </ul>
        </div>
        <div>
          <div className="label mb-3">{s.legal}</div>
          <ul className="space-y-2">
            <li><Link href="/legal/terminos" className="hover:text-white">{s.terms}</Link></li>
            <li><Link href="/legal/privacidad" className="hover:text-white">{s.privacy}</Link></li>
            <li><Link href="/legal/juego-responsable" className="hover:text-white">{s.responsibleGaming}</Link></li>
          </ul>
        </div>
      </div>

      {/* Aviso legal: obligatorio, y además protege el negocio. */}
      <div className="container-x mt-10 border-t border-line/70 pt-6 text-xs leading-relaxed text-muted/80">
        <p className="mb-2">{s.ageWarning}</p>
        <p>
          {BRAND} {s.disclaimer}
        </p>
      </div>
    </footer>
  );
}
