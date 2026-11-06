import { test } from "node:test";
import assert from "node:assert/strict";
import { calificar } from "./calificar";

const base = { resumen: "", a_favor: [], en_contra: [], que_falta: [] };

test("suma los criterios y decide el veredicto", () => {
  const r = calificar({ ...base, puntos_rubro: 48, puntos_zona: 20, puntos_monto: 5, puntos_condiciones: 5 });
  assert.equal(r.puntaje, 78);
  assert.equal(r.veredicto, "revisar"); // sin monto ni condiciones conocidas no llega a «conviene»
  assert.deepEqual(r.desglose, { rubro: 48, zona: 20, monto: 5, condiciones: 5 });
});

test("con monto y condiciones favorables, conviene", () => {
  assert.equal(calificar({ ...base, puntos_rubro: 48, puntos_zona: 20, puntos_monto: 15, puntos_condiciones: 12 }).veredicto, "conviene");
});

test("si no es su rubro, no conviene aunque todo lo demás sume", () => {
  assert.equal(calificar({ ...base, puntos_rubro: 20, puntos_zona: 20, puntos_monto: 15, puntos_condiciones: 15 }).veredicto, "no_conviene");
});

test("acota puntos fuera de rango", () => {
  assert.equal(calificar({ ...base, puntos_rubro: 80, puntos_zona: -3, puntos_monto: 15, puntos_condiciones: 15 }).puntaje, 80);
});
