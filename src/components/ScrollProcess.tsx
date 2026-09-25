"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/I18nProvider";

/**
 * NARRATIVA POR SCROLL
 * ────────────────────
 * Los cuatro pasos del motor como secuencia sticky: el panel derecho cambia
 * mientras la lista de la izquierda avanza. Cuenta un proceso en vez de
 * enseñar cuatro tarjetas sueltas.
 *
 * En móvil se degrada a lista apilada — el sticky de dos columnas en pantalla
 * pequeña es una trampa de usabilidad.
 */

const NUMS = [
  { n: "01", stat: "40+" },
  { n: "02", stat: "3" },
  { n: "03", stat: "2%" },
  { n: "04", stat: "+3.81%" },
];

export default function ScrollProcess() {
  const { steps, pasoLabel } = useT().process;
  const STEPS = NUMS.map((num, i) => ({ ...num, ...steps[i] }));
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = refs.current.findIndex((r) => r === e.target);
            if (i >= 0) setActive(i);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Columna que se desplaza */}
      <div className="space-y-4 lg:space-y-32">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            ref={(el) => { refs.current[i] = el; }}
            className={`transition-all duration-500 ${
              active === i ? "opacity-100" : "lg:opacity-35"
            }`}
          >
            <div className="flex items-baseline gap-4">
              <span
                className={`font-mono text-sm font-bold transition-colors duration-500 ${
                  active === i ? "text-accent" : "text-muted"
                }`}
              >
                {s.n}
              </span>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{s.t}</h3>
            </div>
            <p className="mt-4 max-w-lg leading-relaxed text-muted">{s.d}</p>

            {/* En móvil la cifra vive aquí; en desktop en el panel sticky */}
            <div className="mt-4 lg:hidden">
              <span className="font-mono text-3xl font-bold text-accent">{s.stat}</span>
              <span className="ml-2 text-sm text-muted">{s.statLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Panel fijo */}
      <div className="hidden lg:block">
        <div className="sticky top-32">
          <div className="card relative overflow-hidden p-10">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

            <div className="relative">
              <div className="label">{pasoLabel} {STEPS[active].n}</div>

              <div
                key={active}
                className="mt-6 animate-fade-up font-mono text-7xl font-bold tabular-nums text-accent"
              >
                {STEPS[active].stat}
              </div>
              <div className="mt-2 text-sm text-muted">{STEPS[active].statLabel}</div>

              <div className="mt-10 h-px w-full bg-line" />

              {/* Progreso */}
              <div className="mt-6 flex gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                      i <= active ? "bg-accent" : "bg-line"
                    }`}
                  />
                ))}
              </div>

              <p className="mt-6 text-sm leading-relaxed text-muted">
                {STEPS[active].t}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
