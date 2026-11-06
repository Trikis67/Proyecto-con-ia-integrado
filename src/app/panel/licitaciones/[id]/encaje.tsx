"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";

export function EvaluarEncaje({ id, yaEvaluada }: { id: string; yaEvaluada: boolean }) {
  const router = useRouter();
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, iniciar] = useTransition();

  async function evaluar() {
    setError(null);
    setEvaluando(true);
    try {
      const res = await fetch("/api/empresa/evaluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      const r = (await res.json().catch(() => null)) as { ok: boolean; evaluadas?: number; error?: string } | null;
      if (!res.ok || !r?.ok || !r.evaluadas) {
        setError(r?.error ?? "No se pudo evaluar. Intenta de nuevo.");
        return;
      }
      iniciar(() => router.refresh());
    } catch {
      setError("Se perdió la conexión. Intenta de nuevo.");
    } finally {
      setEvaluando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={evaluar}
        disabled={evaluando || refrescando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-linea bg-papel px-4 py-2 text-sm font-medium transition-colors hover:bg-papel-2 disabled:cursor-wait disabled:opacity-70"
      >
        {evaluando || refrescando ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4 text-sello" />}
        {evaluando ? "Evaluando…" : yaEvaluada ? "Volver a evaluar" : "¿Me conviene? Evaluar con IA"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-sello-hondo">
          {error}
        </p>
      )}
    </div>
  );
}
