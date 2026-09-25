"use client";

import { useState } from "react";

/**
 * Conectar Telegram desde el dashboard.
 * El código caduca en 15 minutos y es de un solo uso: si alguien lo ve por
 * encima del hombro, no le sirve de nada al rato.
 */
export default function TelegramConnect({ connected }: { connected: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/telegram/link", { method: "POST" });
    const json = await res.json();
    setCode(json.code ?? null);
    setLoading(false);
  }

  if (connected) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
          ✓
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Telegram conectado</div>
          <div className="text-xs text-muted">
            Recibes los picks al instante. Usa <code>/baja</code> en el bot para desconectar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Recibe los picks en Telegram</h3>
          <p className="mt-1 text-sm text-muted">
            Notificación instantánea al publicarse. Sin retraso, sin abrir la web.
          </p>
        </div>
        <span className="animate-float text-2xl">✈️</span>
      </div>

      {!code ? (
        <button onClick={generate} disabled={loading} className="btn-primary mt-4 w-full">
          {loading ? "Generando…" : "Conectar Telegram"}
        </button>
      ) : (
        <div className="mt-4 animate-fade-up space-y-3">
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
            <div className="label">Tu código · caduca en 15 min</div>
            <div className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-accent">
              {code}
            </div>
          </div>

          <ol className="space-y-1.5 text-sm text-muted">
            <li>
              1. Abre{" "}
              <a
                href={`https://t.me/${bot}`}
                target="_blank"
                rel="noopener"
                className="font-semibold text-accent hover:underline"
              >
                @{bot}
              </a>
            </li>
            <li>
              2. Envía <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs">/vincular {code}</code>
            </li>
          </ol>

          <button
            onClick={() => {
              navigator.clipboard?.writeText(`/vincular ${code}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="btn-ghost w-full !py-2 !text-xs"
          >
            {copied ? "✓ Copiado" : "Copiar comando"}
          </button>
        </div>
      )}
    </div>
  );
}
