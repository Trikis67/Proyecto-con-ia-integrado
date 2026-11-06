import { Suspense } from "react";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { AvisoConfiguracion } from "@/components/aviso-configuracion";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { FormularioLogin } from "./formulario";
import { BotonDemo } from "@/components/boton-demo";

export const metadata: Metadata = { title: "Entrar" };

export default function Login({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Marca />
        <h1 className="mt-10 font-display text-4xl font-medium tracking-[-0.02em]">Entra a tu radar</h1>
        <p className="mt-2 text-tinta-2">Escribe tu correo y te mandamos un enlace para entrar.</p>
        <div className="mt-8 space-y-4">
          {!supabaseConfigurado && <AvisoConfiguracion />}
          <Suspense fallback={<FormularioLogin />}>
            <ContenidoLogin searchParams={searchParams} />
          </Suspense>
        </div>
        <div className="mt-10 border-t border-linea pt-6">
          <p className="mb-3 text-sm text-tinta-2">¿Solo quieres verlo funcionando?</p>
          <BotonDemo texto="Entrar al demo sin correo" principal={false} />
        </div>
      </div>
    </main>
  );
}

async function ContenidoLogin({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { siguiente, error } = await searchParams;
  return (
    <>
      {error === "demo" && (
        <p role="alert" className="rounded-xl bg-sello-tenue p-3 text-sm text-sello-hondo">
          No pudimos abrir el demo en este momento. Intenta de nuevo en un minuto.
        </p>
      )}
      {error === "enlace" && (
        <p role="alert" className="rounded-xl bg-sello-tenue p-3 text-sm text-sello-hondo">
          Ese enlace ya se usó o caducó. Pide uno nuevo.
        </p>
      )}
      <FormularioLogin siguiente={typeof siguiente === "string" ? siguiente : undefined} />
    </>
  );
}
