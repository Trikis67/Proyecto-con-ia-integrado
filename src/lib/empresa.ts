import type { SupabaseClient } from "@supabase/supabase-js";

export type Empresa = {
  id: string;
  nombre: string;
  descripcion: string | null;
  palabras_clave: string[];
  departamentos: string[];
  monto_minimo: number | null;
  monto_maximo: number | null;
};

/** La empresa de la persona (por ahora, una por persona: la primera de la que es miembro). */
export async function miEmpresa(supabase: SupabaseClient): Promise<Empresa | null> {
  const { data } = await supabase
    .from("empresas")
    .select("id, nombre, descripcion, palabras_clave, departamentos, monto_minimo, monto_maximo")
    .order("creado_en")
    .limit(1)
    .maybeSingle<Empresa>();
  return data;
}

/** «aire acondicionado, mini split\nclimatización» → ["aire acondicionado", "mini split", "climatización"] */
export function leerPalabras(texto: string) {
  return [
    ...new Set(
      texto
        .split(/[,\n;]+/)
        .map((p) => p.replace(/\s+/g, " ").trim().toLowerCase())
        .filter((p) => p.length >= 2 && p.length <= 60),
    ),
  ].slice(0, 30);
}
