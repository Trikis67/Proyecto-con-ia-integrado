import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cada llamada a la IA cuesta dinero, así que hay límites cada 24 horas
 * (análisis de bases + evaluaciones de encaje):
 * - Cuentas con correo: 60 llamadas por persona (≈ $0.05 con Haiku 5.5).
 * - Visitantes del demo: 10 por visitante, y entre todos los visitantes como máximo
 *   TOPE_GLOBAL_DEMO llamadas al día (≈ $0.25), para que el sitio público no gaste de más.
 */
export const LLAMADAS_IA_POR_DIA = 60;
export const LLAMADAS_IA_DEMO = 10;
const TOPE_GLOBAL_DEMO = 300;

const hace24h = () => new Date(Date.now() - 86_400_000).toISOString();

export async function llamadasRestantes(admin: SupabaseClient, usuarioId: string, esDemo: boolean) {
  const { count } = await admin
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("creado_en", hace24h());
  const propio = Math.max(0, (esDemo ? LLAMADAS_IA_DEMO : LLAMADAS_IA_POR_DIA) - (count ?? 0));
  if (!esDemo || propio === 0) return propio;

  // Tope entre todos: contamos todo el uso del día (también el de cuentas reales, por simplicidad)
  const { count: total } = await admin.from("uso_ia").select("id", { count: "exact", head: true }).gte("creado_en", hace24h());
  return Math.min(propio, Math.max(0, TOPE_GLOBAL_DEMO - (total ?? 0)));
}

export function mensajeLimite(esDemo: boolean) {
  return esDemo
    ? `El demo permite ${LLAMADAS_IA_DEMO} usos de la IA por visitante al día (o se alcanzó el tope del día para todos los visitantes). Vuelve mañana o crea una cuenta con tu correo.`
    : `Llegaste al límite de ${LLAMADAS_IA_POR_DIA} usos de la IA por día. Vuelve a intentarlo mañana.`;
}
