/**
 * Recolector de Guatecompras.
 *
 * Guatecompras publica un ZIP por mes (https://ocds.guatecompras.gt/descarga-datos)
 * y lo regenera cada día. Por cada corrida:
 *   1. Baja el ZIP del mes y lo abre en memoria.
 *   2. Calcula la huella de cada proceso y la compara con la guardada.
 *   3. Inserta lo nuevo, actualiza lo que cambió y guarda una versión con el diff.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { unzipSync, strFromU8 } from "fflate";
import { aFila, type DatosLicitacion, type FilaLicitacion, type RegistroOcds } from "./ocds";
import { compararVersiones, resumirCambios } from "./cambios";

export const AGENTE = "TrikiRadar/0.1 (+https://trikis.nl)";
const LOTE = 400;

export type Periodo = { anio: number; mes: number };
export const etiquetaPeriodo = ({ anio, mes }: Periodo) => `${anio}-${String(mes).padStart(2, "0")}`;

export type Resultado = { periodo: string; procesadas: number; nuevas: number; cambiadas: number; sinCambios: number };

/** Baja y descomprime el archivo OCDS de un mes. */
export async function descargarPeriodo({ anio, mes }: Periodo): Promise<RegistroOcds[]> {
  const url = `https://ocds.guatecompras.gt/file/json/${anio}/${mes}`;
  const res = await fetch(url, { headers: { "User-Agent": AGENTE } });
  if (!res.ok) throw new Error(`Guatecompras respondió ${res.status} al pedir ${url}`);
  return leerZip(new Uint8Array(await res.arrayBuffer()));
}

export function leerZip(zip: Uint8Array): RegistroOcds[] {
  const archivos = unzipSync(zip, { filter: (f) => f.name.endsWith(".json") });
  const nombre = Object.keys(archivos)[0];
  if (!nombre) throw new Error("El ZIP no trae ningún .json");
  return leerJson(strFromU8(archivos[nombre]));
}

export function leerJson(texto: string): RegistroOcds[] {
  const paquete = JSON.parse(texto) as { records?: RegistroOcds[] };
  if (!Array.isArray(paquete.records)) throw new Error("El archivo no tiene el formato de paquete de registros OCDS");
  return paquete.records.filter((r) => r.ocid && r.compiledRelease);
}

const trozos = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

type Existente = { id: string; ocid: string; huella: string };

/**
 * Compara los registros con la base y guarda las diferencias.
 * `supabase` debe usar la clave secreta: las licitaciones solo las escribe el recolector.
 */
export async function guardarRegistros(
  supabase: SupabaseClient,
  periodo: string,
  registros: RegistroOcds[],
  log: (m: string) => void = () => {},
  opciones: {
    /**
     * Cambió nuestro código (cómo leemos el OCDS), no la licitación: actualiza filas y
     * huellas sin escribir versiones, para no llenar el historial de cambios falsos.
     * Ojo: si de verdad cambió algo en Guatecompras desde la última corrida, tampoco queda en el historial.
     */
    reprocesar?: boolean;
  } = {},
): Promise<Resultado> {
  // Reprocesar no es una revisión de Guatecompras: no aparece en «Revisado hace…» del panel
  const { data: corrida } = opciones.reprocesar
    ? { data: null }
    : await supabase.from("corridas_recolector").insert({ periodo }).select("id").single();

  try {
    // Un mismo ocid puede venir repetido: gana el último
    const filas = [...new Map(registros.map((r) => [r.ocid, aFila(r)])).values()];
    let nuevas = 0;
    let cambiadas = 0;

    for (const [i, lote] of trozos(filas, LOTE).entries()) {
      const { data: existentes, error } = await supabase
        .from("licitaciones")
        .select("id, ocid, huella")
        .eq("fuente", "guatecompras")
        .in("ocid", lote.map((f) => f.ocid));
      if (error) throw error;

      const porOcid = new Map((existentes as Existente[]).map((e) => [e.ocid, e]));
      const aInsertar = lote.filter((f) => !porOcid.has(f.ocid));
      const aActualizar = lote.filter((f) => porOcid.has(f.ocid) && porOcid.get(f.ocid)!.huella !== f.huella);

      // Para explicar el cambio necesitamos los datos anteriores
      const anteriores = new Map<string, DatosLicitacion>();
      if (aActualizar.length && !opciones.reprocesar) {
        const { data, error: e } = await supabase
          .from("licitaciones")
          .select("ocid, datos")
          .eq("fuente", "guatecompras")
          .in("ocid", aActualizar.map((f) => f.ocid));
        if (e) throw e;
        for (const d of data as { ocid: string; datos: DatosLicitacion }[]) anteriores.set(d.ocid, d.datos);
      }

      const cambiosPorOcid = new Map(
        aActualizar.map((f) => {
          const previo = anteriores.get(f.ocid);
          const cambios = previo ? compararVersiones(previo, f.datos) : [{ campo: "otros" as const }];
          return [f.ocid, cambios];
        }),
      );

      const tocadas: FilaLicitacion[] = [...aInsertar, ...aActualizar];
      if (tocadas.length) {
        const { data: guardadas, error: e } = await supabase
          .from("licitaciones")
          .upsert(
            tocadas.map((f) => ({ ...f, actualizado_en: new Date().toISOString() })),
            { onConflict: "fuente,ocid" },
          )
          .select("id, ocid");
        if (e) throw e;

        const idPorOcid = new Map((guardadas as { id: string; ocid: string }[]).map((g) => [g.ocid, g.id]));
        const conVersion = opciones.reprocesar ? aInsertar : tocadas;
        const versiones = conVersion.map((f) => {
          const cambios = cambiosPorOcid.get(f.ocid);
          return {
            licitacion_id: idPorOcid.get(f.ocid)!,
            huella: f.huella,
            // La versión vigente ya vive en licitaciones.datos y el diff en `cambios`:
            // copiar el registro entero aquí duplicaba el espacio (69 MB en dos meses).
            datos: {},
            cambios: cambios ?? null,
            resumen_cambio: cambios ? resumirCambios(cambios) : "Publicada en Guatecompras.",
          };
        });
        if (versiones.length) {
          const { error: ev } = await supabase.from("versiones_licitacion").insert(versiones);
          if (ev) throw ev;
        }
      }

      nuevas += aInsertar.length;
      cambiadas += aActualizar.length;
      log(`  lote ${i + 1}: ${aInsertar.length} nuevas, ${aActualizar.length} cambiadas`);
    }

    const resultado = { periodo, procesadas: filas.length, nuevas, cambiadas, sinCambios: filas.length - nuevas - cambiadas };
    if (corrida) {
      await supabase
        .from("corridas_recolector")
        .update({ terminada_en: new Date().toISOString(), procesadas: resultado.procesadas, nuevas, cambiadas })
        .eq("id", corrida.id);
    }
    return resultado;
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : JSON.stringify(e);
    if (corrida) {
      await supabase.from("corridas_recolector").update({ terminada_en: new Date().toISOString(), error: mensaje }).eq("id", corrida.id);
    }
    throw e;
  }
}

/** El mes actual y el anterior en hora de Guatemala: los procesos del mes pasado siguen cambiando. */
export function periodosRecientes(ahora = new Date()): Periodo[] {
  const [anio, mes] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit" })
    .format(ahora)
    .split("-")
    .map(Number);
  const anterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  return [anterior, { anio, mes }];
}
