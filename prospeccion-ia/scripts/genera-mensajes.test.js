#!/usr/bin/env node
/**
 * Tests de cumplimiento de los mensajes de outreach (sin deps, node --test).
 * Ejecutar: node --test scripts/genera-mensajes.test.js   (desde prospeccion-ia/)
 *
 * Requisito legal: todo mensaje de contacto en frío debe ofrecer opt-out.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { mensajeAuditoria, mensajeAutomatizacion } = require("./genera-mensajes.js");

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
