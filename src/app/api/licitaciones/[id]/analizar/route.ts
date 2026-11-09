import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analizarLicitacion, MODELO, type AnalisisGuardado, type PdfSubido } from "@/lib/ia/analizar";
import { llamadasRestantes, LLAMADAS_IA_POR_DIA } from "@/lib/ia/limite";
import type { DatosLicitacion } from "@/lib/guatecompras/ocds";
import { MAX_PDFS, MAX_TOTAL_MB } from "@/lib/ia/pdfs";

// Leer varias bases largas puede tardar más de un minuto
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const error = (mensaje: string, status: number) => NextResponse.json({ ok: false, error: mensaje }, { status });

/**
 * Analiza la licitación con IA. Cuerpo (multipart):
 * - `pdf`: 0 a 5 archivos PDF. Sin PDFs, la IA usa solo los datos de Guatecompras.
 * - `reiniciar=1`: descarta el análisis anterior. Si no, los PDFs nuevos se suman a él.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/licitaciones/[id]/analizar">) {
  const { id } = await params;
  if (!UUID.test(id)) return error("Licitación no válida.", 400);

  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const usuarioId = sesion?.claims?.sub;
  if (!usuarioId) return error("Tu sesión expiró. Vuelve a entrar.", 401);

  const admin = createAdminClient();
  if ((await llamadasRestantes(admin, usuarioId)) === 0) {
    return error(`Llegaste al límite de ${LLAMADAS_IA_POR_DIA} usos de la IA por día. Vuelve a intentarlo mañana.`, 429);
  }

  const form = await request.formData().catch(() => null);
  const archivos = (form?.getAll("pdf") ?? []).filter((a): a is File => a instanceof File && a.size > 0);
  const reiniciar = form?.get("reiniciar") === "1";
  if (archivos.length > MAX_PDFS) return error(`Puedes subir hasta ${MAX_PDFS} PDFs a la vez.`, 413);
  const totalMb = archivos.reduce((s, a) => s + a.size, 0) / 1024 / 1024;
  if (totalMb > MAX_TOTAL_MB) {
    return error(`Entre todos los PDFs pesan ${totalMb.toFixed(1)} MB; el máximo es ${MAX_TOTAL_MB} MB por envío. Súbelos en dos tandas.`, 413);
  }

  const pdfs: PdfSubido[] = [];
  for (const archivo of archivos) {
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return error(`«${archivo.name}» no es un PDF.`, 415);
    pdfs.push({ nombre: archivo.name.slice(0, 200), base64: bytes.toString("base64") });
  }

  // Leemos con el cliente de la sesión: así respetamos RLS para saber que la persona puede verla
  const { data: lic } = await supabase
    .from("licitaciones")
    .select("id, entidad, datos, analisis_ia, ia_documento")
    .eq("id", id)
    .maybeSingle<{ id: string; entidad: string | null; datos: DatosLicitacion; analisis_ia: AnalisisGuardado | null; ia_documento: string | null }>();
  if (!lic) return error("No encontramos esa licitación.", 404);

  // Guatecompras nombra los archivos «NOG@nombre.pdf»: si el NOG no coincide, avisamos sin gastar en la IA
  for (const pdf of pdfs) {
    const nogArchivo = pdf.nombre.match(/^(\d{6,})@/)?.[1];
    if (nogArchivo && lic.datos.nog && nogArchivo !== lic.datos.nog) {
      return error(`«${pdf.nombre}» es del NOG ${nogArchivo} y esta licitación es la ${lic.datos.nog}. Quítalo o súbelo en su licitación.`, 409);
    }
  }

  // Acumulativo: el análisis anterior entra como contexto y sus documentos se conservan
  const previo = reiniciar ? null : lic.analisis_ia;
  const anteriores = previo ? (previo.documentos_analizados ?? (lic.ia_documento ? [lic.ia_documento] : [])) : [];
  const documentos = [...new Set([...anteriores, ...pdfs.map((p) => p.nombre)])];

  const resultado = await analizarLicitacion({ datos: lic.datos, entidad: lic.entidad, pdfs, previo });

  await admin.from("uso_ia").insert({
    usuario_id: usuarioId,
    licitacion_id: id,
    modelo: resultado.ok ? resultado.modelo : MODELO,
    con_pdf: pdfs.length > 0,
    tokens_entrada: resultado.tokensEntrada ?? null,
    tokens_salida: resultado.tokensSalida ?? null,
    costo_usd: resultado.costoUsd ?? null,
    error: resultado.ok ? null : resultado.error,
  });

  if (!resultado.ok) return error(resultado.error, 502);

  const a: AnalisisGuardado = { ...resultado.analisis, documentos_analizados: documentos };
  const fechaCierre = a.fecha_cierre.fecha_hora && !Number.isNaN(Date.parse(a.fecha_cierre.fecha_hora)) ? a.fecha_cierre.fecha_hora : null;
  const { error: errorGuardar } = await admin
    .from("licitaciones")
    .update({
      titulo_ia: a.titulo_claro,
      resumen_ia: a.resumen,
      analisis_ia: a,
      monto_estimado_ia: a.monto_estimado.valor,
      fecha_cierre_ia: fechaCierre,
      ia_documento: documentos.length ? documentos.join(" · ").slice(0, 1000) : null,
      ia_analizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (errorGuardar) return error("El análisis salió bien pero no se pudo guardar. Intenta de nuevo.", 500);

  return NextResponse.json({ ok: true, documentos, costoUsd: resultado.costoUsd });
}
