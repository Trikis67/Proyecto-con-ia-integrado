import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

/**
 * Comprobación de verdad de la sesión para páginas privadas (el proxy solo filtra).
 * Siempre en tiempo de petición: depende de quién pide la página.
 */
export async function exigirSesion(siguiente = "/panel") {
  await connection();
  if (!supabaseConfigurado) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/login?siguiente=${encodeURIComponent(siguiente)}`);
  return { supabase, claims: data.claims };
}
