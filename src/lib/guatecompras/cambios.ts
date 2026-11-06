/**
 * Compara dos versiones de una licitación y explica qué cambió, en español.
 * En la Fase 2 la IA reescribe este resumen con contexto ("esto te afecta porque…");
 * esta versión determinista es la base y el respaldo si la IA falla.
 */
import type { DatosLicitacion } from "./ocds";

export type Cambio =
  | { campo: "estado"; antes: string | null; despues: string | null }
  | { campo: "fecha_cierre"; antes: string | null; despues: string | null }
  | { campo: "titulo"; antes: string; despues: string }
  | { campo: "modalidad"; antes: string | null; despues: string | null }
  | { campo: "documentos"; agregados: string[]; quitados: string[] }
  | { campo: "items"; antes: number; despues: number }
  | { campo: "ofertas"; antes: number; despues: number; nuevas: string[] }
  | { campo: "adjudicacion"; proveedores: string[]; monto: number | null; moneda: string | null }
  | { campo: "otros" };

export function compararVersiones(antes: DatosLicitacion, despues: DatosLicitacion): Cambio[] {
  const cambios: Cambio[] = [];

  if (antes.estadoDetalle !== despues.estadoDetalle) {
    cambios.push({ campo: "estado", antes: antes.estadoDetalle, despues: despues.estadoDetalle });
  }
  if (antes.periodo.fin !== despues.periodo.fin) {
    cambios.push({ campo: "fecha_cierre", antes: antes.periodo.fin, despues: despues.periodo.fin });
  }
  if (antes.titulo !== despues.titulo) {
    cambios.push({ campo: "titulo", antes: antes.titulo, despues: despues.titulo });
  }
  if (antes.modalidad !== despues.modalidad) {
    cambios.push({ campo: "modalidad", antes: antes.modalidad, despues: despues.modalidad });
  }

  const urlsAntes = new Set(antes.documentos.map((d) => d.url));
  const urlsDespues = new Set(despues.documentos.map((d) => d.url));
  const agregados = despues.documentos.filter((d) => !urlsAntes.has(d.url)).map((d) => d.titulo);
  const quitados = antes.documentos.filter((d) => !urlsDespues.has(d.url)).map((d) => d.titulo);
  if (agregados.length || quitados.length) cambios.push({ campo: "documentos", agregados, quitados });

  if (antes.items.length !== despues.items.length) {
    cambios.push({ campo: "items", antes: antes.items.length, despues: despues.items.length });
  }

  if (antes.ofertas.length !== despues.ofertas.length) {
    const previas = new Set(antes.ofertas);
    cambios.push({
      campo: "ofertas",
      antes: antes.ofertas.length,
      despues: despues.ofertas.length,
      nuevas: despues.ofertas.filter((o) => !previas.has(o)),
    });
  }

  const clave = (a: DatosLicitacion["adjudicaciones"][number]) => `${a.proveedores.join("|")}#${a.monto}`;
  const adjAntes = new Set(antes.adjudicaciones.map(clave));
  for (const a of despues.adjudicaciones) {
    if (!adjAntes.has(clave(a))) {
      cambios.push({ campo: "adjudicacion", proveedores: a.proveedores, monto: a.monto, moneda: a.moneda });
    }
  }

  // La huella cambió pero por algo que no mostramos (p. ej. características de un ítem)
  if (!cambios.length) cambios.push({ campo: "otros" });
  return cambios;
}

const formatoFecha = new Intl.DateTimeFormat("es-GT", {
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Guatemala",
});

export function formatearMonto(monto: number, moneda: string | null = "GTQ") {
  const simbolo = !moneda || moneda === "GTQ" ? "Q" : moneda;
  return `${simbolo} ${monto.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const lista = (xs: string[]) =>
  xs.length <= 2 ? xs.join(" y ") : `${xs.slice(0, 2).join(", ")} y ${xs.length - 2} más`;

export function describirCambio(c: Cambio): string {
  switch (c.campo) {
    case "estado":
      return `Pasó de «${c.antes ?? "sin estado"}» a «${c.despues ?? "sin estado"}».`;
    case "fecha_cierre":
      if (!c.antes && c.despues) return `Ya tiene fecha de cierre: ${formatoFecha.format(new Date(c.despues))}.`;
      if (c.antes && !c.despues) return "Quitaron la fecha de cierre.";
      return `Cambió la fecha de cierre: del ${formatoFecha.format(new Date(c.antes!))} al ${formatoFecha.format(new Date(c.despues!))}.`;
    case "titulo":
      return `Cambiaron el título a «${c.despues}».`;
    case "modalidad":
      return `Cambió la modalidad a «${c.despues ?? "sin modalidad"}».`;
    case "documentos": {
      const partes: string[] = [];
      if (c.agregados.length) partes.push(`Subieron ${c.agregados.length === 1 ? "un documento" : `${c.agregados.length} documentos`}: ${lista(c.agregados)}.`);
      if (c.quitados.length) partes.push(`Quitaron ${c.quitados.length === 1 ? "un documento" : `${c.quitados.length} documentos`}: ${lista(c.quitados)}.`);
      return partes.join(" ");
    }
    case "items":
      return `Ahora pide ${c.despues} ${c.despues === 1 ? "ítem" : "ítems"} (antes ${c.antes}).`;
    case "ofertas":
      return c.nuevas.length
        ? `Recibió ${c.despues} ${c.despues === 1 ? "oferta" : "ofertas"}; nuevas de ${lista(c.nuevas)}.`
        : `Ahora tiene ${c.despues} ${c.despues === 1 ? "oferta" : "ofertas"} (antes ${c.antes}).`;
    case "adjudicacion":
      return `Se adjudicó a ${lista(c.proveedores) || "un proveedor"}${c.monto != null ? ` por ${formatearMonto(c.monto, c.moneda)}` : ""}.`;
    case "otros":
      return "Actualizaron detalles menores de la convocatoria.";
  }
}

export function resumirCambios(cambios: Cambio[]) {
  return cambios.map(describirCambio).join(" ");
}
