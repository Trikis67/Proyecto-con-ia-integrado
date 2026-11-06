import { Suspense } from "react";
import Link from "next/link";
import { FlaskConical, LogOut } from "lucide-react";
import { Marca } from "@/components/marca";
import { exigirSesion } from "@/lib/sesion";
import { createAdminClient } from "@/lib/supabase/admin";
import { llamadasRestantes } from "@/lib/ia/limite";
import { cerrarSesion } from "../login/actions";

export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-linea bg-papel/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
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
      <Suspense fallback={null}>
        <AvisoDemo />
      </Suspense>
      {children}
    </>
  );
}

async function CorreoUsuario() {
  const { claims } = await exigirSesion();
  if (claims.is_anonymous) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sello-tenue px-3 py-1 text-xs font-medium text-sello-hondo">
        <FlaskConical className="size-3.5" /> Modo demo
      </span>
    );
  }
  return <span className="hidden text-tinta-2 sm:inline">{String(claims.email ?? "")}</span>;
}

/** Solo para visitantes del demo: qué es esto y cuánta IA les queda hoy. */
async function AvisoDemo() {
  const { claims } = await exigirSesion();
  if (!claims.is_anonymous) return null;
  const restantes = await llamadasRestantes(createAdminClient(), claims.sub, true);
  return (
    <div className="border-b border-linea bg-papel-2/70">
      <p className="mx-auto max-w-6xl px-6 py-2.5 text-sm text-tinta-2">
        Estás probando Triki Radar con una empresa de ejemplo y licitaciones reales de Guatecompras. Cambia el{" "}
        <Link href="/panel/empresa" className="underline">
          perfil
        </Link>{" "}
        para ver las de tu rubro.{" "}
        <span className="cifras font-medium text-tinta">
          Te quedan {restantes} {restantes === 1 ? "uso" : "usos"} de la IA hoy.
        </span>
      </p>
    </div>
  );
}
