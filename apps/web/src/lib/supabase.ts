import { createClient, type Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Sin claves la app sigue funcionando en modo demo (sin login ni datos reales). */
export const isAuthConfigured = Boolean(url && anonKey);

export const supabase = isAuthConfigured ? createClient(url, anonKey) : null;

/** Token de acceso actual, o null. El cliente de API lo adjunta en cada llamada. */
export async function currentToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Magic link por email: sin contraseñas que recordar ni recuperar. */
export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error("Auth no configurada");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
