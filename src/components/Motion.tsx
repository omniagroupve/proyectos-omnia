"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal · aparición al entrar en viewport.
 * IntersectionObserver, no librería: cero KB extra y no bloquea el hilo.
 * Respeta prefers-reduced-motion — obligatorio en accesibilidad.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") { setShown(true); return; }

    const el = ref.current;
    if (!el) { setShown(true); return; }

    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);

    // RED DE SEGURIDAD. Esto empieza en opacity:0, así que si el observador
    // no llega a dispararse —captura headless, navegador raro, scroll dentro
    // de un contenedor— el visitante se queda mirando una página en blanco.
    // Pasado un segundo y medio se muestra igual: el efecto es un adorno, el
    // contenido no.
    const red = setTimeout(() => { setShown(true); io.disconnect(); }, 1500);

    return () => { clearTimeout(red); io.disconnect(); };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * CountUp · contador animado con easing.
 * Los números importan en este producto: verlos subir hace que se lean.
 */
export function CountUp({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1400,
  className = "",
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Arranca en el valor FINAL, no en cero. Así el HTML del servidor ya trae
  // el número bueno: lo ve Google, lo ve quien tenga el JS roto y lo ve una
  // captura. Un titular de marketing que dice "0 %" es peor que no tenerlo.
  const [val, setVal] = useState(to);
  const done = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") { setVal(to); return; }

    const el = ref.current;
    if (!el) { setVal(to); return; }

    // Sólo merece la pena animar lo que aún no se ha visto.
    const caja = el.getBoundingClientRect();
    if (caja.top < window.innerHeight && caja.bottom > 0) { setVal(to); return; }
    setVal(0);

    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done.current) return;
      done.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);   // easeOutCubic
        setVal(to * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);

    const red = setTimeout(() => {
      if (!done.current) { done.current = true; io.disconnect(); setVal(to); }
    }, 1500);

    return () => { clearTimeout(red); io.disconnect(); };
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Punto de "en vivo" con onda expansiva. */
export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  );
}
