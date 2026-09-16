import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * ¿Hay credenciales de Supabase en el entorno?
 *
 * Las páginas públicas consultan esto antes de leer datos. Sirve para dos cosas:
 *  1. El repo compila recién clonado, sin .env, para poder ver el diseño.
 *  2. En producción, una variable mal configurada degrada la página en lugar
 *     de devolver un 500. Un sitio que renderiza sin datos es recuperable;
 *     un 500 en todas las URLs le dice a Google que el dominio está roto.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Cliente con la sesión del usuario. Respeta RLS. Úsalo en Server Components. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: CookieToSet[]) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: lo refresca el middleware.
          }
        },
      },
    }
  );
}

/**
 * Cliente admin: SALTA RLS.
 * Solo para crons y webhooks. Nunca importar desde un Client Component.
 */
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Cliente anónimo para páginas públicas/SEO (sin cookies, cacheable). */
export function supabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
