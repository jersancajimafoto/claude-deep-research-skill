"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  scoreLead,
  categoriaDe,
  telefonoWhatsAppValido,
  correoValido,
} = require("./scoringService");

// Leads SINTÉTICOS (datos ficticios, sin PII real).

test("lead completo y de alta calidad -> Alta (~100)", () => {
  const r = scoreLead({
    nombre: "Lead Demo",
    telefono: "+51987654321", // móvil Perú E.164
    correo: "demo@example.com",
    empresa: "Empresa Demo SAC",
    origen: "referido", // +10
  });
  assert.equal(r.score, 100); // 20+30+25+15+10
  assert.equal(r.categoria, "Alta");
});

test("solo teléfono WhatsApp + nombre -> Media", () => {
  const r = scoreLead({
    nombre: "Solo Tel",
    telefono: "+51912345678",
    correo: "",
    empresa: "",
    origen: "csv", // +5
  });
  assert.equal(r.score, 30 + 15 + 5); // 50
  assert.equal(r.categoria, "Media");
});

test("lead pobre (origen desconocido) -> Baja, nunca bajo 1", () => {
  const r = scoreLead({
    nombre: "",
    telefono: "",
    correo: "",
    empresa: "",
    origen: "desconocido", // -> otro = 3
  });
  assert.equal(r.score, 3);
  assert.equal(r.categoria, "Baja");
});

test("objeto vacío -> score mínimo 1 (origen otro=3 en realidad)", () => {
  const r = scoreLead({});
  assert.equal(r.score, 3); // solo peso origen default
  assert.equal(r.categoria, "Baja");
});

test("correo inválido no suma", () => {
  const r = scoreLead({ correo: "no-es-correo", empresa: "X SAC", origen: "web" });
  assert.equal(r.desglose.correo, 0);
  assert.equal(r.desglose.empresa, 25);
});

test("teléfono Perú sin prefijo móvil 9 -> inválido", () => {
  assert.equal(telefonoWhatsAppValido("+5112345678"), false); // fijo
  assert.equal(telefonoWhatsAppValido("+51987654321"), true); // móvil
});

test("E.164 de otro país se acepta", () => {
  assert.equal(telefonoWhatsAppValido("+14155552671"), true);
  assert.equal(telefonoWhatsAppValido("987654321"), false); // sin +
  assert.equal(telefonoWhatsAppValido("+51 987 654 321"), false); // espacios
});

test("correoValido casos límite", () => {
  assert.equal(correoValido("  a@b.co "), true);
  assert.equal(correoValido("a@b"), false);
  assert.equal(correoValido(null), false);
});

test("desglose suma exactamente al score (sin clamp)", () => {
  const r = scoreLead({
    nombre: "N",
    correo: "n@x.com",
    empresa: "Z SAC",
    origen: "evento",
  });
  const suma = Object.values(r.desglose).reduce((a, b) => a + b, 0);
  assert.equal(r.score, suma);
  assert.equal(suma, 20 + 25 + 15 + 8); // 68 -> Media
  assert.equal(r.categoria, "Media");
});

test("categoriaDe umbrales", () => {
  assert.equal(categoriaDe(70), "Alta");
  assert.equal(categoriaDe(69), "Media");
  assert.equal(categoriaDe(40), "Media");
  assert.equal(categoriaDe(39), "Baja");
});

test("entrada no-objeto lanza TypeError", () => {
  assert.throws(() => scoreLead(null), TypeError);
  assert.throws(() => scoreLead("x"), TypeError);
});
