import Link from "next/link";
import { CalendarClock, FileText, Radar as RadarIcon, Sparkles, BellRing } from "lucide-react";
import { Marca } from "@/components/marca";
import { Pie } from "@/components/pie";
import { Radar } from "@/components/radar";
import { BotonDemo } from "@/components/boton-demo";

const PASOS = [
  {
    icono: RadarIcon,
    titulo: "Vigila Guatecompras",
    texto:
      "Revisa las convocatorias nuevas varias veces al día y guarda cada versión. Si cambian la fecha de cierre o suben un anexo, te enteras.",
  },
  {
    icono: FileText,
    titulo: "Lee las bases por ti",
    texto:
      "La IA extrae lo que importa de cada PDF: monto, fechas, garantías, experiencia mínima y documentos que piden.",
  },
  {
    icono: Sparkles,
    titulo: "Te dice si te conviene",
    texto:
      "Compara cada licitación con lo que vende tu empresa y sus certificados, y explica en una línea por qué encaja o por qué no.",
  },
  {
    icono: BellRing,
    titulo: "Avisa solo lo relevante",
    texto: "Nada de cien correos al día. Recibes las oportunidades que superan tu umbral, con el tiempo justo para preparar la oferta.",
  },
];

export default function Inicio() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Marca />
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-tinta transition-colors duration-200 hover:bg-papel-2"
        >
          Entrar
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div>
            <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-[-0.03em] text-balance md:text-7xl">
              Las licitaciones que puedes ganar, sin leer mil PDFs.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-tinta-2">
              Triki Radar vigila Guatecompras todos los días, lee las bases con inteligencia artificial y te avisa
              cuando aparece una convocatoria hecha a la medida de tu empresa.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <BotonDemo />
              <Link href="/login" className="text-sm font-medium text-tinta-2 underline decoration-linea underline-offset-4 hover:text-tinta">
                Entrar con mi correo
              </Link>
            </div>
            <p className="mt-4 text-sm text-tinta-2">Sin registrarte: entras con una empresa de ejemplo y licitaciones reales de Guatecompras.</p>
          </div>

          <div className="relative flex justify-center">
            <Radar />
            <FichaEjemplo />
          </div>
        </section>

        <section className="border-t border-linea bg-papel-2/60">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="max-w-xl font-display text-3xl font-medium tracking-[-0.02em] text-balance md:text-4xl">
              El trabajo de una persona revisando el portal, hecho en minutos.
            </h2>
            <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {PASOS.map(({ icono: Icono, titulo, texto }) => (
                <li key={titulo} className="flex gap-4">
                  <Icono className="mt-1 size-5 shrink-0 text-sello" strokeWidth={1.75} />
                  <div>
                    <h3 className="font-semibold">{titulo}</h3>
                    <p className="mt-1.5 max-w-[46ch] leading-relaxed text-tinta-2">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Pie />
    </>
  );
}

/** Cómo se ve una coincidencia en el panel. Datos de ejemplo. */
function FichaEjemplo() {
  return (
    <article className="absolute -bottom-20 left-1/2 w-[19rem] -translate-x-1/2 rounded-2xl border border-linea bg-papel p-5 shadow-[0_18px_40px_-18px_oklch(23%_0.035_255/0.35)] md:-left-10 md:translate-x-0">
      <div className="flex items-center justify-between text-xs text-tinta-2">
        <span>Ejemplo</span>
        <span className="cifras font-mono">NOG 2491xxxx</span>
      </div>
      <h3 className="mt-2 font-semibold leading-snug">Mantenimiento de equipo de aire acondicionado, 14 sedes</h3>
      <p className="mt-1 text-sm text-tinta-2">Ministerio de Salud Pública</p>
      <div className="mt-4 flex items-end justify-between">
        <div className="text-sm">
          <p className="cifras font-mono font-medium">Q 1,240,000</p>
          <p className="mt-0.5 flex items-center gap-1 text-sello-hondo">
            <CalendarClock className="size-3.5" /> Cierra en 9 días
          </p>
        </div>
        <p className="cifras rounded-full bg-sello-tenue px-3 py-1 text-sm font-semibold text-sello-hondo">92% encaje</p>
      </div>
    </article>
  );
}
