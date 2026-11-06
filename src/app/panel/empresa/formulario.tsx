"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { LISTA_DEPARTAMENTOS } from "@/lib/formato";
import { guardarPerfil, type EstadoPerfil } from "./actions";

type Inicial = {
  nombre: string;
  descripcion: string;
  palabras: string;
  departamentos: string[];
  monto_minimo: string;
  monto_maximo: string;
};

const campo =
  "mt-2 w-full rounded-xl border border-linea bg-papel px-4 py-3 text-tinta outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-tinta-3 focus:border-tinta focus:shadow-[0_0_0_4px_var(--sello-tenue)]";

export function FormularioPerfil({ inicial, existe }: { inicial: Inicial; existe: boolean }) {
  const [estado, accion, guardando] = useActionState<EstadoPerfil, FormData>(guardarPerfil, null);
  // Si la acción falló, React ya limpió el formulario: volvemos a poner lo que se escribió
  const v = { ...inicial, ...estado?.campos };

  return (
    <form action={accion} key={estado?.error ?? "inicio"} className="mt-10 space-y-8">
      <div>
        <label htmlFor="nombre" className="font-medium">
          Nombre de la empresa
        </label>
        <input id="nombre" name="nombre" required defaultValue={v.nombre} placeholder="Climas del Sur, S.A." className={campo} />
      </div>

      <div>
        <label htmlFor="descripcion" className="font-medium">
          ¿Qué vende o qué servicios da?
        </label>
        <p className="mt-1 text-sm text-tinta-2">La IA lo lee para decidir si una licitación te queda. Sé concreto: productos, marcas, capacidad, experiencia.</p>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={4}
          defaultValue={v.descripcion}
          placeholder="Venta, instalación y mantenimiento de aires acondicionados mini split y de paquete para oficinas y hospitales. 12 años de experiencia, técnicos certificados, inscritos en el RGAE."
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="palabras" className="font-medium">
          Palabras clave
        </label>
        <p className="mt-1 text-sm text-tinta-2">Lo que el radar busca en los títulos e ítems. Sepáralas con comas.</p>
        <textarea
          id="palabras"
          name="palabras"
          rows={2}
          required
          defaultValue={v.palabras}
          placeholder="aire acondicionado, mini split, climatización, refrigeración, condensadora"
          className={campo}
        />
      </div>

      <fieldset>
        <legend className="font-medium">¿Dónde puedes trabajar?</legend>
        <p className="mt-1 text-sm text-tinta-2">Déjalo vacío si atiendes todo el país.</p>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {LISTA_DEPARTAMENTOS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="departamentos"
                value={d}
                defaultChecked={inicial.departamentos.includes(d)}
                className="size-4 accent-[var(--sello)]"
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-medium">Montos que puedes manejar (opcional)</legend>
        <div className="mt-1 grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-tinta-2">
            Desde (Q)
            <input name="monto_minimo" inputMode="numeric" defaultValue={v.monto_minimo} placeholder="10,000" className={`${campo} cifras`} />
          </label>
          <label className="text-sm text-tinta-2">
            Hasta (Q)
            <input name="monto_maximo" inputMode="numeric" defaultValue={v.monto_maximo} placeholder="2,000,000" className={`${campo} cifras`} />
          </label>
        </div>
      </fieldset>

      {estado?.error && (
        <p role="alert" className="rounded-xl bg-sello-tenue p-3 text-sm text-sello-hondo">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="inline-flex items-center gap-2 rounded-xl bg-tinta px-6 py-3 font-medium text-papel transition-[background-color,transform] duration-200 hover:bg-sello-hondo active:scale-[0.99] disabled:cursor-wait disabled:opacity-80"
      >
        {guardando && <LoaderCircle className="size-4 animate-spin" />}
        {guardando ? "Guardando…" : existe ? "Guardar y ver mis licitaciones" : "Crear perfil y ver mis licitaciones"}
      </button>
    </form>
  );
}
