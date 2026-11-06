import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Building2, ChevronLeft, ChevronRight, FileText, MapPin, Sparkles } from "lucide-react";
import type { Empresa } from "@/lib/empresa";
import { departamento, frase, haceCuanto, modalidadCorta, tituloPropio } from "@/lib/formato";
import { EvaluarLote } from "./evaluar-lote";

const POR_PAGINA = 25;

type Candidata = {
  id: string;
  nog: string | null;
  titulo: string;
  titulo_ia: string | null;
  entidad: string | null;
  departamento: string | null;
  modalidad: string | null;
  fecha_publicacion: string | null;
  num_documentos: number;
  puntaje_base: number;
  en_su_zona: boolean;
  puntaje_ia: number | null;
  veredicto: "conviene" | "revisar" | "no_conviene" | null;
  razones: { resumen?: string; a_favor?: string[]; en_contra?: string[] } | null;
  total: number;
};

const TONO_VEREDICTO = {
  conviene: "bg-verde/12 text-verde",
  revisar: "bg-sello-tenue text-sello-hondo",
  no_conviene: "bg-papel-2 text-tinta-2",
} as const;

export function SinPerfil() {
  return (
    <div className="mt-8 rounded-2xl bg-papel-2/70 px-6 py-12 text-center ring-1 ring-linea">
      <Building2 className="mx-auto size-8 text-tinta-3" strokeWidth={1.5} />
      <p className="mt-4 font-semibold">Cuéntale al radar qué vende tu empresa</p>
      <p className="mx-auto mt-1 max-w-md text-tinta-2">
        Con tus palabras clave y tus zonas, el radar separa de las miles de licitaciones las que te sirven, y la IA te dice cuáles conviene ofertar.
      </p>
      <Link
        href="/panel/empresa"
        className="mt-6 inline-flex rounded-xl bg-tinta px-5 py-2.5 text-sm font-medium text-papel no-underline transition-colors hover:bg-sello-hondo"
      >
        Crear perfil de empresa
      </Link>
    </div>
  );
}

export async function VistaEmpresa({ supabase, empresa, pagina }: { supabase: SupabaseClient; empresa: Empresa; pagina: number }) {
  const { data, error } = await supabase.rpc("candidatas", {
    p_empresa: empresa.id,
    p_limite: POR_PAGINA,
    p_desde: (pagina - 1) * POR_PAGINA,
  });

  if (error) {
    return (
      <p role="alert" className="mt-8 rounded-xl bg-sello-tenue p-4 text-sello-hondo">
        No pudimos calcular tus licitaciones ({error.message}). Revisa que la migración 0004 esté aplicada.
      </p>
    );
  }

  const filas = (data ?? []) as Candidata[];
  const total = filas[0]?.total ?? 0;
  const pendientes = filas.filter((f) => f.puntaje_ia == null).length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="mt-8" aria-label="Licitaciones para tu empresa">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-tinta-2">
          <span className="cifras font-medium text-tinta">{total.toLocaleString("es-GT")}</span> vigentes coinciden con{" "}
          <Link href="/panel/empresa" className="underline">
            {empresa.nombre}
          </Link>{" "}
          · {empresa.palabras_clave.slice(0, 4).join(", ")}
          {empresa.palabras_clave.length > 4 && "…"}
        </p>
        {total > 0 && <EvaluarLote pendientes={pendientes} />}
      </div>

      {!filas.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-linea px-6 py-14 text-center">
          <p className="font-semibold">Ninguna licitación vigente coincide por ahora</p>
          <p className="mx-auto mt-1 max-w-md text-tinta-2">
            Prueba con más palabras clave o sinónimos en{" "}
            <Link href="/panel/empresa" className="underline">
              tu perfil
            </Link>
            : por ejemplo «climatización» además de «aire acondicionado».
          </p>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-linea border-y border-linea">
          {filas.map((f) => {
            const puntaje = f.puntaje_ia ?? f.puntaje_base;
            return (
              <li key={f.id}>
                <Link
                  href={`/panel/licitaciones/${f.id}`}
                  className="group grid grid-cols-[3.25rem_1fr] gap-x-4 px-1 py-4 no-underline transition-colors duration-150 hover:bg-papel-2/70 md:grid-cols-[3.25rem_1fr_auto]"
                >
                  <div className="text-center" title={f.puntaje_ia != null ? "Encaje según la IA" : "Encaje estimado por palabras y zona"}>
                    <p className={`cifras font-display text-2xl font-medium leading-none ${f.puntaje_ia != null ? "text-tinta" : "text-tinta-2"}`}>
                      {puntaje}
                    </p>
                    <p className="mt-1 text-[0.68rem] leading-tight text-tinta-2">{f.puntaje_ia != null ? "IA" : "estimado"}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {f.veredicto && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONO_VEREDICTO[f.veredicto]}`}>
                          {f.veredicto === "conviene" ? "Te conviene" : f.veredicto === "revisar" ? "Revisar" : "No te conviene"}
                        </span>
                      )}
                      {f.nog && <span className="cifras font-mono text-xs text-tinta-2">NOG {f.nog}</span>}
                      {f.en_su_zona && empresa.departamentos.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-tinta-2">
                          <MapPin className="size-3" /> En tu zona
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1.5 line-clamp-2 font-medium leading-snug text-tinta group-hover:underline">
                      {f.titulo_ia ?? frase(f.titulo)}
                    </h2>
                    {f.razones?.resumen ? (
                      <p className="mt-1 flex gap-1.5 text-sm text-tinta-2">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-sello" /> <span className="line-clamp-2">{f.razones.resumen}</span>
                      </p>
                    ) : (
                      <p className="mt-1 truncate text-sm text-tinta-2">
                        {[f.entidad && tituloPropio(f.entidad), departamento(f.departamento), modalidadCorta(f.modalidad)].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="cifras col-start-2 mt-2 flex items-center gap-4 text-sm text-tinta-2 md:col-start-3 md:mt-0 md:flex-col md:items-end md:gap-1.5">
                    <span>{haceCuanto(f.fecha_publicacion)}</span>
                    <span className="flex items-center gap-1" title="Documentos">
                      <FileText className="size-3.5" /> {f.num_documentos}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {paginas > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? (
            <Link href={`/panel?vista=empresa&pagina=${pagina - 1}`} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-papel-2">
              <ChevronLeft className="size-4" /> Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="cifras text-tinta-2">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={`/panel?vista=empresa&pagina=${pagina + 1}`} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-papel-2">
              Siguientes <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
