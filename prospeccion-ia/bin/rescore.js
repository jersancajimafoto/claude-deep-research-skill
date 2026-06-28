#!/usr/bin/env node
"use strict";
/**
 * Re-scoring: recalcula Score/Categoría/Desglose de los Leads desde los datos
 * ACTUALES en Airtable. Útil cuando se editan a mano correos/teléfonos/empresa.
 * Solo actualiza los registros que cambian.
 *
 * Uso:
 *   node bin/rescore.js [--dry]
 *     --dry   muestra qué cambiaría, no escribe.
 *
 * Credenciales SOLO por entorno (.env). Nunca se imprimen.
 */

const fs = require("fs");
const path = require("path");

const { crearAirtableService } = require("../services/airtable/airtableService");
const { scoreLead } = require("../services/scoring/scoringService");

const TABLA_LEADS = "Leads";

function cargarEnv(archivo) {
  if (!fs.existsSync(archivo)) return;
  for (const l of fs.readFileSync(archivo, "utf8").split("\n")) {
    const s = l.trim();
    if (!s || s.startsWith("#")) continue;
    const i = s.indexOf("=");
    if (i > 0 && !(s.slice(0, i).trim() in process.env)) process.env[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
}

const sel = (v) => (v && typeof v === "object" ? v.name : v);
const dry = process.argv.includes("--dry");

async function main() {
  cargarEnv(path.join(__dirname, "..", ".env"));
  const svc = crearAirtableService();

  const recs = await svc.listar(TABLA_LEADS, {
    fields: ["Nombre", "Teléfono", "Correo", "Empresa", "Origen", "Score", "Categoría", "Desglose"],
  });

  const cambios = [];
  for (const r of recs) {
    const f = r.fields;
    const lead = {
      nombre: f["Nombre"], telefono: f["Teléfono"], correo: f["Correo"],
      empresa: f["Empresa"] || "", origen: sel(f["Origen"]),
    };
    const s = scoreLead(lead);
    const scoreActual = typeof f["Score"] === "number" ? f["Score"] : null;
    const catActual = sel(f["Categoría"]) || null;
    if (s.score !== scoreActual || s.categoria !== catActual) {
      cambios.push({
        id: r.id,
        nombre: f["Nombre"] || r.id,
        de: `${scoreActual ?? "—"}/${catActual ?? "—"}`,
        a: `${s.score}/${s.categoria}`,
        fields: { Score: s.score, "Categoría": s.categoria, Desglose: JSON.stringify(s.desglose) },
      });
    }
  }

  console.log(`\nRevisados ${recs.length} leads → ${cambios.length} con cambio de score/categoría`);
  for (const c of cambios) console.log(`  • ${c.nombre}: ${c.de} → ${c.a}`);

  if (!cambios.length) { console.log("Nada que actualizar. Datos consistentes."); return; }
  if (dry) { console.log("\n[--dry] no se escribió en Airtable."); return; }

  const res = await svc.actualizar(TABLA_LEADS, cambios.map((c) => ({ id: c.id, fields: c.fields })));
  console.log(`\nActualizados ${res.actualizados}/${res.total}` + (res.fallidos ? ` (fallidos ${res.fallidos})` : ""));
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
