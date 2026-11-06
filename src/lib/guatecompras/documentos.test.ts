import { test } from "node:test";
import assert from "node:assert/strict";
import { elegirBases } from "./documentos";

const doc = (titulo: string, archivo: string) => ({
  titulo,
  tipo: null,
  fecha: null,
  url: `http://www.guatecompras.gt/concursos/files/6520/32597312@${encodeURIComponent(archivo)}`,
});

test("elige los términos de referencia para el proveedor y descarta la versión de la comisión", () => {
  // Los 5 documentos reales de la licitación del IGSS que revisamos
  const r = elegirBases([
    doc("Solicitud o requerimiento de bien, servicio o suministro", "ESPECIFICACIONES TECNICAS SERVICIO DE AIRE.pdf"),
    doc("Solicitud o requerimiento de bien, servicio o suministro", "SIAF 136-2026 SERVICIO DE AIRE ACONDICIONADO.pdf"),
    doc("Bases, especificaciones generales o términos de referencia", "TERMINIOS DE REFERENCIA 249-2026 PROVEEDOR.pdf"),
    doc("Bases, especificaciones generales o términos de referencia", "DECLARACION DE INEXISTENCIAS DE PROHIBICIONES.docx"),
    doc("Bases, especificaciones generales o términos de referencia", "TERMINOS DE REFERENCIA 249-2026 COMISION.pdf"),
  ]);
  assert.equal(r[0].archivo, "TERMINIOS DE REFERENCIA 249-2026 PROVEEDOR.pdf");
  assert.equal(r[0].formato, "pdf");
  assert.ok(r[0].url.startsWith("https://"));
  // Las bases primero y las especificaciones técnicas después;
  // ni la versión de la comisión, ni la declaración, ni el pedido interno (SIAF)
  assert.deepEqual(r.map((d) => d.archivo), [
    "TERMINIOS DE REFERENCIA 249-2026 PROVEEDOR.pdf",
    "ESPECIFICACIONES TECNICAS SERVICIO DE AIRE.pdf",
  ]);
});

test("detecta bases en Word", () => {
  const [primero] = elegirBases([doc("Bases, especificaciones generales o términos de referencia", "BASES MEJORAMIENTO CAMINO.docx")]);
  assert.equal(primero.formato, "word");
});

test("sin documentos útiles, no ofrece nada", () => {
  assert.deepEqual(elegirBases([doc("Solicitud o requerimiento", "PEDIDO 12.pdf")]), []);
});
