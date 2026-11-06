/**
 * Uso:
 *   npm run recolectar                      → mes actual y anterior
 *   npm run recolectar -- 2026-11           → un mes concreto
 *   npm run recolectar -- --archivo x.zip   → desde un archivo local
 *   npm run recolectar -- --seco            → solo muestra qué haría, sin escribir
 *   npm run recolectar -- --reprocesar      → cambió el código del mapeo: actualiza sin crear versiones
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  descargarPeriodo,
  etiquetaPeriodo,
  guardarRegistros,
  leerJson,
  leerZip,
  periodosRecientes,
  type Periodo,
} from "../src/lib/guatecompras/recolector";
import { aFila } from "../src/lib/guatecompras/ocds";

const args = process.argv.slice(2);
const seco = args.includes("--seco");
const reprocesar = args.includes("--reprocesar");
const archivo = args[args.indexOf("--archivo") + 1];
const usaArchivo = args.includes("--archivo") && archivo;

const periodos: Periodo[] = args
  .filter((a) => /^\d{4}-\d{1,2}$/.test(a))
  .map((a) => {
    const [anio, mes] = a.split("-").map(Number);
    return { anio, mes };
  });

async function main() {
  const fuentes: { etiqueta: string; cargar: () => Promise<ReturnType<typeof leerJson>> }[] = usaArchivo
    ? [
        {
          etiqueta: archivo.match(/(\d{4}-\d{2})/)?.[1] ?? "archivo",
          cargar: async () => {
            const bytes = readFileSync(archivo);
            const esZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
            return esZip ? leerZip(new Uint8Array(bytes)) : leerJson(bytes.toString("utf8"));
          },
        },
      ]
    : (periodos.length ? periodos : periodosRecientes()).map((p) => ({ etiqueta: etiquetaPeriodo(p), cargar: () => descargarPeriodo(p) }));

  if (seco) {
    for (const f of fuentes) {
      const registros = await f.cargar();
      const filas = registros.map(aFila);
      const porEstado = Object.groupBy(filas, (x) => x.estado_detalle ?? "sin estado");
      console.log(`${f.etiqueta}: ${filas.length} procesos`);
      for (const [estado, xs] of Object.entries(porEstado)) console.log(`  ${estado}: ${xs?.length}`);
      console.log("  ejemplo:", JSON.stringify({ ...filas[0], datos: "…" }, null, 2));
    }
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secreta = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secreta) {
    console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
    process.exit(1);
  }
  const supabase = createClient(url, secreta, { auth: { persistSession: false } });

  for (const f of fuentes) {
    const inicio = Date.now();
    console.log(`Recolectando ${f.etiqueta}…`);
    const registros = await f.cargar();
    const r = await guardarRegistros(supabase, f.etiqueta, registros, console.log, { reprocesar });
    console.log(
      `✓ ${r.periodo}: ${r.procesadas} procesos · ${r.nuevas} nuevos · ${r.cambiadas} con cambios · ${r.sinCambios} igual (${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
    );
  }
}

main().catch((e) => {
  console.error("✗ El recolector falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
