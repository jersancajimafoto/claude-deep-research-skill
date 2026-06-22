#!/usr/bin/env node
/**
 * Checker determinista de señales GEO (citation-readiness) — branding Kunda.
 *
 * Escanea el HTML de una página y detecta las señales MECÁNICAS del diagnóstico
 * GEO (las que no requieren juicio): JSON-LD, meta keywords obsoleto, FAQ en
 * HTML, bloque-definición citable, y NAP. Estandariza la tabla de Diagnóstico
 * entre clientes. Lo de juicio (E-E-A-T, calidad de stats) queda manual.
 *
 * El HTML lo trae quien llame (firecrawl, fetch, o un archivo). Cero deps.
 *
 * Uso CLI:
 *   node geo-signals.js pagina.html
 *   curl -s https://sitio.com | node geo-signals.js -     (lee de stdin)
 */
const fs = require("fs");

// --- helpers de extracción (regex, sin parser DOM) ---
function quitaTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bloquesJsonLd(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { out.push(JSON.parse(m[1].trim())); } catch { /* JSON-LD inválido se ignora */ }
  }
  return out;
}

// Aplana @graph y arrays para recolectar todos los @type.
function tiposJsonLd(bloques) {
  const tipos = new Set();
  const visita = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visita);
    if (node["@type"]) [].concat(node["@type"]).forEach((t) => tipos.add(String(t)));
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(visita);
  };
  bloques.forEach(visita);
  return [...tipos];
}

function parrafos(html) {
  const out = [];
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html))) {
    const txt = quitaTags(m[1]);
    if (txt) out.push(txt);
  }
  return out;
}

function headings(html) {
  const out = [];
  const re = /<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
  let m;
  while ((m = re.exec(html))) {
    const txt = quitaTags(m[1]);
    if (txt) out.push(txt);
  }
  return out;
}

function cuentaPalabras(s) {
  return String(s || "").split(/\s+/).filter(Boolean).length;
}

// --- análisis principal ---
function analizaSenalesGeo(html) {
  html = String(html || "");
  const tipos = tiposJsonLd(bloquesJsonLd(html));

  // 1. JSON-LD: fail si no hay; warn si hay pero falta LocalBusiness o FAQPage; pass si ambos.
  // LocalBusiness tiene muchos subtipos en schema.org (AccountingService, LegalService,
  // Dentist, etc.) — todos cuentan como señal de negocio local.
  const tieneLocal = tipos.some((t) =>
    /LocalBusiness|Organization|AccountingService|LegalService|FinancialService|ProfessionalService|Dentist|Physician|MedicalBusiness|HealthAndBeautyBusiness|HomeAndConstructionBusiness|FoodEstablishment|Restaurant|Store|AutomotiveBusiness|RealEstateAgent/i.test(t)
  );
  const tieneFaqSchema = tipos.some((t) => /FAQPage/i.test(t));
  const jsonLd = (() => {
    if (tipos.length === 0) return { state: "fail", types: [], detail: "Sin JSON-LD (la IA no tiene datos estructurados)" };
    if (tieneLocal && tieneFaqSchema) return { state: "pass", types: tipos, detail: "LocalBusiness + FAQPage presentes" };
    return { state: "warn", types: tipos, detail: `JSON-LD parcial: ${tipos.join(", ")} (falta ${tieneLocal ? "FAQPage" : "LocalBusiness"})` };
  })();

  // 2. meta keywords obsoleto: warn si existe, pass si no.
  const tieneMetaKw = /<meta[^>]+name=["']keywords["'][^>]*>/i.test(html);
  const metaKeywords = tieneMetaKw
    ? { state: "warn", detail: "Tiene <meta keywords> (obsoleto, inútil para SEO/GEO)" }
    : { state: "pass", detail: "Sin meta keywords obsoleto" };

  // 3. FAQ rastreable: pass si FAQPage schema o >=3 headings-pregunta; warn 1-2; fail 0.
  const preguntas = headings(html).filter((h) => h.includes("?")).length;
  const faq = (() => {
    if (tieneFaqSchema || preguntas >= 3) return { state: "pass", count: preguntas, detail: tieneFaqSchema ? "FAQPage schema presente" : `${preguntas} preguntas en HTML` };
    if (preguntas >= 1) return { state: "warn", count: preguntas, detail: `Solo ${preguntas} pregunta(s) en HTML` };
    return { state: "fail", count: 0, detail: "Sin FAQ rastreable en HTML" };
  })();

  // 4. bloque-definición: pass si algún párrafo temprano tiene >=25 palabras.
  const ps = parrafos(html);
  const masLargoTemprano = Math.max(0, ...ps.slice(0, 3).map(cuentaPalabras));
  const definicion = masLargoTemprano >= 25
    ? { state: "pass", palabras: masLargoTemprano, detail: `Bloque citable de ${masLargoTemprano} palabras arriba` }
    : { state: "fail", palabras: masLargoTemprano, detail: "Sin bloque-definición citable (25-50 palabras) arriba" };

  // 5. NAP / consistencia local.
  const telefono = /href=["']tel:/i.test(html) || /\b(?:\+?51\s?)?9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/.test(quitaTags(html));
  const email = /href=["']mailto:/i.test(html) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html);
  const direccion = /<address\b/i.test(html) || /\b(av\.|avenida|jr\.|jir[oó]n|calle|mz\.|manzana|urb\.)\s/i.test(quitaTags(html));
  const googleBusiness = /(google\.com\/maps|g\.page|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(html);
  const napOk = [telefono, email, direccion, googleBusiness].filter(Boolean).length;
  const nap = {
    telefono, email, direccion, googleBusiness,
    state: napOk === 4 ? "pass" : napOk >= 2 ? "warn" : "fail",
    detail: `NAP ${napOk}/4 (tel:${telefono?"✓":"✗"} email:${email?"✓":"✗"} dir:${direccion?"✓":"✗"} GBP:${googleBusiness?"✓":"✗"})`,
  };

  const senales = [jsonLd, metaKeywords, faq, definicion, nap];
  const resumen = {
    pass: senales.filter((s) => s.state === "pass").length,
    warn: senales.filter((s) => s.state === "warn").length,
    fail: senales.filter((s) => s.state === "fail").length,
  };

  return { jsonLd, metaKeywords, faq, definicion, nap, resumen };
}

module.exports = { analizaSenalesGeo, quitaTags, tiposJsonLd };

// --- CLI ---
function leeEntrada(arg) {
  if (arg === "-" || !arg) return fs.readFileSync(0, "utf8"); // stdin
  return fs.readFileSync(arg, "utf8");
}

if (require.main === module) {
  const arg = process.argv[2];
  const html = leeEntrada(arg);
  const r = analizaSenalesGeo(html);
  const icono = { pass: "✅", warn: "⚠️", fail: "❌" };
  console.log("🔎 Señales GEO (citation-readiness)\n");
  const fila = (label, s) => console.log(`  ${icono[s.state]} ${label.padEnd(20)} ${s.detail}`);
  fila("JSON-LD", r.jsonLd);
  fila("Meta keywords", r.metaKeywords);
  fila("FAQ en HTML", r.faq);
  fila("Bloque-definición", r.definicion);
  fila("NAP local", r.nap);
  console.log(`\n  Resumen: ${r.resumen.pass} pass · ${r.resumen.warn} warn · ${r.resumen.fail} fail`);
  console.log("  (E-E-A-T y calidad de stats = revisión manual)");
}
