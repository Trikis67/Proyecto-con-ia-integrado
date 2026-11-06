/** Cómo mostramos los datos de Guatecompras a una persona. */

const DEPARTAMENTOS: Record<string, string> = {
  "ALTA VERAPAZ": "Alta Verapaz",
  "BAJA VERAPAZ": "Baja Verapaz",
  CHIMALTENANGO: "Chimaltenango",
  CHIQUIMULA: "Chiquimula",
  "EL PROGRESO": "El Progreso",
  ESCUINTLA: "Escuintla",
  GUATEMALA: "Guatemala",
  HUEHUETENANGO: "Huehuetenango",
  IZABAL: "Izabal",
  JALAPA: "Jalapa",
  JUTIAPA: "Jutiapa",
  PETEN: "Petén",
  QUETZALTENANGO: "Quetzaltenango",
  QUICHE: "Quiché",
  "EL QUICHE": "Quiché",
  RETALHULEU: "Retalhuleu",
  SACATEPEQUEZ: "Sacatepéquez",
  "SAN MARCOS": "San Marcos",
  "SANTA ROSA": "Santa Rosa",
  SOLOLA: "Sololá",
  SUCHITEPEQUEZ: "Suchitepéquez",
  TOTONICAPAN: "Totonicapán",
  ZACAPA: "Zacapa",
};

export const LISTA_DEPARTAMENTOS = [...new Set(Object.values(DEPARTAMENTOS))].sort((a, b) => a.localeCompare(b, "es"));

/** Valor como lo guarda Guatecompras para un nombre bonito ("Sololá" → "SOLOLA"). */
export function departamentoCrudo(nombre: string) {
  return Object.entries(DEPARTAMENTOS).find(([, v]) => v === nombre)?.[0] ?? nombre.toUpperCase();
}

export function departamento(crudo: string | null) {
  if (!crudo) return null;
  return DEPARTAMENTOS[crudo.trim().toUpperCase()] ?? tituloPropio(crudo);
}

/*
 * Guatecompras escribe casi todo en MAYÚSCULAS. Para leerlo bien lo pasamos a minúsculas,
 * pero sin romper siglas (IGSS, PNC, BTU), números romanos ni códigos (placas, números de bien).
 * Si el texto ya viene con mayúsculas y minúsculas, se respeta tal cual.
 */
const SIGLAS = new Set(
  (
    "IGSS PNC SGAIA MSPAS MINEDUC MINGOB MINDEF MICIVI MAGA MARN MIDES MINEX MINFIN MINECO MINTRAB MCD MEM SOSEP SBS SEP " +
    "SAT RENAP TSE CSJ OJ MP PGN CC CGC CONRED INAB INFOM INDE EEGSA EMPAGUA USAC DGAE DIGAE CIV SIAF UNSPSC LCE " +
    "ONU OPS OMS UNICEF BID USAID FAO PNUD " +
    "BTU HP CPU GPU RAM SSD HDD USB LED LCD UPS GPS PC TV VGA HDMI PVC ISO IVA NIT DPI CUI GB TB MB KVA KW AC DC SA S/C S/S"
  ).split(" "),
);
const ROMANOS = /^(i{1,3}|iv|vi{0,3}|ix|xi{0,3}|xiv|xv|xx)$/i;
const MENORES = new Set(["de", "del", "la", "las", "los", "y", "e", "en", "el", "para", "por", "a", "al", "con", "o", "u", "sin", "un", "una"]);

const gritando = (t: string) => {
  const letras = t.replace(/[^\p{L}]/gu, "");
  return letras.length > 3 && letras.replace(/[^\p{Lu}]/gu, "").length / letras.length > 0.6;
};

/** Ajusta una palabra ya en minúsculas: siglas, romanos y códigos vuelven a mayúsculas. */
function ajustar(palabra: string): string | null {
  const mayus = palabra.toUpperCase();
  if (SIGLAS.has(mayus)) return mayus;
  // "sgaia/pnc": cada lado de la barra por separado
  if (palabra.includes("/")) {
    const partes = palabra.split("/").map((p) => ajustar(p));
    return partes.some(Boolean) ? palabra.split("/").map((p, i) => partes[i] ?? p).join("/") : null;
  }
  // Número + unidad: «3tons», «36000btu» → la unidad decide (BTU es sigla, tons no)
  const conUnidad = palabra.match(/^(\d+)(\p{L}+)$/u);
  if (conUnidad) return SIGLAS.has(conUnidad[2].toUpperCase()) ? conUnidad[1] + conUnidad[2].toUpperCase() : palabra;
  if (/\d/.test(palabra) && /\p{L}/u.test(palabra)) return mayus; // códigos: O0790BBH, 005E3F60
  if (ROMANOS.test(palabra) && palabra !== "vi" && palabra !== "di") return mayus;
  return null;
}

function transformar(texto: string, primeraDeCadaPalabra: boolean) {
  let inicioDeFrase = true;
  // Recorremos "palabras" (letras, números y / para S/C) y dejamos intacto lo demás
  return limpiarHtml(texto)
    .toLowerCase()
    .replace(/[\p{L}\p{N}/]+|[^\p{L}\p{N}/]+/gu, (trozo) => {
      if (!/[\p{L}\p{N}]/u.test(trozo)) {
        if (/[.:;!?]\s*$/.test(trozo)) inicioDeFrase = true;
        return trozo;
      }
      const fija = ajustar(trozo);
      const capitalizar = inicioDeFrase || (primeraDeCadaPalabra && !MENORES.has(trozo));
      inicioDeFrase = false;
      if (fija) return fija;
      return capitalizar ? trozo.charAt(0).toUpperCase() + trozo.slice(1) : trozo;
    });
}

/** Para nombres propios (entidades, proveedores): «Instituto Guatemalteco de Seguridad Social -IGSS-». */
export function tituloPropio(texto: string) {
  return gritando(texto) ? transformar(texto, true) : limpiarHtml(texto);
}

/** Para títulos de licitaciones: «Mantenimiento de aire acondicionado para el IGSS». */
export function frase(texto: string) {
  return gritando(texto) ? transformar(texto, false) : limpiarHtml(texto);
}

/** Guatecompras a veces deja etiquetas y entidades HTML en los textos (`<br />`, `&amp;`). */
export function limpiarHtml(texto: string) {
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** "…/32560567@3.%20CONVOCATORIA%20NOG%2032560567.pdf" → "3. CONVOCATORIA NOG 32560567.pdf" */
export function nombreArchivo(url: string) {
  try {
    const ultimo = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    return ultimo.replace(/^\d+@/, "") || null;
  } catch {
    return null;
  }
}

export function modalidadCorta(m: string | null) {
  if (!m) return null;
  if (/Compra Directa con Oferta/i.test(m)) return "Compra directa";
  if (/Licitaci[oó]n P[uú]blica/i.test(m)) return "Licitación pública";
  if (/Cotizaci[oó]n/i.test(m)) return "Cotización";
  if (/Ausencia de Oferta/i.test(m)) return "Directa por ausencia de oferta";
  if (/art[ií]culo 54/i.test(m)) return "Art. 54 LCE";
  if (/Arrendamiento/i.test(m)) return "Arrendamiento";
  if (/Entidades P[uú]blicas/i.test(m)) return "Entre entidades públicas";
  if (/proveedor [uú]nico/i.test(m)) return "Proveedor único";
  return m.replace(/\s*\(.*\)\s*$/, "");
}

export const ESTADOS = ["Vigente", "Evaluación", "Adjudicado", "Desierto", "Prescindido", "No adjudicado"] as const;

export function tonoEstado(estado: string | null): "abierta" | "proceso" | "cerrada" | "apagada" {
  if (estado === "Vigente") return "abierta";
  if (estado === "Evaluación") return "proceso";
  if (estado === "Adjudicado") return "cerrada";
  return "apagada";
}

export const CATEGORIAS: Record<string, string> = { goods: "Bienes", services: "Servicios", works: "Obras" };

const zona = "America/Guatemala";
const fechaCorta = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", timeZone: zona });
const fechaLarga = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: zona });
const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export const formatoFechaCorta = (iso: string | null) => (iso ? fechaCorta.format(new Date(iso)) : "—");
export const formatoFechaLarga = (iso: string | null) => (iso ? fechaLarga.format(new Date(iso)) : "—");

export function haceCuanto(iso: string | null, ahora = Date.now()) {
  if (!iso) return "—";
  const min = Math.round((new Date(iso).getTime() - ahora) / 60000);
  if (Math.abs(min) < 60) return relativo.format(min, "minute");
  const horas = Math.round(min / 60);
  if (Math.abs(horas) < 24) return relativo.format(horas, "hour");
  const dias = Math.round(horas / 24);
  if (Math.abs(dias) < 30) return relativo.format(dias, "day");
  return formatoFechaCorta(iso);
}

export { formatearMonto } from "./guatecompras/cambios";
