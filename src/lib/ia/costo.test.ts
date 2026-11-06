import { test } from "node:test";
import assert from "node:assert/strict";
import { costoHaiku } from "./costo";

test("costo con la tarifa normal (hasta 100K tokens de entrada)", () => {
  // Un PDF de ~20 páginas: 40K de entrada y 4K de salida → $0.004 + $0.002
  assert.equal(costoHaiku(40_000, 4_000).toFixed(4), "0.0060");
});

test("costo con la tarifa de prompts largos (más de 100K)", () => {
  assert.equal(costoHaiku(200_000, 4_000).toFixed(4), "0.1100");
});
