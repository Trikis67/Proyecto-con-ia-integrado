import { test } from "node:test";
import assert from "node:assert/strict";
import { frase, limpiarHtml, nombreArchivo, tituloPropio } from "./formato";

test("títulos en mayúsculas pasan a frase y respetan siglas y códigos", () => {
  assert.equal(
    frase("ADQUISICIÓN DE GUANTES TIPO TÁCTICOS PARA USO DEL PERSONAL ANTINARCÓTICO DE LA SGAIA/PNC PARA STOCK EN BODEGA DE ALMACÉN"),
    "Adquisición de guantes tipo tácticos para uso del personal antinarcótico de la SGAIA/PNC para stock en bodega de almacén",
  );
  assert.equal(
    frase("MANTENIMIENTO DEL AIRE ACONDICIONADO; PLACA: O0790BBH, LÍNEA: HILUX"),
    // Después de ":" o ";" empieza un valor nuevo: «Marca: Toyota», «Línea: Hilux»
    "Mantenimiento del aire acondicionado; Placa: O0790BBH, línea: Hilux",
  );
  assert.equal(frase("REPARACIÓN PARA BIEN: 005E3F60 AIRE ACONDICIONADO<br />"), "Reparación para bien: 005E3F60 aire acondicionado");
  assert.equal(frase("MINI SPLIT DE 36000BTU DE 3TONS, 1 UNIDAD(ES)"), "Mini split de 36000BTU de 3tons, 1 unidad(es)");
});

test("si el texto ya trae mayúsculas y minúsculas, no se toca", () => {
  assert.equal(frase("Mantenimiento y reparación del sistema de aire"), "Mantenimiento y reparación del sistema de aire");
});

test("nombres propios con siglas entre guiones", () => {
  assert.equal(tituloPropio("INSTITUTO GUATEMALTECO DE SEGURIDAD SOCIAL -IGSS-"), "Instituto Guatemalteco de Seguridad Social -IGSS-");
  assert.equal(tituloPropio("MUNICIPALIDAD DE SAN JUAN SACATEPEQUEZ"), "Municipalidad de San Juan Sacatepequez");
  // "mil" no es un número romano
  assert.equal(frase("COMPRA DE MIL CUADERNOS"), "Compra de mil cuadernos");
});

test("limpia HTML y nombres de archivo", () => {
  assert.equal(limpiarHtml("A &amp; B<br />C"), "A & B C");
  assert.equal(
    nombreArchivo("http://www.guatecompras.gt/concursos/files/6513/32560567@3.%20CONVOCATORIA%20NOG%2032560567.pdf"),
    "3. CONVOCATORIA NOG 32560567.pdf",
  );
});
