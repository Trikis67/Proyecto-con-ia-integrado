/**
 * Convierte los registros OCDS de Guatecompras a lo que guarda Triki Radar.
 * Solo nos quedamos con lo que sirve para el radar: el registro completo pesa
 * ~6 KB (direcciones, contactos...) y el plan gratis de Supabase tiene 500 MB.
 */
import { createHash } from "node:crypto";
import { limpiarHtml } from "../formato";

// ─── Tipos OCDS (solo lo que leemos) ──────────────────────────────
type Valor = { amount?: number; currency?: string };
type Documento = { title?: string; documentTypeDetails?: string; url?: string; datePublished?: string };
type Item = {
  description?: string;
  quantity?: number;
  unit?: { name?: string };
  classification?: { scheme?: string; id?: string };
  attributes?: { name?: string; value?: string }[];
};
type Parte = {
  id?: string;
  name?: string;
  roles?: string[];
  memberOf?: { id?: string; name?: string }[];
  address?: { region?: string; locality?: string };
};
type Adjudicacion = {
  title?: string;
  status?: string;
  statusDetails?: string;
  date?: string;
  value?: Valor;
  suppliers?: { id?: string; name?: string }[];
};

export type ReleaseCompilado = {
  ocid: string;
  date?: string;
  buyer?: { id?: string; name?: string };
  parties?: Parte[];
  tender?: {
    id?: string;
    title?: string;
    status?: string;
    statusDetails?: string;
    datePublished?: string;
    procuringEntity?: { name?: string };
    procurementMethod?: string;
    procurementMethodDetails?: string;
    mainProcurementCategory?: string;
    tenderPeriod?: { startDate?: string; endDate?: string };
    numberOfTenderers?: number;
    items?: Item[];
    documents?: Documento[];
    tenderers?: { name?: string }[];
  };
  awards?: Adjudicacion[];
};

export type RegistroOcds = { ocid: string; compiledRelease: ReleaseCompilado };

// ─── Lo que guardamos ─────────────────────────────────────────────
export type DatosLicitacion = {
  nog: string | null;
  fecha: string | null;
  titulo: string;
  modalidad: string | null;
  categoria: string | null;
  estado: string | null;
  estadoDetalle: string | null;
  comprador: { nombre: string | null; unidad: string | null; departamento: string | null; municipio: string | null };
  periodo: { inicio: string | null; fin: string | null };
  items: { descripcion: string; cantidad: number | null; unidad: string | null; unspsc: string | null; caracteristicas: string | null }[];
  documentos: { titulo: string; tipo: string | null; url: string; fecha: string | null }[];
  ofertas: string[];
  adjudicaciones: { titulo: string | null; estado: string | null; monto: number | null; moneda: string | null; proveedores: string[]; fecha: string | null }[];
};

export type FilaLicitacion = {
  fuente: "guatecompras";
  ocid: string;
  nog: string | null;
  nog_numero: number | null;
  titulo: string;
  entidad: string | null;
  modalidad: string | null;
  estado: string | null;
  estado_detalle: string | null;
  categoria: string | null;
  departamento: string | null;
  moneda: string;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
  url: string | null;
  datos: DatosLicitacion;
  huella: string;
  num_items: number;
  num_documentos: number;
  num_ofertas: number | null;
  monto_adjudicado: number | null;
  proveedores_adjudicados: string[] | null;
  fecha_fuente: string | null;
  texto_items: string | null;
};

/** Espacios normalizados y sin el HTML que a veces se cuela en Guatecompras (`<br />`, `&amp;`). */
const limpio = (s?: string | null) => {
  const t = s ? limpiarHtml(s) : "";
  return t ? t : null;
};

/** "GT-NOG-32560567" → "32560567" */
function nogDe(id?: string) {
  return id?.match(/(\d+)$/)?.[1] ?? null;
}

export function urlConcurso(nog: string | null) {
  return nog ? `https://www.guatecompras.gt/concursos/consultaConcurso.aspx?nog=${nog}` : null;
}

export function simplificar(c: ReleaseCompilado): DatosLicitacion {
  const t = c.tender ?? {};
  const compradoras = (c.parties ?? []).filter((p) => p.roles?.includes("buyer"));
  // La unidad compradora (la que es "miembro de" la institución) tiene la dirección real;
  // la institución casi siempre tiene la de su sede central en la capital.
  const unidad = compradoras.find((p) => p.memberOf?.length);
  const parteComprador = [unidad, ...compradoras].find((p) => p?.address?.region);

  return {
    nog: nogDe(t.id),
    fecha: c.date ?? null,
    titulo: limpio(t.title) ?? "(sin título)",
    modalidad: limpio(t.procurementMethodDetails),
    categoria: t.mainProcurementCategory ?? null,
    estado: t.status ?? null,
    estadoDetalle: limpio(t.statusDetails),
    comprador: {
      nombre: limpio(c.buyer?.name),
      unidad: unidad?.name !== c.buyer?.name ? limpio(unidad?.name) : null,
      departamento: limpio(parteComprador?.address?.region),
      municipio: limpio(parteComprador?.address?.locality),
    },
    periodo: { inicio: t.tenderPeriod?.startDate ?? null, fin: t.tenderPeriod?.endDate ?? null },
    items: (t.items ?? []).map((i) => ({
      descripcion: limpio(i.description) ?? "(sin descripción)",
      cantidad: i.quantity ?? null,
      unidad: limpio(i.unit?.name),
      unspsc: i.classification?.scheme === "UNSPSC" ? (i.classification.id ?? null) : null,
      caracteristicas: limpio(i.attributes?.find((a) => a.name === "Características")?.value),
    })),
    documentos: (t.documents ?? [])
      .filter((d) => d.url)
      .map((d) => ({ titulo: limpio(d.title) ?? "Documento", tipo: limpio(d.documentTypeDetails), url: d.url!, fecha: d.datePublished ?? null })),
    // Guatecompras repite licitantes: los dejamos únicos
    ofertas: [...new Set((t.tenderers ?? []).map((x) => limpio(x.name)).filter((x): x is string => Boolean(x)))],
    adjudicaciones: (c.awards ?? []).map((a) => ({
      titulo: limpio(a.title),
      estado: limpio(a.statusDetails) ?? a.status ?? null,
      monto: a.value?.amount ?? null,
      moneda: a.value?.currency ?? null,
      proveedores: (a.suppliers ?? []).map((s) => limpio(s.name)).filter((x): x is string => Boolean(x)),
      fecha: a.date ?? null,
    })),
  };
}

/** Huella estable: si cualquier dato que guardamos cambia, cambia la huella. */
export function huellaDe(datos: DatosLicitacion) {
  return createHash("sha256").update(JSON.stringify(datos)).digest("hex");
}

export function aFila(registro: RegistroOcds): FilaLicitacion {
  const c = registro.compiledRelease;
  const datos = simplificar(c);
  const montos = datos.adjudicaciones.map((a) => a.monto).filter((m): m is number => typeof m === "number");
  const proveedores = [...new Set(datos.adjudicaciones.flatMap((a) => a.proveedores))];
  const textoItems = [...new Set(datos.items.map((i) => i.descripcion))].join(" · ");

  return {
    fuente: "guatecompras",
    ocid: registro.ocid,
    nog: datos.nog,
    nog_numero: datos.nog ? Number(datos.nog) : null,
    titulo: datos.titulo,
    entidad: datos.comprador.nombre,
    modalidad: datos.modalidad,
    estado: datos.estado,
    estado_detalle: datos.estadoDetalle,
    categoria: datos.categoria,
    departamento: datos.comprador.departamento,
    moneda: datos.adjudicaciones.find((a) => a.moneda)?.moneda ?? "GTQ",
    fecha_publicacion: c.tender?.datePublished ?? null,
    fecha_cierre: datos.periodo.fin,
    url: urlConcurso(datos.nog),
    datos,
    huella: huellaDe(datos),
    num_items: datos.items.length,
    num_documentos: datos.documentos.length,
    num_ofertas: c.tender?.numberOfTenderers ?? null,
    monto_adjudicado: montos.length ? montos.reduce((a, b) => a + b, 0) : null,
    proveedores_adjudicados: proveedores.length ? proveedores : null,
    fecha_fuente: c.date ?? null,
    texto_items: textoItems || null,
  };
}
