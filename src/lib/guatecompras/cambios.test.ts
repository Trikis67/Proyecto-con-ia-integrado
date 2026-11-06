import { test } from "node:test";
import assert from "node:assert/strict";
import { compararVersiones, resumirCambios } from "./cambios";
import { huellaDe, type DatosLicitacion } from "./ocds";

const base: DatosLicitacion = {
  nog: "32560567",
  fecha: "2026-11-02T21:19:29-06:00",
  titulo: "Compra de insumos para viveros",
  modalidad: "Compra Directa con Oferta Electrónica (Art. 43 LCE Inciso b)",
  categoria: "goods",
  estado: "active",
  estadoDetalle: "Vigente",
  comprador: { nombre: "AMSCLAE", unidad: null, departamento: "SOLOLA", municipio: "PANAJACHEL" },
  periodo: { inicio: "2026-11-02T21:19:26-06:00", fin: null },
  items: [{ descripcion: "Fertilizante", cantidad: 2, unidad: "Litro", unspsc: "10171605", caracteristicas: null }],
  documentos: [{ titulo: "Bases", tipo: null, url: "https://x/bases.pdf", fecha: null }],
  ofertas: [],
  adjudicaciones: [],
};

const clonar = (d: DatosLicitacion): DatosLicitacion => structuredClone(d);

test("la misma licitación da la misma huella", () => {
  assert.equal(huellaDe(base), huellaDe(clonar(base)));
});

test("detecta cambio de estado, documento nuevo y adjudicación", () => {
  const nueva = clonar(base);
  nueva.estadoDetalle = "Adjudicado";
  nueva.documentos.push({ titulo: "Acta de adjudicación", tipo: null, url: "https://x/acta.pdf", fecha: null });
  nueva.ofertas = ["FERTILIZANTES DEL LAGO, S.A."];
  nueva.adjudicaciones = [{ titulo: null, estado: "Activo", monto: 12500, moneda: "GTQ", proveedores: ["FERTILIZANTES DEL LAGO, S.A."], fecha: null }];

  assert.notEqual(huellaDe(base), huellaDe(nueva));
  const cambios = compararVersiones(base, nueva);
  assert.deepEqual(cambios.map((c) => c.campo).sort(), ["adjudicacion", "documentos", "estado", "ofertas"]);

  const resumen = resumirCambios(cambios);
  assert.match(resumen, /Pasó de «Vigente» a «Adjudicado»/);
  assert.match(resumen, /Subieron un documento: Acta de adjudicación/);
  assert.match(resumen, /Se adjudicó a FERTILIZANTES DEL LAGO, S\.A\. por Q 12,500\.00/);
});

test("fecha de cierre que aparece", () => {
  const nueva = clonar(base);
  nueva.periodo.fin = "2026-11-20T15:00:00-06:00";
  const [cambio] = compararVersiones(base, nueva);
  assert.equal(cambio.campo, "fecha_cierre");
  assert.match(resumirCambios([cambio]), /Ya tiene fecha de cierre: 20 de noviembre/);
});

test("si cambia algo que no mostramos, igual lo registra", () => {
  const nueva = clonar(base);
  nueva.items[0].caracteristicas = "Foliar";
  assert.deepEqual(compararVersiones(base, nueva), [{ campo: "otros" }]);
});
