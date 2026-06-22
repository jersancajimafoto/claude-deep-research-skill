#!/usr/bin/env node
/**
 * Tests de clasificaWeb (sin deps, node --test nativo).
 * Ejecutar: node --test scripts/score-lead.test.js   (desde prospeccion-ia/)
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { clasificaWeb, scoreLead } = require("./score-lead.js");

test("sin dominio -> ninguna", () => {
  assert.equal(clasificaWeb({ dominio: null }), "ninguna");
  assert.equal(clasificaWeb({}), "ninguna");
});

test("dominio limpio de red social -> red_social", () => {
  assert.equal(clasificaWeb({ dominio: "facebook.com" }), "red_social");
  assert.equal(clasificaWeb({ dominio: "instagram.com" }), "red_social");
});

test("red social con protocolo/www/path -> red_social (normaliza)", () => {
  assert.equal(clasificaWeb({ dominio: "https://www.facebook.com/pagina" }), "red_social");
  assert.equal(clasificaWeb({ dominio: "WWW.Instagram.com/user" }), "red_social");
  assert.equal(clasificaWeb({ dominio: "http://tiktok.com/@cuenta?x=1" }), "red_social");
});

test("sitio gratis con ruido -> gratis (normaliza)", () => {
  assert.equal(clasificaWeb({ dominio: "https://negocio.site/inicio" }), "gratis");
  assert.equal(clasificaWeb({ dominio: "miempresa.wixsite.com/web" }), "gratis");
});

test("web propia real -> propia", () => {
  assert.equal(clasificaWeb({ dominio: "https://miempresa.com.pe" }), "propia");
  assert.equal(clasificaWeb({ dominio: "estudiocontable.pe" }), "propia");
});

test("scoreDolor: red social con URL cruda rutea a Automatización IA", () => {
  const r = scoreLead(
    { place_id: "x", empresa: "Estudio X", dominio: "https://www.facebook.com/estudiox",
      telefono: "987654321", ubicacion: "Piura 20001", resenas: 3 },
    { modo: "dolor", ciudad: "Piura", cpPrefijo: "20" }
  );
  assert.equal(r.oferta, "Automatización IA");
});
