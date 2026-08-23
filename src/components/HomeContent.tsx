"use client";

import Link from "next/link";
import { type Performance } from "@/components/PerformanceBar";
import PickCard, { type PickView } from "@/components/PickCard";
import PricingTable from "@/components/PricingTable";
import ValueCalculator from "@/components/ValueCalculator";
import HeroCanvas from "@/components/HeroCanvas";
import { Reveal, CountUp, LiveDot } from "@/components/Motion";
import { SEO_LEAGUES } from "@/lib/config";
import { useT } from "@/components/I18nProvider";

export default function HomeContent({
  perf,
  recent,
}: {
  perf: Performance | null;
  recent: PickView[];
}) {
  const s = useT().home;
  const heroStats = [
    { v: perf?.hit_rate_pct ?? 83, suf: "%" },
    { v: 20, suf: "+" },
  ];

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
      <section className="relative isolate overflow-hidden">
        <HeroCanvas className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] w-full opacity-[0.55]" />
        <div className="pointer-events-none absolute inset-0 grid-bg" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] bg-gradient-to-b from-transparent via-ink/40 to-ink" />

        <div className="container-x relative pb-20 pt-28 text-center sm:pt-36">
          <div className="live-badge mx-auto mb-8 inline-flex animate-fade-up items-center gap-2.5 px-4 py-2 text-xs backdrop-blur-md">
            <LiveDot />
            <span className="font-semibold text-white">{s.liveBadgePrefix}</span>
            <span className="text-muted">{s.liveBadgeSuffix}</span>
          </div>

          <h1 className="mx-auto max-w-5xl animate-fade-up text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.03em] [animation-delay:80ms]">
            {s.heroTitle1}
            <br />
            <span className="text-gradient">{s.heroTitle2}</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl animate-fade-up text-lg leading-relaxed text-muted [animation-delay:160ms] sm:text-xl">
            {s.heroSubtitle}
          </p>

          <div className="mt-11 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:240ms]">
            <Link href="/precios" className="btn-primary !px-8 !py-4 !text-base">
              {s.ctaStart}
            </Link>
            <Link href="/rendimiento" className="btn-ghost !px-8 !py-4 !text-base">
              {s.ctaAudit}
            </Link>
          </div>

          <p className="mt-6 animate-fade-in text-xs text-muted [animation-delay:400ms]">
            {s.heroDisclaimer}
          </p>

          <div className="mx-auto mt-20 flex max-w-xl animate-fade-up justify-center gap-4 [animation-delay:320ms]">
            {heroStats.map((stat, i) => (
              <div key={s.stats[i].l} className="card card-hover stat-card flex-1 p-6">
                <div className="font-mono text-4xl font-bold tabular-nums text-accent">
                  <CountUp to={stat.v} decimals={0} suffix={stat.suf} />
                </div>
                <div className="mt-1.5 text-sm leading-tight text-muted">{s.stats[i].l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CÓMO FUNCIONA ══════════════════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-28">
          <div className="mb-12 text-center">
            <div className="label">{s.howItWorksLabel}</div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight">
              {s.howItWorksTitle}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {s.steps.map((step) => (
              <div key={step.t} className="card card-hover p-8 text-center">
                <div className="icon-badge">{step.emoji}</div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{step.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.d}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ═══ PICKS RECIENTES ════════════════════════════════════════════ */}
      {recent.length > 0 && (
        <Reveal>
          <section className="container-x mt-32">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{s.picksTitle}</h2>
                <p className="mt-2 text-muted">{s.picksDesc}</p>
              </div>
              <Link href="/rendimiento" className="hidden text-sm text-accent hover:underline sm:block">
                {s.picksSeeAll}
              </Link>
            </div>
            <div className="grid gap-4">
              {recent.map((p) => <PickCard key={p.id} pick={p} />)}
            </div>
            <p className="mt-5 text-center text-xs text-muted">{s.perfDisclaimer}</p>
          </section>
        </Reveal>
      )}

      {/* ═══ CALCULADORA ════════════════════════════════════════════════ */}
      <Reveal>
        <section className="container-x mt-32">
          <div className="mb-10 text-center">
            <div className="label">{s.calcLabel}</div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight">
              {s.calcTitle}
            </h2>
          </div>
          <ValueCalculator />
        </section>
      </Reveal>

      {/* ═══ PRECIOS ════════════════════════════════════════════════════ */}
      <Reveal>
        <section id="precios" className="container-x mt-32">
          <div className="mb-12 text-center">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold tracking-tight">{s.pricingTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              {s.pricingDesc}
            </p>
          </div>
          <PricingTable />
        </section>
      </Reveal>

      {/* ═══ SEO INTERNO ════════════════════════════════════════════════ */}
      <section className="container-x mt-32">
        <h2 className="text-xl font-bold">{s.seoTitle}</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {SEO_LEAGUES.map((l) => (
            <Link
              key={l.slug}
              href={`/pronosticos/${l.slug}`}
              className="rounded-lg border border-line bg-panel px-3.5 py-2 text-sm text-muted transition hover:border-accent/50 hover:text-accent"
            >
              {s.seoLinkPrefix} {l.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
