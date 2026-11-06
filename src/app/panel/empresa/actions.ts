"use server";

import { redirect } from "next/navigation";
import { exigirSesion } from "@/lib/sesion";
import { leerPalabras, miEmpresa } from "@/lib/empresa";
import { departamentoCrudo, LISTA_DEPARTAMENTOS } from "@/lib/formato";

export type EstadoPerfil = { error?: string; campos?: Record<string, string> } | null;

const monto = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return String(v ?? "").trim() && Number.isFinite(n) && n > 0 ? n : null;
};

export async function guardarPerfil(_previo: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  const { supabase } = await exigirSesion("/panel/empresa");

  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 120);
  const descripcion = String(form.get("descripcion") ?? "").trim().slice(0, 1500);
  const textoPalabras = String(form.get("palabras") ?? "");
  const palabras = leerPalabras(textoPalabras);
  const departamentos = form
    .getAll("departamentos")
    .map(String)
    .filter((d) => LISTA_DEPARTAMENTOS.includes(d))
    .map(departamentoCrudo);
  const montoMinimo = monto(form.get("monto_minimo"));
  const montoMaximo = monto(form.get("monto_maximo"));

  // Si hay error devolvemos lo escrito, para no borrar el formulario
  const campos = { nombre, descripcion, palabras: textoPalabras };
  if (!nombre) return { error: "Escribe el nombre de tu empresa.", campos };
  if (!palabras.length) return { error: "Agrega al menos una palabra clave: es lo que el radar busca en las licitaciones.", campos };
  if (montoMinimo && montoMaximo && montoMinimo > montoMaximo) {
    return { error: "El monto mínimo no puede ser mayor que el máximo.", campos };
  }

  let empresa = await miEmpresa(supabase);
  if (!empresa) {
    const { data: id, error } = await supabase.rpc("crear_empresa", { nombre, descripcion: descripcion || null });
    if (error || !id) return { error: "No pudimos crear tu empresa. Intenta de nuevo.", campos };
    empresa = { id, nombre, descripcion, palabras_clave: [], departamentos: [], monto_minimo: null, monto_maximo: null };
  }

  const { error } = await supabase
    .from("empresas")
    .update({
      nombre,
      descripcion: descripcion || null,
      palabras_clave: palabras,
      departamentos,
      monto_minimo: montoMinimo,
      monto_maximo: montoMaximo,
    })
    .eq("id", empresa.id);
  if (error) return { error: "No se pudo guardar el perfil. Intenta de nuevo.", campos };

  redirect("/panel?vista=empresa");
}
