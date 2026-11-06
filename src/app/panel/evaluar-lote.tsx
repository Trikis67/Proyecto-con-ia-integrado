"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

/** Pide a la IA que evalúe las mejores candidatas que aún no tienen calificación. */
export function EvaluarLote({ pendientes }: { pendientes: number }) {
  const router = useRouter();
  const [evaluando, setEvaluando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [refrescando, iniciar] = useTransition();
  const ocupado = evaluando || refrescando;

  async function evaluar() {
    setMensaje(null);
    setEvaluando(true);
    try {
      const res = await fetch("/api/empresa/evaluar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const r = (await res.json().catch(() => null)) as { ok: boolean; evaluadas?: number; fallidas?: number; error?: string } | null;
      if (!res.ok || !r?.ok) {
        setMensaje({ tipo: "error", texto: r?.error ?? "No se pudo evaluar. Intenta de nuevo." });
        return;
      }
      setMensaje({
        tipo: "ok",
        texto: r.evaluadas
          ? `Listo: ${r.evaluadas} evaluadas${r.fallidas ? ` (${r.fallidas} fallaron)` : ""}.`
          : "No hay candidatas nuevas por evaluar.",
      });
      iniciar(() => router.refresh());
    } catch {
      setMensaje({ tipo: "error", texto: "Se perdió la conexión. Intenta de nuevo." });
    } finally {
      setEvaluando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={evaluar}
        disabled={ocupado || pendientes === 0}
        className="inline-flex items-center gap-2 rounded-xl bg-tinta px-4 py-2.5 text-sm font-medium text-papel transition-[background-color,transform] duration-200 hover:bg-sello-hondo active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ocupado ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {evaluando ? "La IA está evaluando…" : `Evaluar con IA las ${Math.min(10, pendientes)} mejores`}
      </button>
      {mensaje && (
        <p role="status" className={`text-sm ${mensaje.tipo === "ok" ? "text-verde" : "text-sello-hondo"}`}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
