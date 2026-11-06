"use client";

import { useActionState } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { enviarEnlace, type EstadoLogin } from "./actions";

export function FormularioLogin({ siguiente }: { siguiente?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(enviarEnlace, { tipo: "inicio" });

  if (estado.tipo === "enviado") {
    return (
      <div role="status" className="rounded-2xl border border-linea bg-papel-2 p-6">
        <MailCheck className="size-6 text-verde" />
        <p className="mt-3 font-semibold">Revisa tu correo</p>
        <p className="mt-1 text-tinta-2">
          Te mandamos un enlace a <span className="font-medium text-tinta">{estado.correo}</span>. Ábrelo en este
          mismo navegador para entrar.
        </p>
      </div>
    );
  }

  const conError = estado.tipo === "error";

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="siguiente" value={siguiente ?? "/panel"} />
      <div>
        <label htmlFor="correo" className="text-sm font-medium">
          Correo de trabajo
        </label>
        <input
          // React limpia el formulario después de enviarlo: al remontar con el correo
          // devuelto por la acción, la persona no tiene que escribirlo otra vez.
          key={conError ? `error-${estado.intento}` : "inicio"}
          defaultValue={conError ? estado.correo : undefined}
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@empresa.com"
          aria-invalid={conError}
          aria-describedby={conError ? "error-correo" : undefined}
          className="mt-2 w-full rounded-xl border border-linea bg-papel px-4 py-3 text-tinta outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-tinta-3 focus:border-tinta focus:shadow-[0_0_0_4px_var(--sello-tenue)] aria-[invalid=true]:border-sello"
        />
        {conError && (
          <p id="error-correo" className="mt-2 text-sm text-sello-hondo">
            {estado.mensaje}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-tinta px-4 py-3 font-medium text-papel transition-[background-color,transform] duration-200 hover:bg-sello-hondo active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
      >
        {enviando && <LoaderCircle className="size-4 animate-spin" />}
        {enviando ? "Enviando enlace…" : "Enviarme un enlace para entrar"}
      </button>
      <p className="text-sm text-tinta-2">Sin contraseñas: te llega un enlace de un solo uso.</p>
    </form>
  );
}
