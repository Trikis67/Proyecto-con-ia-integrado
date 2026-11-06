import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";

/**
 * Cliente con la clave secreta: salta RLS. Solo en el servidor y solo para escribir
 * datos públicos de licitaciones (p. ej. el análisis de IA) después de comprobar la sesión.
 */
export function createAdminClient() {
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!secreta) throw new Error("Falta SUPABASE_SECRET_KEY en el servidor");
  return createClient(supabaseUrl, secreta, { auth: { persistSession: false } });
}
