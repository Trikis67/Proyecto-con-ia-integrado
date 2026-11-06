import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Marca } from "@/components/marca";
import { exigirSesion } from "@/lib/sesion";
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
      {children}
    </>
  );
}

async function CorreoUsuario() {
  const { claims } = await exigirSesion();
  return <span className="hidden text-tinta-2 sm:inline">{String(claims.email ?? "")}</span>;
}
