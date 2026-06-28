"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  addDays, esFechaISO, nuevoToque, aplicarToque, recordatoriosDelDia, payloadToque,
} = require("./seguimientoService");

test("addDays suma días en UTC", () => {
  assert.equal(addDays("2026-06-27", 3), "2026-06-30");
  assert.equal(addDays("2026-06-30", 1), "2026-07-01");
  assert.throws(() => addDays("no-fecha", 1), TypeError);
});

test("esFechaISO valida formato", () => {
  assert.equal(esFechaISO("2026-06-27"), true);
  assert.equal(esFechaISO("27/06/2026"), false);
  assert.equal(esFechaISO(null), false);
});

test("nuevoToque valida canal/resultado/fecha", () => {
  assert.throws(() => nuevoToque({ canal: "fax", resultado: "contactado", fecha: "2026-06-27" }), /canal/);
  assert.throws(() => nuevoToque({ canal: "whatsapp", resultado: "x", fecha: "2026-06-27" }), /resultado/);
  assert.throws(() => nuevoToque({ canal: "whatsapp", resultado: "contactado", fecha: "ayer" }), /fecha/);
  assert.throws(() => nuevoToque({ canal: "whatsapp", resultado: "agendado", fecha: "2026-06-27" }), /fechaAgenda/);
});

test("aplicarToque: contactado -> En seguimiento +3 días", () => {
  const r = aplicarToque({ estado: "Nuevo", intentos: 0 }, { canal: "whatsapp", resultado: "contactado", fecha: "2026-06-27" });
  assert.equal(r.estado, "En seguimiento");
  assert.equal(r.intentos, 1);
  assert.equal(r.proximoContacto, "2026-06-30");
});

test("aplicarToque: agendado usa fechaAgenda", () => {
  const r = aplicarToque({ estado: "Contactado", intentos: 1 }, { canal: "llamada", resultado: "agendado", fecha: "2026-06-27", fechaAgenda: "2026-07-05" });
  assert.equal(r.estado, "En seguimiento");
  assert.equal(r.proximoContacto, "2026-07-05");
});

test("aplicarToque: sin_respuesta hace backoff y luego Perdido", () => {
  let s = { estado: "Nuevo", intentos: 0 };
  const fechas = ["2026-06-01", "2026-06-02", "2026-06-04", "2026-06-08", "2026-06-15"];
  const esperados = ["2026-06-02", "2026-06-04", "2026-06-08", "2026-06-15", null]; // +1,+2,+4,+7, agotado
  const estados = [];
  for (let i = 0; i < 5; i++) {
    s = aplicarToque(s, { canal: "whatsapp", resultado: "sin_respuesta", fecha: fechas[i] });
    assert.equal(s.proximoContacto, esperados[i], `intento ${i + 1}`);
    estados.push(s.estado);
  }
  assert.equal(estados[0], "Contactado");
  assert.equal(s.estado, "Perdido"); // 5º intento agota backoff
});

test("aplicarToque: ganado / no_interesado cierran sin próximo contacto", () => {
  const g = aplicarToque({ estado: "En seguimiento", intentos: 2 }, { canal: "whatsapp", resultado: "ganado", fecha: "2026-06-27" });
  assert.equal(g.estado, "Ganado");
  assert.equal(g.proximoContacto, null);
  const p = aplicarToque({ estado: "En seguimiento", intentos: 2 }, { canal: "whatsapp", resultado: "no_interesado", fecha: "2026-06-27" });
  assert.equal(p.estado, "Perdido");
});

test("aplicarToque no muta la entrada", () => {
  const entrada = { estado: "Nuevo", intentos: 0 };
  aplicarToque(entrada, { canal: "whatsapp", resultado: "contactado", fecha: "2026-06-27" });
  assert.deepEqual(entrada, { estado: "Nuevo", intentos: 0 });
});

test("recordatoriosDelDia filtra activos vencidos", () => {
  const leads = [
    { id: "a", estado: "En seguimiento", proximoContacto: "2026-06-26" }, // vencido
    { id: "b", estado: "En seguimiento", proximoContacto: "2026-06-27" }, // hoy
    { id: "c", estado: "En seguimiento", proximoContacto: "2026-06-28" }, // futuro
    { id: "d", estado: "Ganado", proximoContacto: "2026-06-26" },         // cerrado
    { id: "e", estado: "Nuevo", proximoContacto: null },                  // sin fecha
  ];
  const r = recordatoriosDelDia(leads, "2026-06-27").map((l) => l.id);
  assert.deepEqual(r, ["a", "b"]);
});

test("payloadToque arma fields con Lead enlazado", () => {
  const p = payloadToque("recABC", { canal: "whatsapp", resultado: "agendado", fecha: "2026-06-27", fechaAgenda: "2026-07-01", nota: " sigue " });
  assert.deepEqual(p.fields.Lead, ["recABC"]);
  assert.equal(p.fields.Canal, "whatsapp");
  assert.equal(p.fields.Nota, "sigue");
  assert.equal(p.fields["Próximo contacto"], "2026-07-01");
});
