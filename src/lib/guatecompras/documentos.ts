/**
 * De todos los documentos de una licitación, cuáles son las bases que conviene darle a la IA.
 * Guatecompras no deja bajarlos automáticamente (verificación del navegador), así que se
 * los ofrecemos a la persona con enlace directo, en orden de utilidad.
 */
import type { DatosLicitacion } from "./ocds";

export type DocumentoBase = { titulo: string; url: string; archivo: string; formato: "pdf" | "word" | "otro" };

const archivoDe = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "").replace(/^\d+@/, "");
  } catch {
    return url;
  }
};

// Documentos que no sirven para decidir si ofertar: versión para la comisión, formatos, pedidos internos…
const DUDOSO = /comisi[oó]n|declaraci[oó]n|formulario|solicitud|pedido|siaf|dictamen|resoluci[oó]n|acta/;

function puntos(titulo: string, archivo: string) {
  const t = `${titulo} ${archivo}`.toLowerCase();
  let p = 0;
  if (/\bbases\b/.test(t)) p += 10;
  if (/t[eé]rmin[io]*os de referencia|terminos de referencia/.test(t)) p += 9;
  if (/especificaciones/.test(t)) p += 5;
  if (/convocatoria|invitaci[oó]n/.test(t)) p += 3;
  if (DUDOSO.test(archivo.toLowerCase())) p -= 8;
  return p;
}

/** Hasta 3 documentos, los más útiles primero. Los PDF primero: es lo que la IA puede leer. */
export function elegirBases(documentos: DatosLicitacion["documentos"]): DocumentoBase[] {
  const candidatos = documentos
    .map((d) => {
      const archivo = archivoDe(d.url);
      const ext = archivo.toLowerCase().split(".").pop();
      const formato: DocumentoBase["formato"] = ext === "pdf" ? "pdf" : ext === "doc" || ext === "docx" ? "word" : "otro";
      const dudoso = DUDOSO.test(archivo.toLowerCase());
      return { titulo: d.titulo, url: d.url.replace(/^http:\/\//, "https://"), archivo, formato, dudoso, p: puntos(d.titulo, archivo) };
    })
    .filter((d) => d.p > 0);
  // Si hay documentos claros, ocultamos los dudosos para no confundir
  const hayClaros = candidatos.some((d) => !d.dudoso);
  return candidatos
    .filter((d) => !hayClaros || !d.dudoso)
    .sort((a, b) => b.p - a.p || (a.formato === "pdf" ? -1 : 1))
    .slice(0, 3)
    .map((d): DocumentoBase => ({ titulo: d.titulo, url: d.url, archivo: d.archivo, formato: d.formato }));
}
