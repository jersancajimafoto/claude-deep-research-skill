#!/usr/bin/env node
"use strict";
/**
 * Orquestador end-to-end del pipeline CRM.
 *   archivo (CSV/XLSX) -> ingesta -> scoring -> [Airtable] -> métricas
 *
 * Uso:
 *   node bin/procesar.js <archivo> [--origen csv] [--dry]
 *     --dry     no inserta en Airtable; solo muestra el resumen y las métricas.
 *
 * Credenciales SOLO por entorno (.env): AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLA.
 * Nunca se hardcodean ni se imprimen.
 */

const fs = require("fs");
const path = require("path");

const { ingestaArchivo } = require("../services/ingesta");
const { scoreLead } = require("../services/scoring/scoringService");
const { crearAirtableService, construirPayload } = require("../services/airtable/airtableService");
const { calcularMetricas } = require("../services/metricas/metricasService");

// --- mini-loader de .env (zero-dep): NO sobreescribe variables ya definidas ---
function cargarEnv(archivo) {
  if (!fs.existsSync(archivo)) return;
  for (const linea of fs.readFileSync(archivo, "utf8").split("\n")) {
    const s = linea.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i < 0) continue;
    const k = s.slice(0, i).trim();
    const v = s.slice(i + 1).trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}

function parseArgs(argv) {
  const out = { archivo: null, origen: "csv", dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry") out.dry = true;
    else if (argv[i] === "--origen") out.origen = argv[++i];
    else if (!out.archivo) out.archivo = argv[i];
  }
  return out;
}

async function main() {
  cargarEnv(path.join(__dirname, "..", ".env"));
  const args = parseArgs(process.argv.slice(2));
  if (!args.archivo) {
    console.error("Uso: node bin/procesar.js <archivo.csv|.xlsx> [--origen csv] [--dry]");
    process.exit(1);
  }

  // 1) INGESTA
  const ing = await ingestaArchivo(args.archivo, { origen: args.origen });
  console.log(`\n[1/4] Ingesta: ${ing.total} filas → ${ing.validos} válidas, ${ing.invalidos} descartadas`);

  // 2) SCORING (sobre el lead limpio que viaja en fields)
  const leads = ing.registros.map((r) => {
    const f = r.fields;
    return {
      nombre: f.Nombre, telefono: f.Telefono, correo: f.Correo,
      empresa: f.Empresa || "", origen: f.Origen || args.origen,
    };
  });
  const calificados = leads.map((l) => ({ ...l, ...scoreLead(l), estado: "Nuevo" }));
  const payloads = calificados.map((l) => construirPayload(l, l, { Estado: l.estado }));
  const porCat = calificados.reduce((a, l) => ((a[l.categoria] = (a[l.categoria] || 0) + 1), a), {});
  console.log(`[2/4] Scoring: ${JSON.stringify(porCat)}`);

  // 3) AIRTABLE (salvo --dry)
  if (args.dry) {
    console.log("[3/4] Airtable: OMITIDO (--dry). Ejemplo de payload:");
    console.log(JSON.stringify(payloads[0], null, 2));
  } else {
    const svc = crearAirtableService(); // lee credenciales de entorno
    const res = await svc.insertarLeads(payloads);
    console.log(`[3/4] Airtable: ${res.insertados}/${res.total} insertados, ${res.fallidos} fallidos`);
    if (res.fallidos) console.log("  lotes con error:", res.lotes.filter((l) => !l.ok));
  }

  // 4) MÉTRICAS (preview del lote recién procesado)
  const m = calcularMetricas(calificados);
  console.log(`[4/4] Métricas (lote): total ${m.total}, score prom. ${m.scorePromedio}, embudo ${JSON.stringify(m.embudo)}`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
