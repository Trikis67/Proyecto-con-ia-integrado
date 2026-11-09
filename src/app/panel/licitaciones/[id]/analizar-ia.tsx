"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Download, FileText, FileUp, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import type { DocumentoBase } from "@/lib/guatecompras/documentos";
import { MAX_PDFS, MAX_TOTAL_MB } from "@/lib/ia/pdfs";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * Sube uno o varios PDFs (opcional) y pide el análisis. Es acumulativo: los PDFs nuevos
 * se suman al análisis que ya existe, salvo que la persona elija empezar de cero.
 */
export function AnalizarIA({
  id,
  yaAnalizada,
  documentosPrevios = [],
  bases = [],
  urlGuatecompras,
}: {
  id: string;
  yaAnalizada: boolean;
  /** PDFs que ya están integrados en el análisis guardado */
  documentosPrevios?: string[];
  bases?: DocumentoBase[];
  urlGuatecompras?: string | null;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [reiniciar, setReiniciar] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, iniciarTransicion] = useTransition();

  const totalBytes = archivos.reduce((s, a) => s + a.size, 0);
  const excede = archivos.length > MAX_PDFS || totalBytes > MAX_TOTAL_MB * 1024 * 1024;
  const acumula = yaAnalizada && !reiniciar;

  function agregar(lista: FileList | null) {
    setError(null);
    if (!lista) return;
    const nuevos = [...lista].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (nuevos.length < lista.length) setError("Solo se pueden subir PDFs. Si las bases están en Word, guárdalas como PDF primero.");
    // Sin repetir: el mismo nombre y tamaño es el mismo archivo
    setArchivos((actuales) => [...actuales, ...nuevos.filter((n) => !actuales.some((a) => a.name === n.name && a.size === n.size))]);
    if (entrada.current) entrada.current.value = ""; // permite volver a elegir el mismo archivo después de quitarlo
  }

  async function analizar() {
    setError(null);
    setAnalizando(true);
    try {
      const datos = new FormData();
      for (const archivo of archivos) datos.append("pdf", archivo);
      if (reiniciar) datos.set("reiniciar", "1");
      const res = await fetch(`/api/licitaciones/${id}/analizar`, { method: "POST", body: datos });
      const cuerpo = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !cuerpo?.ok) {
        setError(cuerpo?.error ?? "No se pudo completar el análisis. Intenta de nuevo.");
        return;
      }
      setArchivos([]);
      setReiniciar(false);
      iniciarTransicion(() => router.refresh());
    } catch {
      setError("Se perdió la conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setAnalizando(false);
    }
  }

  const textoBoton = analizando
    ? archivos.length
      ? `Leyendo ${archivos.length === 1 ? "el PDF" : `${archivos.length} PDFs`}… puede tardar un minuto`
      : "Analizando…"
    : archivos.length
      ? acumula
        ? `Agregar ${archivos.length === 1 ? "el PDF" : `los ${archivos.length} PDFs`} al análisis`
        : `Analizar ${archivos.length === 1 ? "el PDF" : `los ${archivos.length} PDFs`} con IA`
      : yaAnalizada
        ? reiniciar
          ? "Empezar de cero solo con los datos"
          : "Volver a analizar"
        : "Analizar solo con los datos";

  return (
    <div className="space-y-3">
      {bases.length > 0 && (
        <div className="rounded-xl bg-papel px-4 py-3 ring-1 ring-linea">
          <p className="text-sm font-medium">1. Baja las bases</p>
          <p className="mt-0.5 text-xs leading-relaxed text-tinta-2">
            Guatecompras pide verificar tu navegador, así que la descarga la haces tú: se abre en otra pestaña.
          </p>
          <ul className="mt-2.5 space-y-2">
            {bases.map((b) => (
              <li key={b.url}>
                <a href={b.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2 text-sm no-underline">
                  <Download className="mt-0.5 size-4 shrink-0 text-sello" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-tinta underline decoration-linea group-hover:decoration-tinta">{b.archivo}</span>
                    <span className="text-xs text-tinta-2">
                      {b.formato === "pdf" ? "PDF, listo para subir" : b.formato === "word" ? "Word: ábrelo y guárdalo como PDF antes de subirlo" : "Formato no compatible"}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {urlGuatecompras && (
            <a
              href={urlGuatecompras}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-tinta-2 no-underline hover:text-tinta"
            >
              Ver todos los documentos en Guatecompras <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {bases.length > 0 && <p className="pt-1 text-sm font-medium">2. Súbelas aquí (puedes elegir varias)</p>}

      {documentosPrevios.length > 0 && !reiniciar && (
        <p className="text-xs leading-relaxed text-tinta-2">
          Ya analizados: {documentosPrevios.join(", ")}. Los PDFs nuevos se suman a este análisis.
        </p>
      )}

      {archivos.length > 0 && (
        <ul className="divide-y divide-linea rounded-xl bg-papel ring-1 ring-linea">
          {archivos.map((a) => (
            <li key={`${a.name}-${a.size}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <FileText className="size-4 shrink-0 text-tinta-2" />
              <span className="min-w-0 flex-1 truncate font-medium" title={a.name}>
                {a.name}
              </span>
              <span className="cifras shrink-0 text-xs text-tinta-2">{mb(a.size)}</span>
              <button
                type="button"
                disabled={analizando}
                onClick={() => setArchivos((actuales) => actuales.filter((x) => x !== a))}
                className="rounded-full p-1 text-tinta-2 hover:bg-papel-2 hover:text-tinta disabled:opacity-50"
                aria-label={`Quitar ${a.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors border-linea hover:border-tinta-3 hover:bg-papel ${
          analizando ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {archivos.length ? <Plus className="size-4 shrink-0 text-tinta-2" /> : <FileUp className="size-4 shrink-0 text-tinta-2" />}
        <span className="min-w-0 flex-1">
          {archivos.length ? (
            <span className="font-medium">Agregar otro PDF</span>
          ) : (
            <>
              <span className="font-medium">{yaAnalizada ? "Sube más PDFs de esta licitación" : "Sube las bases en PDF"}</span>
              <span className="block text-tinta-2">
                Puedes elegir varios a la vez: hasta {MAX_PDFS} y {MAX_TOTAL_MB} MB entre todos
              </span>
            </>
          )}
        </span>
        <input
          ref={entrada}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          onChange={(e) => agregar(e.target.files)}
        />
      </label>

      {archivos.length > 0 && (
        <p className={`cifras text-xs ${excede ? "text-sello-hondo" : "text-tinta-2"}`}>
          {archivos.length} de {MAX_PDFS} PDFs · {mb(totalBytes)} de {MAX_TOTAL_MB} MB
          {excede && " — quita alguno o súbelos en dos tandas"}
        </p>
      )}

      {yaAnalizada && (
        <label className="flex items-center gap-2 text-xs text-tinta-2">
          <input
            type="checkbox"
            checked={reiniciar}
            disabled={analizando}
            onChange={(e) => setReiniciar(e.target.checked)}
            className="size-3.5 accent-[var(--sello)]"
          />
          Empezar de cero (descartar el análisis anterior)
        </label>
      )}

      <button
        type="button"
        onClick={analizar}
        disabled={analizando || excede}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-medium text-papel transition-[background-color,transform] duration-200 hover:bg-sello-hondo active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analizando ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {textoBoton}
      </button>

      {error && (
        <p role="alert" className="rounded-xl bg-sello-tenue p-3 text-sm text-sello-hondo">
          {error}
        </p>
      )}
    </div>
  );
}
