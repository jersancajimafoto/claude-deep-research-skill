"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const XLSX = require("xlsx");

const {
  normalizaNombre,
  normalizaTelefono,
  normalizaCorreo,
  detectaColumnas,
  normalizaLead,
  aRegistroAirtable,
} = require("./mapper");
const { parseCsv, parseXlsx } = require("./parsers");
const { ingestaArchivo } = require("./index");

// ---------- mapper: funciones puras ----------

test("normalizaNombre: trim, colapsa espacios, Title Case con acentos", () => {
  assert.equal(normalizaNombre("  josé  ANCAJIMA  "), "José Ancajima");
  assert.equal(normalizaNombre(""), null);
  assert.equal(normalizaNombre(null), null);
});

test("normalizaTelefono: celular peru -> E.164", () => {
  assert.equal(normalizaTelefono("992889622"), "+51992889622");
  assert.equal(normalizaTelefono("51992889622"), "+51992889622");
  assert.equal(normalizaTelefono("(992) 889-622"), "+51992889622");
});

test("normalizaTelefono: enlaces wa.link y basura -> null", () => {
  assert.equal(normalizaTelefono("https://wa.link/cg263q"), null);
  assert.equal(normalizaTelefono("abc"), null);
  assert.equal(normalizaTelefono(null), null);
});

test("normalizaCorreo: minúsculas + validación", () => {
  assert.equal(normalizaCorreo("  JOSE@Mail.COM "), "jose@mail.com");
  assert.equal(normalizaCorreo("no-es-correo"), null);
  assert.equal(normalizaCorreo(""), null);
});

test("detectaColumnas: mapea alias de encabezados", () => {
  const idx = detectaColumnas({ Empresa: "x", WhatsApp: "y", "Correo electrónico": "z" });
  assert.equal(idx.nombre, "Empresa");
  assert.equal(idx.telefono, "WhatsApp");
  assert.equal(idx.correo, "Correo electrónico");
});

test("normalizaLead: válido cuando hay nombre + un canal", () => {
  const lead = normalizaLead({ nombre: "ana torres", telefono: "987654321", email: "" });
  assert.equal(lead.valido, true);
  assert.equal(lead.nombre, "Ana Torres");
  assert.equal(lead.telefono, "+51987654321");
  assert.equal(lead.correo, null);
});

test("normalizaLead: inválido sin canal de contacto", () => {
  const lead = normalizaLead({ nombre: "ana", telefono: "", email: "" });
  assert.equal(lead.valido, false);
  assert.ok(lead._errores.includes("sin canal de contacto (telefono/correo)"));
});

test("aRegistroAirtable: arma payload fields", () => {
  const reg = aRegistroAirtable(
    { nombre: "Ana Torres", telefono: "+51987654321", correo: null },
    { Origen: "csv-piloto" }
  );
  assert.equal(reg.fields.Nombre, "Ana Torres");
  assert.equal(reg.fields.Telefono, "+51987654321");
  assert.equal(reg.fields.Estado, "Nuevo");
  assert.equal(reg.fields.Origen, "csv-piloto");
  assert.match(reg.fields["Fecha ingesta"], /^\d{4}-\d{2}-\d{2}$/);
});

// ---------- parsers: smoke con archivos temporales ----------

test("parseCsv: lee filas y respeta encabezados", async () => {
  const f = path.join(os.tmpdir(), `ingesta-${Date.now()}.csv`);
  fs.writeFileSync(f, "nombre,telefono,email\nAna,987654321,ana@mail.com\n");
  const filas = await parseCsv(f);
  fs.unlinkSync(f);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].nombre, "Ana");
});

test("parseXlsx: lee primera hoja", () => {
  const f = path.join(os.tmpdir(), `ingesta-${Date.now()}.xlsx`);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["nombre", "telefono", "email"],
    ["Bruno Díaz", "912345678", "bruno@mail.com"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, f);
  const filas = parseXlsx(f);
  fs.unlinkSync(f);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].nombre, "Bruno Díaz");
});

// ---------- orquestador end-to-end ----------

test("ingestaArchivo: CSV -> registros Airtable + descarta inválidos", async () => {
  const f = path.join(os.tmpdir(), `ingesta-e2e-${Date.now()}.csv`);
  fs.writeFileSync(
    f,
    "empresa,whatsapp,email\n" +
      "Ana Torres,987654321,ANA@mail.com\n" +
      ",,\n" + // fila vacía -> descartada
      "Bruno,https://wa.link/x,bruno@mail.com\n"
  );
  const r = await ingestaArchivo(f, { origen: "csv-piloto", borrarTrasLeer: true });
  assert.equal(r.total, 3);
  assert.equal(r.validos, 2);
  assert.equal(r.invalidos, 1);
  assert.equal(r.registros[0].fields.Correo, "ana@mail.com");
  // Bruno sin teléfono usable (wa.link) pero con correo -> sigue válido
  assert.equal(r.registros[1].fields.Telefono, "");
  assert.equal(r.registros[1].fields.Correo, "bruno@mail.com");
  // los descartados no exponen PII
  assert.ok(!("nombre" in r.descartados[0]));
});
