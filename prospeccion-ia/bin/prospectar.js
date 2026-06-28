#!/usr/bin/env node
"use strict";
/**
 * Puente prospección → CRM, en un comando.
 *   Google Places (scripts/prospecta-places.js) → normaliza → scoring → Airtable.
 *
 * Uso:
 *   node bin/prospectar.js --rubro "estudios contables" --ciudad "Trujillo" [--paginas 2] [--max 40] [--dry]
 *   node bin/prospectar.js --query "dentistas en Piura, Perú" [--dry]
 *   node bin/prospectar.js --from salida/archivo.json [--dry]   # sin gastar API: usa un JSON ya prospectado
 *   node bin/prospectar.js --from leads-firecrawl.json --origen firecrawl   # leads de Firecrawl (con email)
 *
 *     --dry   no escribe en Airtable; muestra el resumen y un ejemplo.
 *
 * --from acepta cualquier JSON ({leads:[...]} o array) de Places, Firecrawl o
 * cualquier scraper: el mapeo de campos es flexible (empresa/name/company,
 * telefono/phone/whatsapp, correo/email/mail).
 *
 * Credenciales SOLO por entorno (.env). Nunca se imprimen.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const { normalizaNombre, normalizaTelefono, normalizaCorreo } = require("../services/ingesta/mapper");
const { scoreLead } = require("../services/scoring/scoringService");
const { crearAirtableService, construirPayload } = require("../services/airtable/airtableService");
const { calcularMetricas } = require("../services/metricas/metricasService");

function cargarEnv(archivo) {
  if (!fs.existsSync(archivo)) return;
  for (const l of fs.readFileSync(archivo, "utf8").split("\n")) {
    const s = l.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i > 0 && !(s.slice(0, i).trim() in process.env)) process.env[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
}

function parseArgs(argv) {
  const o = { rubro: null, ciudad: null, query: null, from: null, paginas: 2, max: null, origen: "places", dry: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--rubro") o.rubro = argv[++i];
    else if (a === "--ciudad") o.ciudad = argv[++i];
    else if (a === "--query") o.query = argv[++i];
    else if (a === "--from") o.from = argv[++i];
    else if (a === "--paginas") o.paginas = parseInt(argv[++i], 10);
    else if (a === "--max") o.max = parseInt(argv[++i], 10);
    else if (a === "--origen") o.origen = argv[++i];
    else if (a === "--dry") o.dry = true;
  }
  return o;
}

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

// Corre prospecta-places.js y devuelve la ruta del JSON generado.
function prospectar(query, paginas) {
  const salida = path.join(__dirname, "..", "salida", `prospect-${slug(query)}-${Date.now()}.json`);
  const script = path.join(__dirname, "..", "scripts", "prospecta-places.js");
  console.log(`[1/4] Prospección Places: "${query}" (${paginas} pág.)…`);
  execFileSync("node", [script, query, "--paginas", String(paginas), "--salida", salida], { stdio: "inherit" });
  return salida;
}

// Lee un JSON de prospección ({leads:[...]} o array) y devuelve los leads crudos (forma Places).
function leerProspeccion(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(data) ? data : data.leads || [];
}

// Busca el primer valor no vacío entre varias claves candidatas (case-insensitive).
// Permite consumir salidas de Places, Firecrawl o cualquier scraper con otras claves.
function pick(obj, claves) {
  if (!obj || typeof obj !== "object") return undefined;
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const c of claves) {
    const v = lower[c];
    if (v != null && String(v).trim() !== "") return v;
  }
  return undefined;
}

// Lead crudo (Places / Firecrawl / genérico) -> lead limpio del CRM.
function aLimpio(p, origen) {
  const nombre = normalizaNombre(pick(p, ["empresa", "nombre", "name", "company", "business", "razon_social", "razonsocial"]) || "");
  return {
    nombre,
    telefono: normalizaTelefono(pick(p, ["telefono", "tel", "phone", "whatsapp", "celular", "movil", "wa"])), // E.164 o null
    correo: normalizaCorreo(pick(p, ["correo", "email", "mail", "correo_electronico", "e-mail"])),            // Firecrawl sí suele traer email
    empresa: nombre || "",                                                                                     // negocio identificado
    origen,
  };
}

async function main() {
  cargarEnv(path.join(__dirname, "..", ".env"));
  const args = parseArgs(process.argv.slice(2));

  // 1) Obtener prospección (live o desde archivo)
  let file = args.from;
  if (!file) {
    const query = args.query || (args.rubro && args.ciudad ? `${args.rubro} en ${args.ciudad}, Perú` : null);
    if (!query) {
      console.error('Uso: --rubro "<x>" --ciudad "<y>"  |  --query "<x> en <y>, Perú"  |  --from <archivo.json>');
      process.exit(1);
    }
    file = prospectar(query, args.paginas);
  } else {
    console.log(`[1/4] Prospección: leyendo ${file}`);
  }

  let crudos = leerProspeccion(file);
  if (args.max) crudos = crudos.slice(0, args.max);

  // 2) Normalizar + 3) scoring
  const limpios = crudos.map((p) => aLimpio(p, args.origen)).filter((l) => l.nombre); // descarta sin nombre
  const calificados = limpios.map((l) => ({ ...l, ...scoreLead(l), estado: "Nuevo" }));
  const payloads = calificados.map((l) => construirPayload(l, l, { Estado: l.estado }));
  const porCat = calificados.reduce((a, l) => ((a[l.categoria] = (a[l.categoria] || 0) + 1), a), {});
  console.log(`[2/4] Normalizado: ${crudos.length} prospectos → ${calificados.length} con nombre`);
  console.log(`[3/4] Scoring: ${JSON.stringify(porCat)}`);

  // 4) Airtable (salvo --dry)
  if (args.dry) {
    console.log("[4/4] Airtable: OMITIDO (--dry). Ejemplo de payload:");
    console.log(JSON.stringify(payloads[0] || {}, null, 2));
  } else {
    const res = await crearAirtableService().insertarLeads(payloads);
    console.log(`[4/4] Airtable: ${res.insertados}/${res.total} insertados, ${res.fallidos} fallidos`);
    if (res.fallidos) console.log("  lotes con error:", res.lotes.filter((l) => !l.ok));
  }

  const m = calcularMetricas(calificados);
  console.log(`Métricas (lote): total ${m.total}, score prom. ${m.scorePromedio}, embudo ${JSON.stringify(m.embudo)}`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
