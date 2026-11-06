import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analizarLicitacion, MODELO } from "@/lib/ia/analizar";
import type { DatosLicitacion } from "@/lib/guatecompras/ocds";

// Leer unas bases largas puede tardar más de un minuto
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PDF_MB = 20;
// Cada análisis cuesta dinero: límite por persona para que nadie lo dispare sin querer
const ANALISIS_POR_DIA = 25;

const error = (mensaje: string, status: number) => NextResponse.json({ ok: false, error: mensaje }, { status });

export async function POST(request: NextRequest, { params }: RouteContext<"/api/licitaciones/[id]/analizar">) {
  const { id } = await params;
  if (!UUID.test(id)) return error("Licitación no válida.", 400);

  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const usuarioId = sesion?.claims?.sub;
  if (!usuarioId) return error("Tu sesión expiró. Vuelve a entrar.", 401);

  const admin = createAdminClient();
  const hace24h = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from("uso_ia")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("creado_en", hace24h);
  if ((count ?? 0) >= ANALISIS_POR_DIA) {
    return error(`Llegaste al límite de ${ANALISIS_POR_DIA} análisis por día. Vuelve a intentarlo mañana.`, 429);
  }

  // El PDF es opcional: sin él la IA trabaja solo con los datos de Guatecompras
  let pdf: { nombre: string; base64: string } | undefined;
  const form = await request.formData().catch(() => null);
  const archivo = form?.get("pdf");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_PDF_MB * 1024 * 1024) return error(`El PDF pesa más de ${MAX_PDF_MB} MB.`, 413);
    const bytes = Buffer.from(await archivo.arrayBuffer());
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return error("Ese archivo no es un PDF.", 415);
    pdf = { nombre: archivo.name.slice(0, 200), base64: bytes.toString("base64") };
  }

  // Leemos con el cliente de la sesión: así respetamos RLS para saber que la persona puede verla
  const { data: lic } = await supabase
    .from("licitaciones")
    .select("id, entidad, datos")
    .eq("id", id)
    .maybeSingle<{ id: string; entidad: string | null; datos: DatosLicitacion }>();
  if (!lic) return error("No encontramos esa licitación.", 404);

  const resultado = await analizarLicitacion({ datos: lic.datos, entidad: lic.entidad, pdf });

  await admin.from("uso_ia").insert({
    usuario_id: usuarioId,
    licitacion_id: id,
    modelo: resultado.ok ? resultado.modelo : MODELO,
    con_pdf: Boolean(pdf),
    tokens_entrada: resultado.tokensEntrada ?? null,
    tokens_salida: resultado.tokensSalida ?? null,
    costo_usd: resultado.costoUsd ?? null,
    error: resultado.ok ? null : resultado.error,
  });

  if (!resultado.ok) return error(resultado.error, 502);

  const a = resultado.analisis;
  const fechaCierre = a.fecha_cierre.fecha_hora && !Number.isNaN(Date.parse(a.fecha_cierre.fecha_hora)) ? a.fecha_cierre.fecha_hora : null;
  const { error: errorGuardar } = await admin
    .from("licitaciones")
    .update({
      titulo_ia: a.titulo_claro,
      resumen_ia: a.resumen,
      analisis_ia: a,
      monto_estimado_ia: a.monto_estimado.valor,
      fecha_cierre_ia: fechaCierre,
      ia_documento: pdf?.nombre ?? null,
      ia_analizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (errorGuardar) return error("El análisis salió bien pero no se pudo guardar. Intenta de nuevo.", 500);

  return NextResponse.json({ ok: true, analisis: a, costoUsd: resultado.costoUsd });
}
