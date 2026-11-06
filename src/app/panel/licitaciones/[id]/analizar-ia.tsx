"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, Sparkles, X } from "lucide-react";

/** Sube las bases (opcional) y pide el análisis. Al terminar recarga los datos del servidor. */
export function AnalizarIA({ id, yaAnalizada }: { id: string; yaAnalizada: boolean }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, iniciarTransicion] = useTransition();

  async function analizar() {
    setError(null);
    setAnalizando(true);
    try {
      const datos = new FormData();
      if (archivo) datos.set("pdf", archivo);
      const res = await fetch(`/api/licitaciones/${id}/analizar`, { method: "POST", body: datos });
      const cuerpo = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
      if (!res.ok || !cuerpo?.ok) {
        setError(cuerpo?.error ?? "No se pudo completar el análisis. Intenta de nuevo.");
        return;
      }
      setArchivo(null);
      if (entrada.current) entrada.current.value = "";
      iniciarTransicion(() => router.refresh());
    } catch {
      setError("Se perdió la conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setAnalizando(false);
    }
  }

  return (
    <div className="space-y-3">
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors ${
          archivo ? "border-tinta bg-papel" : "border-linea hover:border-tinta-3 hover:bg-papel"
        } ${analizando ? "pointer-events-none opacity-60" : ""}`}
      >
        <FileUp className="size-4 shrink-0 text-tinta-2" />
        <span className="min-w-0 flex-1">
          {archivo ? (
            <span className="block truncate font-medium">{archivo.name}</span>
          ) : (
            <>
              <span className="font-medium">Sube las bases en PDF</span>
              <span className="block text-tinta-2">Elige el PDF que bajaste de Guatecompras (máx. 20 MB)</span>
            </>
          )}
        </span>
        {archivo && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setArchivo(null);
              if (entrada.current) entrada.current.value = "";
            }}
            className="rounded-full p-1 text-tinta-2 hover:bg-papel-2 hover:text-tinta"
            aria-label="Quitar el PDF"
          >
            <X className="size-4" />
          </button>
        )}
        <input
          ref={entrada}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => {
            setError(null);
            setArchivo(e.target.files?.[0] ?? null);
          }}
        />
      </label>

      <button
        type="button"
        onClick={analizar}
        disabled={analizando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-medium text-papel transition-[background-color,transform] duration-200 hover:bg-sello-hondo active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
      >
        {analizando ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {analizando
          ? archivo
            ? "Leyendo las bases… puede tardar un minuto"
            : "Analizando…"
          : archivo
            ? "Analizar las bases con IA"
            : yaAnalizada
              ? "Volver a analizar solo con los datos"
              : "Analizar solo con los datos"}
      </button>

      {error && (
        <p role="alert" className="rounded-xl bg-sello-tenue p-3 text-sm text-sello-hondo">
          {error}
        </p>
      )}
    </div>
  );
}
