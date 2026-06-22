#!/usr/bin/env node
/**
 * Tests de cumplimiento de los mensajes de outreach (sin deps, node --test).
 * Ejecutar: node --test scripts/genera-mensajes.test.js   (desde prospeccion-ia/)
 *
 * Requisito legal: todo mensaje de contacto en frío debe ofrecer opt-out.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { mensajeAuditoria, mensajeAutomatizacion, scoreParaMensajes, puedeGenerar } = require("./genera-mensajes.js");

test("mensaje de automatización incluye opt-out (BAJA)", () => {
  const m = mensajeAutomatizacion({ empresa: "Estudio X", dominio: "facebook.com" }, "Jer");
  assert.match(m, /\bBAJA\b/i);
});

test("mensaje de auditoría (sin web) incluye opt-out (BAJA)", () => {
  const m = mensajeAuditoria({ empresa: "Estudio Y", dominio: null }, {}, "contadores", "Jer");
  assert.match(m, /\bBAJA\b/i);
});

test("mensaje de auditoría (web propia) incluye opt-out (BAJA)", () => {
  const m = mensajeAuditoria({ empresa: "Estudio Z", dominio: "estudioz.com.pe" }, {}, "contadores", "Jer");
  assert.match(m, /\bBAJA\b/i);
});

test("scoreParaMensajes: lead fuera de la ciudad queda descalificado (filtro geo aplica)", () => {
  const lima = { place_id: "x", empresa: "Estudio Lima", dominio: null, telefono: "987654321", ubicacion: "Av. Arequipa 100, Lima 15001", resenas: 5 };
  const s = scoreParaMensajes(lima, "Piura", "20");
  assert.equal(s.descalificado, true);
  assert.match(s.problema_detectado, /Fuera de Piura/);
});

test("scoreParaMensajes: lead en la ciudad NO se descalifica por geo", () => {
  const piura = { place_id: "y", empresa: "Estudio Piura", dominio: null, telefono: "987654321", ubicacion: "Av. Grau 100, Piura 20001", resenas: 5 };
  const s = scoreParaMensajes(piura, "Piura", "20");
  assert.match(s.problema_detectado, /^(?!.*Fuera de Piura).*$/);
});

test("puedeGenerar: sin listas → permite", () => {
  assert.equal(puedeGenerar("51977777777", {}), true);
});

test("puedeGenerar: en opt-out → bloquea (BAJA manda)", () => {
  const exclusion = new Set(["51999999999"]);
  assert.equal(puedeGenerar("51999999999", { exclusion }), false);
  // normaliza formatos: +51 9.. con espacios también matchea
  assert.equal(puedeGenerar("+51 999 999 999", { exclusion }), false);
});

test("puedeGenerar: con consentidos exigidos, solo pasa quien está", () => {
  const consentidos = new Set(["51988888888"]);
  assert.equal(puedeGenerar("51977777777", { consentidos }), false); // no consintió
  assert.equal(puedeGenerar("51988888888", { consentidos }), true);  // consintió
});

test("puedeGenerar: opt-out manda sobre consentimiento", () => {
  const consentidos = new Set(["51988888888"]);
  const exclusion = new Set(["51988888888"]);
  assert.equal(puedeGenerar("51988888888", { exclusion, consentidos }), false);
});
