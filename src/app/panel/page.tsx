import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Radar as RadarIcon, RefreshCw, Search, Users } from "lucide-react";
import { Estado } from "@/components/estado";
import { exigirSesion } from "@/lib/sesion";
import { miEmpresa } from "@/lib/empresa";
import { SinPerfil, VistaEmpresa } from "./vista-empresa";
import {
  departamento,
  departamentoCrudo,
  ESTADOS,
  haceCuanto,
  LISTA_DEPARTAMENTOS,
  modalidadCorta,
  frase,
  tituloPropio,
} from "@/lib/formato";

export const metadata: Metadata = { title: "Licitaciones" };

const POR_PAGINA = 25;

type Filtros = { q: string; estado: string; depto: string; pagina: number };

function leerFiltros(sp: Record<string, string | string[] | undefined>): Filtros {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const estado = uno(sp.estado);
  return {
    q: uno(sp.q).trim().slice(0, 120),
    // Por defecto lo que todavía se puede ganar
    estado: estado === "" && !("estado" in sp) ? "Vigente" : estado,
    depto: uno(sp.depto),
    pagina: Math.max(1, Number.parseInt(uno(sp.pagina), 10) || 1),
  };
}

export default function Panel({ searchParams }: PageProps<"/panel">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">Licitaciones</h1>
        <Suspense fallback={null}>
          <UltimaCorrida />
        </Suspense>
      </div>
      <Suspense fallback={<ListaCargando />}>
        <Cuerpo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** Con perfil de empresa, la vista por defecto es «Para mi empresa»; sin perfil, «Todas». */
async function Cuerpo({ searchParams }: Pick<PageProps<"/panel">, "searchParams">) {
  const sp = await searchParams;
  const { supabase } = await exigirSesion();
  const empresa = await miEmpresa(supabase);
  const vistaPedida = Array.isArray(sp.vista) ? sp.vista[0] : sp.vista;
  const vista = vistaPedida === "todas" || vistaPedida === "empresa" ? vistaPedida : empresa ? "empresa" : "todas";
  const filtros = leerFiltros(sp);

  return (
    <>
      <nav className="mt-8 flex gap-1 border-b border-linea" aria-label="Vistas">
        {(
          [
            ["empresa", empresa ? `Para ${empresa.nombre}` : "Para mi empresa"],
            ["todas", "Todas"],
          ] as const
        ).map(([clave, etiqueta]) => (
          <Link
            key={clave}
            href={`/panel?vista=${clave}`}
            aria-current={vista === clave ? "page" : undefined}
            className={`-mb-px max-w-[60vw] truncate border-b-2 px-3 pb-2.5 text-sm font-medium no-underline transition-colors ${
              vista === clave ? "border-sello text-tinta" : "border-transparent text-tinta-2 hover:text-tinta"
            }`}
          >
            {etiqueta}
          </Link>
        ))}
      </nav>
      {vista === "empresa" ? (
        empresa ? (
          <VistaEmpresa supabase={supabase} empresa={empresa} pagina={filtros.pagina} />
        ) : (
          <SinPerfil />
        )
      ) : (
        <>
          <FormularioFiltros filtros={filtros} />
          <Resultados filtros={filtros} />
        </>
      )}
    </>
  );
}

function FormularioFiltros({ filtros }: { filtros: Filtros }) {
  const campo =
    "rounded-xl border border-linea bg-papel px-3.5 py-2.5 text-sm text-tinta outline-none transition-[border-color,box-shadow] duration-200 focus:border-tinta focus:shadow-[0_0_0_4px_var(--sello-tenue)]";
  return (
    <form action="/panel" className="mt-6 grid grid-cols-2 gap-3 md:flex" role="search">
      <input type="hidden" name="vista" value="todas" />
      <label className="relative col-span-2 md:min-w-64 md:flex-1">
        <span className="sr-only">Buscar</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-tinta-3" />
        <input
          name="q"
          defaultValue={filtros.q}
          placeholder="Producto, servicio o entidad: «aire acondicionado», «IGSS»…"
          className={`${campo} w-full pl-10 placeholder:text-tinta-3`}
        />
      </label>
      <label>
        <span className="sr-only">Estado</span>
        <select name="estado" defaultValue={filtros.estado} className={`${campo} w-full`}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Departamento</span>
        <select name="depto" defaultValue={filtros.depto} className={`${campo} w-full`}>
          <option value="">Todo el país</option>
          {LISTA_DEPARTAMENTOS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <button className="col-span-2 rounded-xl bg-tinta px-5 py-2.5 text-sm font-medium text-papel transition-colors duration-200 hover:bg-sello-hondo">
        Filtrar
      </button>
    </form>
  );
}

async function UltimaCorrida() {
  const { supabase } = await exigirSesion();
  const { data } = await supabase
    .from("corridas_recolector")
    .select("terminada_en, nuevas, cambiadas, error")
    .not("terminada_en", "is", null)
    .order("terminada_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return (
    <p className="flex items-center gap-1.5 text-sm text-tinta-2">
      <RefreshCw className="size-3.5" />
      {data.error ? "La última revisión falló" : `Revisado ${haceCuanto(data.terminada_en)}`}
      {!data.error && (data.nuevas || data.cambiadas) ? ` · ${data.nuevas} nuevas, ${data.cambiadas} con cambios` : ""}
    </p>
  );
}

type FilaLista = {
  id: string;
  nog: string | null;
  titulo: string;
  titulo_ia: string | null;
  entidad: string | null;
  departamento: string | null;
  modalidad: string | null;
  estado_detalle: string | null;
  fecha_publicacion: string | null;
  fecha_fuente: string | null;
  num_documentos: number;
  num_ofertas: number | null;
};

async function Resultados({ filtros }: { filtros: Filtros }) {
  const { supabase } = await exigirSesion();

  let consulta = supabase
    .from("licitaciones")
    .select(
      "id, nog, titulo, titulo_ia, entidad, departamento, modalidad, estado_detalle, fecha_publicacion, fecha_fuente, num_documentos, num_ofertas",
      { count: "estimated" },
    );
  if (filtros.q) consulta = consulta.textSearch("busqueda", filtros.q, { type: "websearch", config: "spanish" });
  if (filtros.estado) consulta = consulta.eq("estado_detalle", filtros.estado);
  if (filtros.depto) consulta = consulta.eq("departamento", departamentoCrudo(filtros.depto));

  const desde = (filtros.pagina - 1) * POR_PAGINA;
  const { data, count, error } = await consulta
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .range(desde, desde + POR_PAGINA - 1);

  if (error) {
    return (
      <p role="alert" className="mt-10 rounded-xl bg-sello-tenue p-4 text-sello-hondo">
        No pudimos cargar las licitaciones ({error.message}). Recarga la página; si sigue igual, revisa que la migración 0002 esté aplicada.
      </p>
    );
  }

  const filas = (data ?? []) as FilaLista[];
  if (!filas.length) return <SinResultados hayFiltros={Boolean(filtros.q || filtros.estado || filtros.depto)} />;

  const total = count ?? filas.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const enlace = (pagina: number) => {
    const p = new URLSearchParams({ vista: "todas" });
    if (filtros.q) p.set("q", filtros.q);
    p.set("estado", filtros.estado);
    if (filtros.depto) p.set("depto", filtros.depto);
    if (pagina > 1) p.set("pagina", String(pagina));
    return `/panel?${p}`;
  };

  return (
    <section className="mt-8" aria-label="Resultados">
      <p className="cifras text-sm text-tinta-2">
        {total.toLocaleString("es-GT")} {total === 1 ? "licitación" : "licitaciones"}
        {filtros.q && <> para «{filtros.q}»</>}
      </p>
      <ol className="mt-3 divide-y divide-linea border-y border-linea">
        {filas.map((f) => (
          <li key={f.id}>
            <Link
              href={`/panel/licitaciones/${f.id}`}
              className="group grid gap-x-6 gap-y-2 px-1 py-4 no-underline transition-colors duration-150 hover:bg-papel-2/70 md:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Estado valor={f.estado_detalle} />
                  {f.nog && <span className="cifras font-mono text-xs text-tinta-2">NOG {f.nog}</span>}
                  {seActualizo(f) && <span className="text-xs font-medium text-sello-hondo">Con cambios</span>}
                </div>
                <h2 className="mt-1.5 line-clamp-2 font-medium leading-snug text-tinta group-hover:underline">
                  {f.titulo_ia ?? frase(f.titulo)}
                </h2>
                <p className="mt-1 truncate text-sm text-tinta-2">
                  {[f.entidad && tituloPropio(f.entidad), departamento(f.departamento), modalidadCorta(f.modalidad)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="cifras flex items-center gap-4 text-sm text-tinta-2 md:flex-col md:items-end md:gap-1.5">
                <span>{haceCuanto(f.fecha_publicacion)}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1" title="Documentos">
                    <FileText className="size-3.5" /> {f.num_documentos}
                  </span>
                  <span className="flex items-center gap-1" title="Ofertas recibidas">
                    <Users className="size-3.5" /> {f.num_ofertas ?? 0}
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      {paginas > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Páginas">
          {filtros.pagina > 1 ? (
            <Link href={enlace(filtros.pagina - 1)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-papel-2">
              <ChevronLeft className="size-4" /> Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="cifras text-tinta-2">
            Página {filtros.pagina} de {paginas.toLocaleString("es-GT")}
          </span>
          {filtros.pagina < paginas ? (
            <Link href={enlace(filtros.pagina + 1)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-papel-2">
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

/** Cambió después de publicarse (más de una hora de diferencia). */
function seActualizo(f: FilaLista) {
  if (!f.fecha_fuente || !f.fecha_publicacion) return false;
  return new Date(f.fecha_fuente).getTime() - new Date(f.fecha_publicacion).getTime() > 3_600_000;
}

function SinResultados({ hayFiltros }: { hayFiltros: boolean }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-linea px-6 py-16 text-center">
      <RadarIcon className="mx-auto size-8 text-tinta-3" strokeWidth={1.5} />
      <p className="mt-4 font-semibold">{hayFiltros ? "Nada con esos filtros" : "El radar todavía no tiene licitaciones"}</p>
      <p className="mx-auto mt-1 max-w-md text-tinta-2">
        {hayFiltros ? (
          <>
            Prueba con otras palabras o{" "}
            <Link href="/panel?vista=todas&estado=" className="underline">
              quita los filtros
            </Link>
            .
          </>
        ) : (
          <>
            Corre <code className="font-mono text-sm">npm run recolectar</code> para traer las convocatorias de Guatecompras.
          </>
        )}
      </p>
    </div>
  );
}

function ListaCargando() {
  return (
    <div className="mt-11 divide-y divide-linea border-y border-linea" aria-busy="true" aria-label="Cargando licitaciones">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="space-y-2.5 px-1 py-5">
          <div className="h-4 w-24 animate-pulse rounded-full bg-papel-2" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-papel-2" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-papel-2" />
        </div>
      ))}
    </div>
  );
}
