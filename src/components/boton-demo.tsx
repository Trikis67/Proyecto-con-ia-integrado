"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { entrarDemo } from "@/app/demo/actions";

function Boton({ texto, principal }: { texto: string; principal: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        principal
          ? "group inline-flex items-center gap-2 rounded-full bg-tinta px-6 py-3.5 font-medium text-papel shadow-[0_6px_20px_-8px_oklch(23%_0.035_255/0.6)] transition-[background-color,transform] duration-300 ease-salida hover:bg-sello-hondo active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"
          : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-linea bg-papel px-4 py-3 font-medium transition-colors hover:bg-papel-2 disabled:cursor-wait disabled:opacity-70"
      }
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {pending ? "Preparando tu demo…" : texto}
      {!pending && principal && <ArrowRight className="size-4 transition-transform duration-300 ease-salida group-hover:translate-x-0.5" />}
    </button>
  );
}

/** Entra al modo demo sin correo: sesión anónima con una empresa de ejemplo ya evaluada. */
export function BotonDemo({ texto = "Probar el demo", principal = true }: { texto?: string; principal?: boolean }) {
  return (
    <form action={entrarDemo} className={principal ? undefined : "w-full"}>
      <Boton texto={texto} principal={principal} />
    </form>
  );
}
