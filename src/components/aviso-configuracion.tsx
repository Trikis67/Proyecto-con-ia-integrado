import { TriangleAlert } from "lucide-react";

export function AvisoConfiguracion() {
  return (
    <div role="status" className="flex gap-3 rounded-xl border border-sello/30 bg-sello-tenue p-4 text-sm text-tinta">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-sello-hondo" />
      <p>
        Falta conectar Supabase. Copia <code className="font-mono">.env.example</code> como{" "}
        <code className="font-mono">.env.local</code>, pon la URL y la clave de tu proyecto y reinicia el servidor.
      </p>
    </div>
  );
}
