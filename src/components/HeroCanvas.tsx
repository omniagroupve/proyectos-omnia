"use client";

import { useEffect, useRef } from "react";

/**
 * FONDO DEL HERO · movimiento de línea en vivo
 * ────────────────────────────────────────────
 * No es decoración abstracta: dibuja lo que hace el producto. Varias casas
 * cotizando el mismo evento, sus precios divergiendo, y el punto donde una se
 * separa del consenso lo suficiente como para que haya valor.
 *
 * Canvas y no SVG porque son ~600 puntos redibujándose a 60fps: con nodos DOM
 * el navegador se arrodilla.
 *
 * Se apaga solo cuando la pestaña no está visible o el hero sale de pantalla.
 * Un canvas animado fuera de vista es batería quemada.
 */

interface Series {
  points: number[];
  phase: number;
  speed: number;
  amp: number;
  drift: number;
  sharp: boolean;
}

const N_POINTS = 90;

function makeSeries(count: number): Series[] {
  return Array.from({ length: count }, (_, i) => {
    const sharp = i === 0;
    return {
      points: new Array(N_POINTS).fill(0.5),
      phase: (i / count) * Math.PI * 2,
      // La casa sharp se mueve poco: su precio es el más estable y certero.
      speed: sharp ? 0.0016 : 0.0022 + (i % 5) * 0.0007,
      amp: sharp ? 0.05 : 0.09 + (i % 4) * 0.035,
      drift: sharp ? 0 : (i % 2 === 0 ? 1 : -1) * 0.02,
      sharp,
    };
  });
}

export default function HeroCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // sin animación: el degradado CSS de detrás ya da profundidad
    }

    const series = makeSeries(9);
    let raf = 0;
    let t = 0;
    let running = true;
    let w = 0, h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pausa cuando el hero deja de verse
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting && !document.hidden;
      if (running) raf = requestAnimationFrame(draw);
    }, { threshold: 0 });
    io.observe(canvas);

    const onVis = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    function draw() {
      if (!running || !ctx) return;
      t += 1;
      ctx.clearRect(0, 0, w, h);

      const pad = 0;
      const usableH = h * 0.72;
      const topOffset = h * 0.14;

      for (const s of series) {
        // Desplaza la serie e inserta el nuevo valor por la derecha
        s.points.shift();
        const v =
          0.5 +
          Math.sin(t * s.speed + s.phase) * s.amp +
          Math.sin(t * s.speed * 2.3 + s.phase * 1.7) * s.amp * 0.45 +
          Math.sin(t * 0.0004) * s.drift;
        s.points.push(v);

        ctx.beginPath();
        for (let i = 0; i < s.points.length; i++) {
          const x = pad + (i / (s.points.length - 1)) * (w - pad * 2);
          const y = topOffset + (1 - s.points[i]) * usableH;
          if (i === 0) ctx.moveTo(x, y);
          else {
            // Curva suave: el punto medio entre muestras como control
            const px = pad + ((i - 1) / (s.points.length - 1)) * (w - pad * 2);
            const py = topOffset + (1 - s.points[i - 1]) * usableH;
            ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
          }
        }

        if (s.sharp) {
          ctx.strokeStyle = "rgba(0, 214, 128, 0.55)";
          ctx.lineWidth = 1.6;
          ctx.shadowColor = "rgba(0, 214, 128, 0.5)";
          ctx.shadowBlur = 12;
        } else {
          ctx.strokeStyle = "rgba(138, 146, 158, 0.16)";
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Punto de valor: donde una casa recreativa se separa más de la sharp
      const sharp = series[0];
      let best = 1, bestGap = 0;
      for (let i = 1; i < series.length; i++) {
        const gap = series[i].points[N_POINTS - 1] - sharp.points[N_POINTS - 1];
        if (gap > bestGap) { bestGap = gap; best = i; }
      }
      if (bestGap > 0.08) {
        const x = w - 1;
        const y = topOffset + (1 - series[best].points[N_POINTS - 1]) * usableH;
        const pulse = 3 + Math.sin(t * 0.06) * 1.6;
        ctx.beginPath();
        ctx.arc(x, y, pulse + 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 214, 128, 0.12)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 214, 128, 0.95)";
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
