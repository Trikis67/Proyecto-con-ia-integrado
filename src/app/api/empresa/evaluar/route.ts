import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { miEmpresa } from "@/lib/empresa";
import { evaluarEncaje } from "@/lib/ia/encaje";
import { MODELO, type Analisis } from "@/lib/ia/analizar";
import { llamadasRestantes, LLAMADAS_IA_POR_DIA } from "@/lib/ia/limite";
import type { DatosLicitacion } from "@/lib/guatecompras/ocds";

export const maxDuration = 120;

const POR_LOTE = 10;
const EN_PARALELO = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const error = (mensaje: string, status: number) => NextResponse.json({ ok: false, error: mensaje }, { status });

/**
 * Evalúa con IA el encaje de la empresa con licitaciones vigentes.
 * Cuerpo opcional `{ ids: string[] }`; sin ids, toma las mejores candidatas aún sin evaluar.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getClaims();
  const usuarioId = sesion?.claims?.sub;
  if (!usuarioId) return error("Tu sesión expiró. Vuelve a entrar.", 401);

  const empresa = await miEmpresa(supabase);
  if (!empresa) return error("Primero llena el perfil de tu empresa.", 400);

  const admin = createAdminClient();
  const restantes = await llamadasRestantes(admin, usuarioId);
  if (restantes === 0) return error(`Llegaste al límite de ${LLAMADAS_IA_POR_DIA} usos de la IA por día.`, 429);

  const cuerpo = (await request.json().catch(() => ({}))) as { ids?: unknown };
  let ids = Array.isArray(cuerpo.ids) ? cuerpo.ids.filter((x): x is string => typeof x === "string" && UUID.test(x)) : [];
  if (!ids.length) {
    const { data, error: e } = await supabase.rpc("candidatas", { p_empresa: empresa.id, p_limite: 40, p_desde: 0 });
    if (e) return error("No se pudieron cargar tus candidatas. ¿Aplicaste la migración 0004?", 500);
    ids = (data as { id: string; puntaje_ia: number | null }[]).filter((c) => c.puntaje_ia == null).map((c) => c.id);
  }
  ids = ids.slice(0, Math.min(POR_LOTE, restantes));
  if (!ids.length) return NextResponse.json({ ok: true, evaluadas: 0 });

  const { data: lics } = await supabase.from("licitaciones").select("id, entidad, datos, analisis_ia").in("id", ids);
  const porId = new Map(
    ((lics ?? []) as { id: string; entidad: string | null; datos: DatosLicitacion; analisis_ia: Analisis | null }[]).map((l) => [l.id, l]),
  );

  let evaluadas = 0;
  let fallidas = 0;
  // De a 5 en paralelo: rápido sin chocar con el límite de velocidad de la API
  for (let i = 0; i < ids.length; i += EN_PARALELO) {
    await Promise.all(
      ids.slice(i, i + EN_PARALELO).map(async (id) => {
        const lic = porId.get(id);
        if (!lic) return;
        const r = await evaluarEncaje({ empresa, licitacion: { entidad: lic.entidad, datos: lic.datos, analisis: lic.analisis_ia } });
        await admin.from("uso_ia").insert({
          usuario_id: usuarioId,
          licitacion_id: id,
          modelo: MODELO,
          con_pdf: false,
          tokens_entrada: r.tokensEntrada ?? null,
          tokens_salida: r.tokensSalida ?? null,
          costo_usd: r.costoUsd ?? null,
          error: r.ok ? null : r.error,
        });
        if (!r.ok) {
          fallidas++;
          return;
        }
        const { resumen, a_favor, en_contra, que_falta, desglose } = r.encaje;
        // Con el cliente de la sesión: RLS garantiza que solo escribe en su propia empresa.
        // No tocamos `estado`, para no perder el seguimiento que ya tenga.
        const { error: e } = await supabase.from("coincidencias").upsert(
          {
            empresa_id: empresa.id,
            licitacion_id: id,
            puntaje: r.encaje.puntaje,
            veredicto: r.encaje.veredicto,
            razones: { resumen, a_favor, en_contra, que_falta, desglose },
            evaluado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "empresa_id,licitacion_id" },
        );
        if (e) fallidas++;
        else evaluadas++;
      }),
    );
  }

  return NextResponse.json({ ok: true, evaluadas, fallidas });
}
