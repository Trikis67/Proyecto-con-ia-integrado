import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigirSesion } from "@/lib/sesion";
import { miEmpresa } from "@/lib/empresa";
import { departamento } from "@/lib/formato";
import { FormularioPerfil } from "./formulario";

export const metadata: Metadata = { title: "Perfil de empresa" };

export default function PaginaEmpresa() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-8">
      <Link href="/panel" className="inline-flex items-center gap-1.5 text-sm text-tinta-2 no-underline hover:text-tinta">
        <ArrowLeft className="size-4" /> Licitaciones
      </Link>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-[-0.02em]">Tu empresa</h1>
      <p className="mt-2 max-w-[60ch] text-tinta-2">
        Con esto el radar encuentra las licitaciones que te sirven y la IA te dice cuáles te conviene ofertar.
      </p>
      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-2xl bg-papel-2" aria-busy="true" />}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const { supabase } = await exigirSesion("/panel/empresa");
  const empresa = await miEmpresa(supabase);
  return (
    <FormularioPerfil
      inicial={{
        nombre: empresa?.nombre ?? "",
        descripcion: empresa?.descripcion ?? "",
        palabras: empresa?.palabras_clave.join(", ") ?? "",
        departamentos: (empresa?.departamentos ?? []).map((d) => departamento(d) ?? d),
        monto_minimo: empresa?.monto_minimo?.toString() ?? "",
        monto_maximo: empresa?.monto_maximo?.toString() ?? "",
      }}
      existe={Boolean(empresa)}
    />
  );
}
