import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Modo demo: cada visitante entra con una sesión anónima y recibe su propia copia
 * de la empresa de ejemplo, con las evaluaciones de encaje ya hechas.
 * Así ve el producto funcionando al instante y nadie toca los datos de otro.
 */
export const NOMBRE_PLANTILLA = "Climas del Sur (ejemplo)";

export async function prepararEmpresaDemo(usuarioId: string) {
  const admin = createAdminClient();

  // Si ya tiene empresa (volvió a entrar con la misma sesión), no duplicamos
  const { data: yaTiene } = await admin.from("miembros").select("empresa_id").eq("usuario_id", usuarioId).limit(1);
  if (yaTiene?.length) return;

  const { data: plantilla } = await admin
    .from("empresas")
    .select("id, descripcion, rubros, palabras_clave, departamentos, monto_minimo, monto_maximo")
    .eq("nombre", NOMBRE_PLANTILLA)
    .order("creado_en")
    .limit(1)
    .maybeSingle();
  if (!plantilla) return; // Sin plantilla, el visitante crea su perfil desde cero

  const { id: plantillaId, ...campos } = plantilla;
  const { data: nueva, error } = await admin
    .from("empresas")
    .insert({ ...campos, nombre: "Climas del Sur (demo)" })
    .select("id")
    .single();
  if (error || !nueva) return;

  await admin.from("miembros").insert({ empresa_id: nueva.id, usuario_id: usuarioId, rol: "admin" });

  const { data: evaluaciones } = await admin
    .from("coincidencias")
    .select("licitacion_id, puntaje, veredicto, razones, evaluado_en")
    .eq("empresa_id", plantillaId);
  if (evaluaciones?.length) {
    await admin.from("coincidencias").insert(evaluaciones.map((e) => ({ ...e, empresa_id: nueva.id })));
  }
}
