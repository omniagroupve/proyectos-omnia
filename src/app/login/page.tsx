"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Magic link: sin contraseñas.
 * Menos fricción en el registro = mejor conversión desde tráfico SEO frío,
 * y menos superficie de soporte (nadie recupera una contraseña que no existe).
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/picks` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8">
        {sent ? (
          <>
            <h1 className="text-2xl font-bold">Revisa tu correo</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Te hemos enviado un enlace de acceso a <strong className="text-white">{email}</strong>.
              Caduca en 60 minutos.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Entrar o crear cuenta</h1>
            <p className="mt-2 text-sm text-muted">
              Sin contraseña. Te enviamos un enlace de acceso.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <p className="mt-6 text-xs leading-relaxed text-muted">
              Al continuar confirmas que tienes 18 años o más y aceptas los
              términos del servicio.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
