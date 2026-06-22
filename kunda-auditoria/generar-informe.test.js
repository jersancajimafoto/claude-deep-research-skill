#!/usr/bin/env node
/**
 * Test de regresión: el generador debe escapar HTML del cliente en TODOS los
 * campos de texto (hallazgos Y nombres de páginas), para que < > & no rompan
 * el render ni permitan inyección.
 *
 * Integración (sin deps): corre el CLI sobre un config temporal y revisa el HTML.
 * Ejecutar: node --test generar-informe.test.js   (desde kunda-auditoria/)
 */
const { test, after } = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DIR = __dirname;
const CLIENTE = "ZZ QA Escape";
const SLUG = "zz-qa-escape";
const cfgPath = path.join(DIR, "_qa-escape-cfg.json");
const htmlPath = path.join(DIR, `informe-${SLUG}.html`);

const cfg = {
  cliente: CLIENTE,
  url: "https://x.test",
  hallazgos: [{ prioridad: "alta", titulo: "T <script>a()</script> & b", problema: "p < q" }],
  paginas: [{ nombre: "Pg <script>b()</script> & c", performance: 50, seo: 80, accessibility: 70, bestPractices: 90 }],
};

function generar() {
  fs.writeFileSync(cfgPath, JSON.stringify(cfg));
  execFileSync("node", [path.join(DIR, "generar-informe.js"), cfgPath], { stdio: "ignore" });
  return fs.readFileSync(htmlPath, "utf8");
}

after(() => {
  for (const f of [cfgPath, htmlPath]) { try { fs.unlinkSync(f); } catch {} }
});

test("nombre de página se escapa (no inyecta HTML crudo)", () => {
  const html = generar();
  assert.ok(!html.includes("<script>b()</script>"), "el <script> del nombre de página NO debe aparecer crudo");
  assert.ok(html.includes("Pg &lt;script&gt;b()&lt;/script&gt; &amp; c"), "el nombre de página debe estar escapado");
});

test("titulo de hallazgo se escapa", () => {
  const html = generar();
  assert.ok(!html.includes("<script>a()</script>"), "el <script> del hallazgo NO debe aparecer crudo");
  assert.ok(html.includes("T &lt;script&gt;a()&lt;/script&gt; &amp; b"), "el hallazgo debe estar escapado");
});
