#!/usr/bin/env node
/**
 * Tests del checker determinista de señales GEO (sin deps, node --test).
 * Ejecutar: node --test geo-signals.test.js   (desde kunda-auditoria/)
 *
 * Cubre lo MECÁNICO del diagnóstico citation-readiness: JSON-LD, meta keywords
 * obsoleto, FAQ en HTML, bloque-definición, NAP. Lo de juicio (E-E-A-T, calidad
 * de stats) queda fuera a propósito — eso es revisión manual.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { analizaSenalesGeo } = require("./geo-signals.js");

const SITIO_BUENO = `<!doctype html><html><head>
  <title>BlueContadores</title>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"BlueContadores","telephone":"+51 987 654 321"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}</script>
  </head><body>
  <p>BlueContadores es un estudio contable y tributario en Piura, Peru, con mas de dieciseis anos de experiencia atendiendo a mypes, pymes y grandes empresas en gestion contable, tributaria y laboral.</p>
  <h2>¿Cual es el mejor estudio contable en Piura?</h2>
  <h2>¿Cuanto cuesta un contador en Piura?</h2>
  <h3>¿Que servicios necesita una mype?</h3>
  <address>Av. Grau 123, Piura</address>
  <a href="tel:+51987654321">Llamanos</a>
  <a href="mailto:hola@blue.pe">Email</a>
  <a href="https://www.google.com/maps/place/blue">Ubicacion</a>
  </body></html>`;

const SITIO_MALO = `<!doctype html><html><head>
  <title>Estudio X</title>
  <meta name="keywords" content="contador, piura, contabilidad">
  </head><body>
  <p>Bienvenidos.</p>
  <div>Somos tu aliado estrategico.</div>
  <a href="tel:073309000">Telefono</a>
  </body></html>`;

test("sitio bueno: JSON-LD LocalBusiness + FAQPage -> pass", () => {
  const r = analizaSenalesGeo(SITIO_BUENO);
  assert.equal(r.jsonLd.state, "pass");
  assert.ok(r.jsonLd.types.includes("LocalBusiness"));
  assert.ok(r.jsonLd.types.includes("FAQPage"));
});

test("sitio bueno: sin meta keywords -> pass", () => {
  assert.equal(analizaSenalesGeo(SITIO_BUENO).metaKeywords.state, "pass");
});

test("sitio bueno: FAQ presente -> pass", () => {
  assert.equal(analizaSenalesGeo(SITIO_BUENO).faq.state, "pass");
});

test("sitio bueno: bloque-definicion >=25 palabras -> pass", () => {
  const r = analizaSenalesGeo(SITIO_BUENO);
  assert.equal(r.definicion.state, "pass");
  assert.ok(r.definicion.palabras >= 25);
});

test("sitio bueno: NAP completo -> pass", () => {
  const nap = analizaSenalesGeo(SITIO_BUENO).nap;
  assert.equal(nap.telefono, true);
  assert.equal(nap.email, true);
  assert.equal(nap.direccion, true);
  assert.equal(nap.googleBusiness, true);
  assert.equal(nap.state, "pass");
});

test("AccountingService (subtipo de LocalBusiness) cuenta como LocalBusiness", () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@type":"AccountingService","name":"X"}</script>
    <script type="application/ld+json">{"@type":"FAQPage"}</script>
    </head><body></body></html>`;
  const r = analizaSenalesGeo(html);
  assert.equal(r.jsonLd.state, "pass"); // AccountingService + FAQPage => completo
  assert.ok(!/falta LocalBusiness/.test(r.jsonLd.detail));
});

test("sitio malo: sin JSON-LD -> fail", () => {
  assert.equal(analizaSenalesGeo(SITIO_MALO).jsonLd.state, "fail");
});

test("sitio malo: meta keywords obsoleto -> warn", () => {
  assert.equal(analizaSenalesGeo(SITIO_MALO).metaKeywords.state, "warn");
});

test("sitio malo: sin FAQ -> fail", () => {
  assert.equal(analizaSenalesGeo(SITIO_MALO).faq.state, "fail");
});

test("sitio malo: definicion corta -> fail", () => {
  assert.equal(analizaSenalesGeo(SITIO_MALO).definicion.state, "fail");
});

test("sitio malo: NAP incompleto (solo tel) -> warn/fail, email false", () => {
  const nap = analizaSenalesGeo(SITIO_MALO).nap;
  assert.equal(nap.telefono, true);
  assert.equal(nap.email, false);
  assert.notEqual(nap.state, "pass");
});

test("resumen cuenta pass/warn/fail", () => {
  const r = analizaSenalesGeo(SITIO_BUENO);
  assert.equal(typeof r.resumen.pass, "number");
  assert.ok(r.resumen.pass + r.resumen.warn + r.resumen.fail >= 5);
});
