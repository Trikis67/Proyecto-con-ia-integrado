import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LogOut, Radar as RadarIcon } from "lucide-react";
import { Marca } from "@/components/marca";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { cerrarSesion } from "../login/actions";

export const metadata: Metadata = { title: "Panel" };

export default function Panel() {
  return (
    <>
      <header className="border-b border-linea">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Marca href="/panel" />
          <div className="flex items-center gap-4 text-sm">
            <Suspense fallback={null}>
              <CorreoUsuario />
            </Suspense>
            <form action={cerrarSesion}>
              <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-tinta-2 transition-colors hover:bg-papel-2 hover:text-tinta">
                <LogOut className="size-4" /> Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">Licitaciones</h1>
        <div className="mt-10 rounded-2xl border border-dashed border-linea px-6 py-16 text-center">
          <RadarIcon className="mx-auto size-8 text-tinta-3" strokeWidth={1.5} />
          <Suspense fallback={<p className="mt-4 font-semibold text-tinta-3">Contando licitaciones…</p>}>
            <ConteoLicitaciones />
          </Suspense>
          <p className="mx-auto mt-1 max-w-md text-tinta-2">
            En la siguiente fase conectamos el recolector de Guatecompras y aquí vas a ver las convocatorias nuevas.
          </p>
        </div>
      </main>
    </>
  );
}

/** Verifica la sesión (el proxy ya filtra, esto es la comprobación de verdad). */
async function sesion() {
  // Depende de quién pide la página: siempre en tiempo de petición, nunca prerenderizado.
  await connection();
  if (!supabaseConfigurado) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?siguiente=/panel");
  return { supabase, claims: data.claims };
}

async function CorreoUsuario() {
  const { claims } = await sesion();
  return <span className="hidden text-tinta-2 sm:inline">{String(claims.email ?? "")}</span>;
}

async function ConteoLicitaciones() {
  const { supabase } = await sesion();
  const { count } = await supabase.from("licitaciones").select("*", { count: "exact", head: true });
  return (
    <p className="mt-4 font-semibold">
      {count ? `${count.toLocaleString("es-GT")} licitaciones en la base` : "El radar todavía no tiene licitaciones"}
    </p>
  );
}
