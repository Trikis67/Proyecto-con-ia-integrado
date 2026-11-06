import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cada llamada a la IA cuesta dinero: límite de llamadas por persona cada 24 horas
 * (análisis de bases + evaluaciones de encaje). Con Haiku 5.5, 60 llamadas ≈ $0.05.
 */
export const LLAMADAS_IA_POR_DIA = 60;

export async function llamadasRestantes(admin: SupabaseClient, usuarioId: string) {
  const { count } = await admin
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("creado_en", new Date(Date.now() - 86_400_000).toISOString());
  return Math.max(0, LLAMADAS_IA_POR_DIA - (count ?? 0));
}
