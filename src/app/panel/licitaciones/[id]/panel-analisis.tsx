import { CircleAlert, CircleCheck, Sparkles } from "lucide-react";
import type { Analisis, AnalisisGuardado } from "@/lib/ia/analizar";
import { formatearMonto, formatoFechaLarga, haceCuanto } from "@/lib/formato";

const TIPOS_REQUISITO: Record<Analisis["requisitos"][number]["tipo"], string> = {
  legal: "Legales",
  tecnico: "Técnicos",
  experiencia: "Experiencia",
  financiero: "Financieros",
  otro: "Otros",
};

/** «pág. 4», y con varios PDFs también de cuál: «pág. 4 · TERMINOS DE REFERENCIA…» */
function Pag({ n, doc, varios }: { n: number | null; doc?: string | null; varios?: boolean }) {
  if (n == null && !(varios && doc)) return null;
  const corto = doc ? doc.replace(/^d+@/, "").replace(/.pdf$/i, "") : null;
  return (
    <span className="cifras ml-1.5 text-xs text-tinta-2" title={doc ?? undefined}>
      {n != null && <span className="whitespace-nowrap">pág. {n}</span>}
      {varios && corto && (
        <>
          {n != null && " · "}
          <span className="inline-block max-w-[18ch] truncate align-bottom">{corto}</span>
        </>
      )}
    </span>
  );
}

export function PanelAnalisis({
  analisis: a,
  documento,
  analizadoEn,
}: {
  analisis: AnalisisGuardado;
  documento: string | null;
  analizadoEn: string | null;
}) {
  // Con un solo PDF basta la página; con varios también decimos de qué archivo salió cada dato
  const varios = (a.documentos_analizados?.length ?? 0) > 1;
  const claves: { etiqueta: string; valor: string | null; pagina: number | null; doc?: string | null; cita?: string | null }[] = [
    {
      etiqueta: "Monto estimado",
      valor: a.monto_estimado.valor != null ? formatearMonto(a.monto_estimado.valor, a.monto_estimado.moneda ?? "GTQ") : null,
      pagina: a.monto_estimado.pagina,
      doc: a.monto_estimado.documento,
      cita: a.monto_estimado.cita,
    },
    {
      etiqueta: "Cierre para ofertar",
      valor: a.fecha_cierre.fecha_hora ? formatoFechaLarga(a.fecha_cierre.fecha_hora) : null,
      pagina: a.fecha_cierre.pagina,
      doc: a.fecha_cierre.documento,
      cita: a.fecha_cierre.cita,
    },
    { etiqueta: "Visita técnica", valor: a.visita_tecnica, pagina: null },
    { etiqueta: "Plazo de entrega", valor: a.plazo_entrega, pagina: null },
  ];
  const porTipo = Object.entries(Object.groupBy(a.requisitos, (r) => r.tipo)) as [keyof typeof TIPOS_REQUISITO, Analisis["requisitos"]][];

  return (
    <div className="space-y-8">
      <div>
        <p className="max-w-[65ch] text-lg leading-relaxed">{a.resumen}</p>
        {a.rubros.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-2">
            {a.rubros.map((r) => (
              <span key={r} className="rounded-full bg-papel px-3 py-1 text-xs font-medium text-tinta-2 ring-1 ring-linea">
                {r}
              </span>
            ))}
          </p>
        )}
      </div>

      {a.alertas.length > 0 && (
        <ul className="space-y-2 rounded-xl bg-sello-tenue p-4">
          {a.alertas.map((alerta) => (
            <li key={alerta} className="flex gap-2.5 text-sm leading-relaxed text-sello-hondo">
              <CircleAlert className="mt-0.5 size-4 shrink-0" /> {alerta}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {claves.map((c) => (
          <div key={c.etiqueta}>
            <dt className="text-sm text-tinta-2">{c.etiqueta}</dt>
            <dd className="cifras mt-0.5 font-medium">
              {c.valor ?? <span className="font-normal text-tinta-2">No lo dice</span>}
              {c.valor && <Pag n={c.pagina} doc={c.doc} varios={varios} />}
            </dd>
            {c.valor && c.cita && <dd className="mt-1 text-xs italic leading-relaxed text-tinta-2">«{c.cita}»</dd>}
          </div>
        ))}
      </dl>

      {a.requisitos.length > 0 && (
        <section>
          <h3 className="font-semibold">Requisitos ({a.requisitos.length})</h3>
          <div className="mt-3 space-y-5">
            {porTipo.map(([tipo, lista]) => (
              <div key={tipo}>
                <h4 className="text-sm font-medium text-tinta-2">{TIPOS_REQUISITO[tipo]}</h4>
                <ul className="mt-2 space-y-2">
                  {lista.map((r, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <CircleCheck className={`mt-0.5 size-4 shrink-0 ${r.obligatorio ? "text-tinta" : "text-tinta-3"}`} />
                      <span>
                        {r.descripcion}
                        {!r.obligatorio && <span className="ml-1.5 text-xs text-tinta-2">(opcional)</span>}
                        <Pag n={r.pagina} doc={r.documento} varios={varios} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {a.garantias.length > 0 && (
        <section>
          <h3 className="font-semibold">Garantías y fianzas</h3>
          <ul className="mt-3 divide-y divide-linea border-y border-linea">
            {a.garantias.map((g, i) => (
              <li key={i} className="py-3 text-sm">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{g.tipo}</span>
                  {g.porcentaje != null && <span className="cifras font-medium">{g.porcentaje}%</span>}
                </p>
                <p className="mt-0.5 leading-relaxed text-tinta-2">
                  {g.descripcion}
                  <Pag n={g.pagina} doc={g.documento} varios={varios} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.documentos_requeridos.length > 0 && (
        <section>
          <h3 className="font-semibold">Documentos que hay que presentar ({a.documentos_requeridos.length})</h3>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed marker:text-tinta-2">
            {a.documentos_requeridos.map((d, i) => (
              <li key={i}>
                {d.nombre}
                <Pag n={d.pagina} doc={d.documento} varios={varios} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {a.criterios_evaluacion.length > 0 && (
        <section>
          <h3 className="font-semibold">Cómo se califica</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {a.criterios_evaluacion.map((c, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{c.criterio}</span>
                {c.peso_porcentaje != null && <span className="cifras font-medium">{c.peso_porcentaje}%</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-start gap-2 border-t border-linea pt-4 text-xs leading-relaxed text-tinta-2">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Análisis con IA {documento ? <>de «{documento}»</> : "solo con los datos de Guatecompras"}
          {analizadoEn && <> · {haceCuanto(analizadoEn)}</>} · Confianza {a.confianza}. Puede equivocarse: verifica en las bases
          oficiales antes de ofertar.
        </span>
      </p>
    </div>
  );
}
