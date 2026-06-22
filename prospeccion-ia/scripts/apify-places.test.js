#!/usr/bin/env node
/**
 * Tests del mapper Apify -> lead (sin deps, node --test nativo).
 * Ejecutar: node --test scripts/apify-places.test.js   (desde prospeccion-ia/)
 */
const { test } = require("node:test");
const assert = require("node:assert");
const { mapeaActorItem } = require("./apify-places.js");

test("mapea item con web propia + email", () => {
  const r = mapeaActorItem({
    placeId: "ChIJ_X",
    title: "Estudio Contable Piura",
    website: "https://www.estudiox.com.pe/inicio",
    phone: "073 309000",
    address: "Av. Grau 123, Piura 20001",
    emails: ["contacto@estudiox.com.pe", "ventas@estudiox.com.pe"],
    totalScore: 4.6,
    reviewsCount: 32,
  });
  assert.equal(r.place_id, "ChIJ_X");
  assert.equal(r.empresa, "Estudio Contable Piura");
  assert.equal(r.dominio, "estudiox.com.pe");
  assert.equal(r.web_propia, true);
  assert.equal(r.email, "contacto@estudiox.com.pe");
  assert.equal(r.telefono, "073 309000");
  assert.equal(r.rating, 4.6);
  assert.equal(r.resenas, 32);
  assert.equal(r.estado_negocio, "OPERATIONAL");
});

test("web de red social -> web_propia false, dominio normalizado", () => {
  const r = mapeaActorItem({ placeId: "p2", title: "X", website: "https://www.facebook.com/estudiox" });
  assert.equal(r.dominio, "facebook.com");
  assert.equal(r.web_propia, false);
});

test("sin website -> dominio null, web_propia false, email vacío", () => {
  const r = mapeaActorItem({ placeId: "p3", title: "X" });
  assert.equal(r.dominio, null);
  assert.equal(r.web_propia, false);
  assert.equal(r.email, "");
});

test("fallbacks de campos (phoneUnformatted, rating, reviewsCount, id)", () => {
  const r = mapeaActorItem({ id: "p4", name: "Y", phoneUnformatted: "+51987654321", rating: 4.1, userRatingCount: 7 });
  assert.equal(r.place_id, "p4");
  assert.equal(r.empresa, "Y");
  assert.equal(r.telefono, "+51987654321");
  assert.equal(r.rating, 4.1);
  assert.equal(r.resenas, 7);
});

test("negocio cerrado -> estado_negocio CLOSED", () => {
  const r = mapeaActorItem({ placeId: "p5", title: "Z", permanentlyClosed: true });
  assert.equal(r.estado_negocio, "CLOSED");
});
