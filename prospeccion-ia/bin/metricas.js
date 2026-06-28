#!/usr/bin/env node
"use strict";
/**
 * Snapshot de métricas → tabla "Métricas" de Airtable.
 * Lee todos los Leads, calcula conversión con metricasService y guarda una fila.
 *
 * Uso:
 *   node bin/metricas.js [--periodo "Junio 2026"] [--dry]
 *     --periodo  etiqueta del snapshot (default: fecha de hoy).
 *     --dry      calcula y muestra, no escribe en Airtable.
 *
 * Credenciales SOLO por entorno (.env). Nunca se imprimen.
 */

const fs = require("fs");
const path = require("path");

const { crearAirtableService } = require("../services/airtable/airtableService");
const { calcularMetricas } = require("../services/metricas/metricasService");

const TABLA_LEADS = "Leads";
const TABLA_METRICAS = "Métricas";

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
  const o = { periodo: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry") o.dry = true;
    else if (argv[i] === "--periodo") o.periodo = argv[++i];
  }
  return o;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
const sel = (v) => (v && typeof v === "object" ? v.name : v);

// metricas -> fields de la tabla Métricas (nombres exactos de columnas).
function aFilaMetricas(m, periodo) {
  return {
    fields: {
      Periodo: periodo,
      Total: m.total,
      Contactados: m.contactados,
      Ganados: m.ganados,
      Perdidos: m.perdidos,
      Activos: m.activos,
      "Tasa contacto (%)": m.tasaContacto,
      "Conversión global (%)": m.conversionGlobal,
      "Conversión efectiva (%)": m.conversionEfectiva,
      "Score promedio": m.scorePromedio,
      "Fecha snapshot": hoyISO(),
    },
  };
}

async function main() {
  cargarEnv(path.join(__dirname, "..", ".env"));
  const args = parseArgs(process.argv.slice(2));
  const periodo = args.periodo || hoyISO();
  const svc = crearAirtableService();

  const recs = await svc.listar(TABLA_LEADS, { fields: ["Estado", "Categoría", "Score", "Origen"] });
  const leads = recs.map((r) => ({
    estado: sel(r.fields["Estado"]),
    categoria: sel(r.fields["Categoría"]),
    score: typeof r.fields["Score"] === "number" ? r.fields["Score"] : undefined,
    origen: sel(r.fields["Origen"]),
  }));

  const m = calcularMetricas(leads);
  const fila = aFilaMetricas(m, periodo);

  console.log(`\nMétricas "${periodo}" (sobre ${m.total} leads):`);
  console.log(`  embudo: ${JSON.stringify(m.embudo)}`);
  console.log(`  tasa contacto: ${m.tasaContacto}%  | conv. global: ${m.conversionGlobal}%  | conv. efectiva: ${m.conversionEfectiva}%`);
  console.log(`  score promedio: ${m.scorePromedio}`);

  if (args.dry) {
    console.log("\n[--dry] no se escribió en Airtable. Fila que se guardaría:");
    console.log(JSON.stringify(fila.fields, null, 2));
    return;
  }
  const res = await svc.crear(TABLA_METRICAS, [fila]);
  console.log(`\nSnapshot guardado en "${TABLA_METRICAS}": ${res.insertados}/${res.total}` + (res.fallidos ? ` (fallidos ${res.fallidos})` : ""));
  if (res.fallidos) console.log("  error:", res.lotes.filter((l) => !l.ok));
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
