"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { calcularMetricas, conversionPor, pct } = require("./metricasService");

// Dataset SINTÉTICO (sin PII): 10 leads en distintos estados.
const LEADS = [
  { estado: "Ganado", categoria: "Alta", score: 90, origen: "referido" },
  { estado: "Ganado", categoria: "Alta", score: 85, origen: "web" },
  { estado: "En seguimiento", categoria: "Alta", score: 80, origen: "referido" },
  { estado: "En seguimiento", categoria: "Media", score: 55, origen: "csv" },
  { estado: "Contactado", categoria: "Media", score: 50, origen: "csv" },
  { estado: "Perdido", categoria: "Baja", score: 20, origen: "csv" },
  { estado: "Perdido", categoria: "Baja", score: 15, origen: "web" },
  { estado: "Nuevo", categoria: "Media", score: 45, origen: "csv" },
  { estado: "Nuevo", categoria: "Alta", score: 75, origen: "referido" },
  { estado: "Nuevo", categoria: "Baja", score: 10, origen: "web" },
];

test("pct redondea y evita división por cero", () => {
  assert.equal(pct(1, 4), 25);
  assert.equal(pct(1, 3), 33.3);
  assert.equal(pct(5, 0), 0);
});

test("calcularMetricas: totales y conteos", () => {
  const m = calcularMetricas(LEADS);
  assert.equal(m.total, 10);
  assert.equal(m.ganados, 2);
  assert.equal(m.perdidos, 2);
  assert.equal(m.porEstado["Nuevo"], 3);
  assert.equal(m.activos, 3 + 1 + 2); // Nuevo3 + Contactado1 + Enseg2 = 6
});

test("calcularMetricas: tasas de conversión", () => {
  const m = calcularMetricas(LEADS);
  assert.equal(m.contactados, 7); // 10 - 3 nuevos
  assert.equal(m.tasaContacto, 70);
  assert.equal(m.conversionGlobal, 20); // 2/10
  assert.equal(m.conversionEfectiva, pct(2, 7)); // 28.6
});

test("calcularMetricas: scorePromedio", () => {
  const m = calcularMetricas(LEADS);
  const esperado = Math.round((90 + 85 + 80 + 55 + 50 + 20 + 15 + 45 + 75 + 10) / 10 * 10) / 10;
  assert.equal(m.scorePromedio, esperado); // 52.5
});

test("calcularMetricas: embudo", () => {
  const m = calcularMetricas(LEADS);
  assert.deepEqual(m.embudo, { Nuevo: 3, Contactado: 1, "En seguimiento": 2, Ganado: 2, Perdido: 2 });
});

test("conversionPor categoria: Alta convierte más que Baja", () => {
  const c = conversionPor(LEADS, "categoria");
  assert.equal(c["Alta"].total, 4);
  assert.equal(c["Alta"].ganados, 2);
  assert.equal(c["Alta"].conversion, 50);
  assert.equal(c["Baja"].conversion, 0);
});

test("conversionPor origen", () => {
  const c = conversionPor(LEADS, "origen");
  assert.equal(c["referido"].total, 3);
  assert.equal(c["referido"].ganados, 1);
  assert.equal(c["web"].ganados, 1);
});

test("maneja dataset vacío y campos faltantes", () => {
  const m = calcularMetricas([]);
  assert.equal(m.total, 0);
  assert.equal(m.conversionGlobal, 0);
  const c = conversionPor([{ estado: "Ganado" }], "origen");
  assert.equal(c["(sin dato)"].conversion, 100);
});

test("entrada no-array lanza", () => {
  assert.throws(() => calcularMetricas("x"), TypeError);
  assert.throws(() => conversionPor(null, "origen"), TypeError);
});
