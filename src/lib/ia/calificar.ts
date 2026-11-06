import { z } from "zod";

/*
 * La IA no inventa un total: da puntos por criterio con reglas fijas, y el código los suma.
 * Así el puntaje se puede explicar y distingue entre licitaciones (antes 9 de 10 salían con 88).
 */
export const EsquemaEncaje = z.object({
  puntos_rubro: z.number().int().describe("0 a 50. ¿Es lo que la empresa vende? Ver reglas."),
  puntos_zona: z.number().int().describe("0 a 20. ¿Es en una zona donde trabaja?"),
  puntos_monto: z.number().int().describe("0 a 15. ¿Cabe en su rango de montos? 5 si el monto no se conoce."),
  puntos_condiciones: z.number().int().describe("0 a 15. Plazos, requisitos y competencia. 5 si no se conocen."),
  resumen: z.string().describe("Una frase para la persona de la empresa, p. ej. «Es justo lo tuyo, pero cierra en 3 días»."),
  a_favor: z.array(z.string()).describe("Hasta 3 razones concretas a favor, solo con datos conocidos."),
  en_contra: z.array(z.string()).describe("Hasta 3 razones concretas en contra o riesgos."),
  que_falta: z.array(z.string()).describe("Datos que faltan para decidir (p. ej. «Sube las bases para ver el monto»)."),
});

type RespuestaIA = z.infer<typeof EsquemaEncaje>;
export type Veredicto = "conviene" | "revisar" | "no_conviene";
export type Encaje = Omit<RespuestaIA, "puntos_rubro" | "puntos_zona" | "puntos_monto" | "puntos_condiciones"> & {
  puntaje: number;
  veredicto: Veredicto;
  desglose: { rubro: number; zona: number; monto: number; condiciones: number };
};

const acotar = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

/** Suma los puntos de la IA (acotados a su máximo) y decide el veredicto con umbrales fijos. */
export function calificar(r: RespuestaIA): Encaje {
  const { puntos_rubro, puntos_zona, puntos_monto, puntos_condiciones, ...resto } = r;
  const desglose = {
    rubro: acotar(puntos_rubro, 50),
    zona: acotar(puntos_zona, 20),
    monto: acotar(puntos_monto, 15),
    condiciones: acotar(puntos_condiciones, 15),
  };
  const puntaje = desglose.rubro + desglose.zona + desglose.monto + desglose.condiciones;
  // Si no es su rubro, nada más importa
  const veredicto: Veredicto = desglose.rubro < 25 || puntaje < 50 ? "no_conviene" : puntaje >= 80 ? "conviene" : "revisar";
  return { ...resto, puntaje, veredicto, desglose };
}
