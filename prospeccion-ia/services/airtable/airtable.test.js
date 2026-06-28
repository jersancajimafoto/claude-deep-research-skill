"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  crearAirtableService,
  construirPayload,
  enLotes,
  LIMITE_LOTE,
} = require("./airtableService");

// Credenciales FICTICIAS solo para tests (no son reales, no hay PII).
const CFG_BASE = { apiKey: "key_test_ficticia", baseId: "appTEST", tabla: "Leads", pausaMs: 0 };

// fetch falso: registra llamadas y responde OK con N ids.
function fakeFetchOk(registro) {
  return async (url, opts) => {
    const body = JSON.parse(opts.body);
    registro.push({ url, auth: opts.headers.Authorization, count: body.records.length });
    return {
      ok: true,
      status: 200,
      json: async () => ({ records: body.records.map((_, i) => ({ id: `rec${i}` })) }),
    };
  };
}

// ---------- construirPayload (puro) ----------

test("construirPayload une lead + scoring en fields", () => {
  const p = construirPayload(
    { nombre: "Lead Demo", telefono: "+51987654321", correo: "demo@example.com", empresa: "Demo SAC", origen: "csv" },
    { score: 88, categoria: "Alta", desglose: { correo: 20, telefono: 30 } }
  );
  assert.equal(p.fields.Nombre, "Lead Demo");
  assert.equal(p.fields["Teléfono"], "+51987654321");
  assert.equal(p.fields.Correo, "demo@example.com");
  assert.equal(p.fields.Score, 88);
  assert.equal(p.fields["Categoría"], "Alta");
  assert.equal(p.fields.Desglose, JSON.stringify({ correo: 20, telefono: 30 }));
  assert.match(p.fields["Fecha ingesta"], /^\d{4}-\d{2}-\d{2}$/);
});

test("construirPayload tolera campos faltantes", () => {
  const p = construirPayload({}, {});
  assert.equal(p.fields.Nombre, "");
  assert.equal(p.fields.Score, null);
  assert.equal(p.fields.Desglose, "{}");
});

// ---------- enLotes ----------

test("enLotes divide en trozos de 10", () => {
  const arr = Array.from({ length: 23 }, (_, i) => i);
  const lotes = enLotes(arr, LIMITE_LOTE);
  assert.equal(lotes.length, 3);
  assert.deepEqual(lotes.map((l) => l.length), [10, 10, 3]);
});

// ---------- seguridad: credenciales ----------

test("lanza si falta API Key (no hardcodeada)", () => {
  const prev = process.env.AIRTABLE_API_KEY;
  delete process.env.AIRTABLE_API_KEY;
  assert.throws(() => crearAirtableService({ baseId: "appX" }), /AIRTABLE_API_KEY/);
  if (prev !== undefined) process.env.AIRTABLE_API_KEY = prev;
});

test("usa Bearer con la key inyectada en el header", async () => {
  const reg = [];
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fakeFetchOk(reg) });
  await svc.insertarLeads([construirPayload({ nombre: "A" }, { score: 10, categoria: "Baja" })]);
  assert.equal(reg[0].auth, "Bearer key_test_ficticia");
  assert.match(reg[0].url, /appTEST\/Leads$/);
});

// ---------- batching ----------

test("insertarLeads agrupa en lotes de <=10", async () => {
  const reg = [];
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fakeFetchOk(reg) });
  const payloads = Array.from({ length: 25 }, (_, i) => construirPayload({ nombre: "L" + i }, { score: 50, categoria: "Media" }));
  const r = await svc.insertarLeads(payloads);
  assert.equal(r.total, 25);
  assert.equal(r.insertados, 25);
  assert.equal(r.fallidos, 0);
  assert.equal(reg.length, 3); // 3 requests
  assert.deepEqual(reg.map((x) => x.count), [10, 10, 5]);
});

// ---------- tolerancia a fallos ----------

test("un lote que falla no detiene los demás", async () => {
  let llamada = 0;
  const fetchMixto = async (url, opts) => {
    llamada++;
    const body = JSON.parse(opts.body);
    if (llamada === 2) return { ok: false, status: 422, json: async () => ({ error: { type: "INVALID", message: "campo malo" } }) };
    return { ok: true, status: 200, json: async () => ({ records: body.records.map((_, i) => ({ id: `r${i}` })) }) };
  };
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fetchMixto });
  const payloads = Array.from({ length: 25 }, (_, i) => construirPayload({ nombre: "L" + i }, { score: 50, categoria: "Media" }));
  const r = await svc.insertarLeads(payloads);
  assert.equal(r.insertados, 15); // lotes 1 y 3 ok (10+5), lote 2 falla
  assert.equal(r.fallidos, 10);
  const loteMalo = r.lotes.find((l) => !l.ok);
  assert.match(loteMalo.error, /INVALID/);
});

test("error de red (fetch throw) se captura, no propaga", async () => {
  const fetchBoom = async () => { throw new Error("ECONNRESET"); };
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fetchBoom });
  const r = await svc.insertarLeads([construirPayload({ nombre: "A" }, { score: 10, categoria: "Baja" })]);
  assert.equal(r.insertados, 0);
  assert.equal(r.fallidos, 1);
  assert.match(r.lotes[0].error, /ECONNRESET/);
});

test("insertarLeads exige array", () => {
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fakeFetchOk([]) });
  assert.rejects(() => svc.insertarLeads("no-array"), TypeError);
});

// ---------- listar / obtener / actualizar (nuevos) ----------

test("listar sigue paginación (offset) y agrega registros", async () => {
  let llamada = 0;
  const fetchPaginado = async (url) => {
    llamada++;
    if (llamada === 1) return { ok: true, status: 200, json: async () => ({ records: [{ id: "r1", fields: {} }], offset: "off1" }) };
    return { ok: true, status: 200, json: async () => ({ records: [{ id: "r2", fields: {} }] }) };
  };
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fetchPaginado });
  const recs = await svc.listar("Leads", { fields: ["Nombre"], pageSize: 1 });
  assert.deepEqual(recs.map((r) => r.id), ["r1", "r2"]);
  assert.equal(llamada, 2);
});

test("listar usa GET con Bearer y propaga filtro/fields en la URL", async () => {
  let capturada;
  const fetchSpy = async (url, opts) => {
    capturada = { url, method: opts.method, auth: opts.headers.Authorization };
    return { ok: true, status: 200, json: async () => ({ records: [] }) };
  };
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: fetchSpy });
  await svc.listar("Leads", { filterByFormula: "{Estado}='Nuevo'", fields: ["Nombre", "Estado"] });
  assert.equal(capturada.method, "GET");
  assert.equal(capturada.auth, "Bearer key_test_ficticia");
  assert.match(capturada.url, /filterByFormula=/);
  assert.match(capturada.url, /fields%5B%5D=Nombre/); // fields[]=Nombre
});

test("obtener devuelve null en 404", async () => {
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({}) }) });
  assert.equal(await svc.obtener("Leads", "recX"), null);
});

test("actualizar hace PATCH en lotes y reporta actualizados", async () => {
  const reg = [];
  const svc = crearAirtableService({ ...CFG_BASE, fetchImpl: (url, opts) => {
    const body = JSON.parse(opts.body);
    reg.push(opts.method);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ records: body.records.map((r) => ({ id: r.id })) }) });
  } });
  const r = await svc.actualizar("Leads", [{ id: "rec1", fields: { Estado: "Ganado" } }]);
  assert.equal(r.actualizados, 1);
  assert.equal(r.fallidos, 0);
  assert.equal(reg[0], "PATCH");
});
