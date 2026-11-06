import { tonoEstado } from "@/lib/formato";

const TONOS = {
  abierta: "bg-verde/12 text-verde",
  proceso: "bg-tinta/8 text-tinta-2",
  cerrada: "bg-sello-tenue text-sello-hondo",
  apagada: "bg-papel-2 text-tinta-2",
} as const;

export function Estado({ valor }: { valor: string | null }) {
  const tono = tonoEstado(valor);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONOS[tono]}`}>
      {tono === "abierta" && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {valor ?? "Sin estado"}
    </span>
  );
}
