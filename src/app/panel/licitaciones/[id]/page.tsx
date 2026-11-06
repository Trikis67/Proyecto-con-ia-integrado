import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText, History, Sparkles } from "lucide-react";
import { Estado } from "@/components/estado";
import { exigirSesion } from "@/lib/sesion";
import {
  CATEGORIAS,
  departamento,
  formatearMonto,
  formatoFechaLarga,
  frase,
  haceCuanto,
  modalidadCorta,
  nombreArchivo,
  tituloPropio,
} from "@/lib/formato";
import type { DatosLicitacion } from "@/lib/guatecompras/ocds";
import type { Analisis } from "@/lib/ia/analizar";
import { AnalizarIA } from "./analizar-ia";
import { PanelAnalisis } from "./panel-analisis";
import { EvaluarEncaje } from "./encaje";
import { miEmpresa } from "@/lib/empresa";

export const metadata: Metadata = { title: "Licitación" };

type Licitacion = {
  id: string;
  nog: string | null;
  titulo: string;
  entidad: string | null;
  departamento: string | null;
  modalidad: string | null;
  estado_detalle: string | null;
  categoria: string | null;
  fecha_publicacion: string | null;
  fecha_cierre: string | null;
  fecha_fuente: string | null;
  url: string | null;
  monto_adjudicado: number | null;
  moneda: string | null;
  datos: DatosLicitacion;
  titulo_ia: string | null;
  analisis_ia: Analisis | null;
  monto_estimado_ia: number | null;
  fecha_cierre_ia: string | null;
  ia_documento: string | null;
  ia_analizado_en: string | null;
};

type Coincidencia = {
  puntaje: number | null;
  veredicto: "conviene" | "revisar" | "no_conviene" | null;
  razones: { resumen?: string; a_favor?: string[]; en_contra?: string[]; que_falta?: string[] } | null;
  evaluado_en: string | null;
};

type Version = { id: string; resumen_cambio: string | null; detectado_en: string; cambios: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function PaginaLicitacion({ params }: PageProps<"/panel/licitaciones/[id]">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-8">
      <Link href="/panel" className="inline-flex items-center gap-1.5 text-sm text-tinta-2 no-underline hover:text-tinta">
        <ArrowLeft className="size-4" /> Licitaciones
      </Link>
      <Suspense fallback={<div className="mt-8 h-40 animate-pulse rounded-2xl bg-papel-2" aria-busy="true" />}>
        <Detalle params={params} />
      </Suspense>
    </main>
  );
}

async function Detalle({ params }: Pick<PageProps<"/panel/licitaciones/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSesion(`/panel/licitaciones/${id}`);

  const [{ data: lic }, { data: versiones }] = await Promise.all([
    supabase
      .from("licitaciones")
      .select(
        "id, nog, titulo, entidad, departamento, modalidad, estado_detalle, categoria, fecha_publicacion, fecha_cierre, fecha_fuente, url, monto_adjudicado, moneda, datos, titulo_ia, analisis_ia, monto_estimado_ia, fecha_cierre_ia, ia_documento, ia_analizado_en",
      )
      .eq("id", id)
      .maybeSingle<Licitacion>(),
    supabase
      .from("versiones_licitacion")
      .select("id, resumen_cambio, detectado_en, cambios")
      .eq("licitacion_id", id)
      .order("detectado_en", { ascending: false })
      .limit(30)
      .returns<Version[]>(),
  ]);
  if (!lic) notFound();

  const empresa = await miEmpresa(supabase);
  const { data: encaje } = empresa
    ? await supabase
        .from("coincidencias")
        .select("puntaje, veredicto, razones, evaluado_en")
        .eq("empresa_id", empresa.id)
        .eq("licitacion_id", id)
        .maybeSingle<Coincidencia>()
    : { data: null };

  const d = lic.datos;
  // La IA escribe el título bien (nombres propios incluidos); sin análisis, la regla de formato
  const titulo = lic.titulo_ia ?? frase(lic.titulo);
  const depto = departamento(lic.departamento);
  const municipio = d.comprador.municipio && tituloPropio(d.comprador.municipio);
  const lugar = [
    lic.entidad && tituloPropio(lic.entidad),
    d.comprador.unidad && tituloPropio(d.comprador.unidad),
    // «Escuintla, Escuintla» → «Escuintla»
    [municipio, depto].filter((x, i, xs) => x && xs.findIndex((y) => y?.toLowerCase() === x.toLowerCase()) === i).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  const hechos: [string, string | null][] = [
    ["Modalidad", modalidadCorta(lic.modalidad)],
    ["Tipo", lic.categoria ? (CATEGORIAS[lic.categoria] ?? lic.categoria) : null],
    ["Publicada", formatoFechaLarga(lic.fecha_publicacion)],
    [
      "Cierre",
      lic.fecha_cierre
        ? formatoFechaLarga(lic.fecha_cierre)
        : lic.fecha_cierre_ia
          ? `${formatoFechaLarga(lic.fecha_cierre_ia)} (según las bases)`
          : "No viene en los datos; está en las bases",
    ],
    ["Monto estimado", lic.monto_estimado_ia != null ? `${formatearMonto(lic.monto_estimado_ia)} (según las bases)` : null],
    ["Ofertas recibidas", String(d.ofertas.length)],
    ["Monto adjudicado", lic.monto_adjudicado != null ? formatearMonto(lic.monto_adjudicado, lic.moneda) : null],
  ];

  return (
    <article className="mt-6">
      <header className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <Estado valor={lic.estado_detalle} />
          {lic.nog && <span className="cifras font-mono text-sm text-tinta-2">NOG {lic.nog}</span>}
        </div>
        <h1
          className={`mt-3 font-display font-medium leading-tight tracking-[-0.02em] text-balance ${
            // Hay títulos de 300 caracteres: a ese largo el tamaño display deja de ayudar
            titulo.length > 110 ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"
          }`}
        >
          {titulo}
        </h1>
        <p className="mt-3 text-tinta-2">{lugar}</p>
        {lic.url && (
          <a
            href={lic.url}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-linea px-4 py-2 text-sm font-medium no-underline transition-colors hover:bg-papel-2"
          >
            Ver en Guatecompras <ArrowUpRight className="size-4" />
          </a>
        )}
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="titulo-ia" className="rounded-2xl bg-papel-2/70 p-6 ring-1 ring-linea">
            <h2 id="titulo-ia" className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-sello" /> Análisis con IA
            </h2>
            {lic.analisis_ia ? (
              <div className="mt-5">
                <PanelAnalisis analisis={lic.analisis_ia} documento={lic.ia_documento} analizadoEn={lic.ia_analizado_en} />
              </div>
            ) : (
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-tinta-2">
                Guatecompras no publica el monto, la fecha de cierre ni los requisitos en sus datos: están en las bases. Sube
                el PDF y la IA te los resume, con la página donde lo dice.
              </p>
            )}
            <div className={lic.analisis_ia ? "mt-6 border-t border-linea pt-5" : "mt-5"}>
              {lic.analisis_ia && <p className="mb-3 text-sm text-tinta-2">¿Tienes otro documento de esta licitación?</p>}
              <AnalizarIA id={lic.id} yaAnalizada={Boolean(lic.analisis_ia)} />
            </div>
          </section>

          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {hechos
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-tinta-2">{k}</dt>
                  <dd className="cifras mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
          </dl>

          <section>
            <h2 className="font-semibold">Qué piden ({d.items.length})</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-linea">
              <table className="w-full text-left text-sm">
                <thead className="bg-papel-2 text-tinta-2">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Ítem</th>
                    <th className="px-4 py-2.5 text-right font-medium">Cantidad</th>
                    <th className="px-4 py-2.5 font-medium">Unidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {d.items.map((it, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{it.descripcion}</p>
                        {it.caracteristicas && <p className="mt-0.5 max-w-[60ch] text-tinta-2">{it.caracteristicas.replace(/;\s*$/, "")}</p>}
                      </td>
                      <td className="cifras px-4 py-3 text-right">{it.cantidad?.toLocaleString("es-GT") ?? "—"}</td>
                      <td className="px-4 py-3 text-tinta-2">{it.unidad ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {d.adjudicaciones.length > 0 && (
            <section>
              <h2 className="font-semibold">Adjudicación</h2>
              <ul className="mt-3 divide-y divide-linea border-y border-linea">
                {d.adjudicaciones.map((a, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2 py-3">
                    <span>{a.proveedores.map(tituloPropio).join(", ") || "Proveedor sin nombre"}</span>
                    <span className="cifras font-medium">{a.monto != null ? formatearMonto(a.monto, a.moneda) : "—"}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.ofertas.length > 0 && (
            <section>
              <h2 className="font-semibold">Quién ofertó ({d.ofertas.length})</h2>
              <p className="mt-2 max-w-[70ch] leading-relaxed text-tinta-2">{d.ofertas.map(tituloPropio).join(" · ")}</p>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="titulo-encaje">
            <h2 id="titulo-encaje" className="font-semibold">
              {empresa ? `Encaje con ${empresa.nombre}` : "¿Te conviene?"}
            </h2>
            {!empresa ? (
              <p className="mt-2 text-sm leading-relaxed text-tinta-2">
                <Link href="/panel/empresa" className="underline">
                  Crea el perfil de tu empresa
                </Link>{" "}
                y la IA te dirá si esta licitación te conviene y por qué.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {encaje?.puntaje != null && (
                  <div className="space-y-3">
                    <p className="flex items-baseline gap-3">
                      <span className="cifras font-display text-4xl font-medium leading-none">{encaje.puntaje}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          encaje.veredicto === "conviene"
                            ? "bg-verde/12 text-verde"
                            : encaje.veredicto === "revisar"
                              ? "bg-sello-tenue text-sello-hondo"
                              : "bg-papel-2 text-tinta-2"
                        }`}
                      >
                        {encaje.veredicto === "conviene" ? "Te conviene" : encaje.veredicto === "revisar" ? "Revisar" : "No te conviene"}
                      </span>
                    </p>
                    {encaje.razones?.resumen && <p className="text-sm leading-relaxed">{encaje.razones.resumen}</p>}
                    {(
                      [
                        ["A favor", encaje.razones?.a_favor, "text-verde"],
                        ["En contra", encaje.razones?.en_contra, "text-sello-hondo"],
                        ["Te falta saber", encaje.razones?.que_falta, "text-tinta-2"],
                      ] as const
                    ).map(([titulo, lista, tono]) =>
                      lista?.length ? (
                        <div key={titulo}>
                          <h3 className={`text-xs font-semibold uppercase tracking-wide ${tono}`}>{titulo}</h3>
                          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-tinta-2 marker:text-linea">
                            {lista.map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null,
                    )}
                    {encaje.evaluado_en && <p className="text-xs text-tinta-2">Evaluado {haceCuanto(encaje.evaluado_en)}</p>}
                  </div>
                )}
                <EvaluarEncaje id={lic.id} yaEvaluada={encaje?.puntaje != null} />
                {lic.analisis_ia == null && (
                  <p className="text-xs leading-relaxed text-tinta-2">Si primero analizas las bases, la evaluación considera requisitos y garantías.</p>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-semibold">
              <FileText className="size-4 text-tinta-2" /> Documentos ({d.documentos.length})
            </h2>
            <ul className="mt-3 space-y-2.5">
              {d.documentos.map((doc) => {
                const archivo = nombreArchivo(doc.url);
                return (
                  <li key={doc.url}>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="group block text-sm leading-snug no-underline">
                      <span className="text-tinta underline decoration-linea group-hover:decoration-tinta">{doc.titulo}</span>
                      {/* Varios documentos se llaman igual («Bases…»): el nombre del archivo los distingue */}
                      {archivo && <span className="mt-0.5 block truncate text-xs text-tinta-2" title={archivo}>{archivo}</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-tinta-2">
              Guatecompras no deja descargarlos automáticamente: ábrelos aquí, bájalos y súbelos en «Análisis con IA».
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-semibold">
              <History className="size-4 text-tinta-2" /> Historial
            </h2>
            <ol className="mt-4 space-y-5 border-l border-linea pl-5">
              {(versiones ?? []).map((v, i) => (
                <li key={v.id} className="relative">
                  <span
                    className={`absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full ring-4 ring-papel ${i === 0 && v.cambios ? "bg-sello" : "bg-linea"}`}
                    aria-hidden
                  />
                  <p className="text-sm leading-relaxed">{v.resumen_cambio}</p>
                  <p className="mt-0.5 text-xs text-tinta-2" title={formatoFechaLarga(v.detectado_en)}>
                    {/* La primera versión es la publicación: su fecha real es la de Guatecompras, no la del radar */}
                    {v.cambios ? `Detectado ${haceCuanto(v.detectado_en)}` : formatoFechaLarga(lic.fecha_publicacion)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </article>
  );
}
