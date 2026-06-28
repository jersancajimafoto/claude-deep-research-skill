#!/usr/bin/env node
"use strict";
/**
 * CLI de seguimiento del CRM. Opera sobre Airtable (tablas Leads + Toques).
 *
 * Uso:
 *   node bin/seguir.js --recordatorios [--fecha YYYY-MM-DD]
 *       Lista los leads activos cuyo próximo contacto ya venció (a contactar hoy).
 *
 *   node bin/seguir.js --toque <recId> --canal whatsapp --resultado contactado \
 *        [--nota "texto"] [--fecha YYYY-MM-DD] [--agenda YYYY-MM-DD]
 *       Registra un toque: actualiza Estado/Intentos/Próximo contacto del lead
 *       y crea una fila en "Toques de seguimiento".
 *
 * Credenciales SOLO por entorno (.env). Nunca se imprimen.
 */

const fs = require("fs");
const path = require("path");

const { crearAirtableService } = require("../services/airtable/airtableService");
const { aplicarToque, recordatoriosDelDia, payloadToque } = require("../services/seguimiento/seguimientoService");

const TABLA_LEADS = "Leads";
const TABLA_TOQUES = "Toques de seguimiento";

// mini-loader .env (zero-dep), no sobreescribe lo ya definido.
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
  const o = { modo: null, recId: null, canal: null, resultado: null, nota: "", fecha: null, agenda: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--recordatorios") o.modo = "recordatorios";
    else if (a === "--toque") { o.modo = "toque"; o.recId = argv[++i]; }
    else if (a === "--canal") o.canal = argv[++i];
    else if (a === "--resultado") o.resultado = argv[++i];
    else if (a === "--nota") o.nota = argv[++i];
    else if (a === "--fecha") o.fecha = argv[++i];
    else if (a === "--agenda") o.agenda = argv[++i];
  }
  return o;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
const sel = (v) => (v && typeof v === "object" ? v.name : v); // singleSelect -> string

async function cmdRecordatorios(svc, hoy) {
  const recs = await svc.listar(TABLA_LEADS, {
    fields: ["Nombre", "Teléfono", "Estado", "Próximo contacto", "Intentos"],
  });
  const leads = recs.map((r) => ({
    id: r.id,
    nombre: r.fields["Nombre"] || "(sin nombre)",
    telefono: r.fields["Teléfono"] || "",
    estado: sel(r.fields["Estado"]),
    proximoContacto: r.fields["Próximo contacto"] || null,
  }));
  const pend = recordatoriosDelDia(leads, hoy);
  console.log(`\nRecordatorios al ${hoy}: ${pend.length} lead(s) por contactar\n`);
  for (const l of pend) {
    console.log(`  • ${l.nombre}  ${l.telefono}  [${l.estado}]  vence ${l.proximoContacto}  (${l.id})`);
  }
  if (!pend.length) console.log("  (nada vencido hoy)");
}

async function cmdToque(svc, args, hoy) {
  if (!args.recId || !args.canal || !args.resultado) {
    throw new Error("Uso: --toque <recId> --canal <whatsapp|llamada|correo|presencial> --resultado <...> [--nota] [--fecha] [--agenda]");
  }
  const lead = await svc.obtener(TABLA_LEADS, args.recId);
  if (!lead) throw new Error(`Lead no encontrado: ${args.recId}`);

  const toque = {
    canal: args.canal,
    resultado: args.resultado,
    nota: args.nota,
    fecha: args.fecha || hoy,
    fechaAgenda: args.agenda || undefined,
  };

  const estadoPrevio = { estado: sel(lead.fields["Estado"]) || "Nuevo", intentos: lead.fields["Intentos"] || 0 };
  const nuevo = aplicarToque(estadoPrevio, toque); // valida el toque internamente

  // 1) actualizar el lead
  const up = await svc.actualizar(TABLA_LEADS, [{
    id: args.recId,
    fields: { Estado: nuevo.estado, Intentos: nuevo.intentos, "Próximo contacto": nuevo.proximoContacto },
  }]);
  // 2) registrar el toque
  const cr = await svc.crear(TABLA_TOQUES, [payloadToque(args.recId, toque)]);

  console.log(`\nToque registrado en ${lead.fields["Nombre"] || args.recId}:`);
  console.log(`  resultado: ${toque.resultado}  canal: ${toque.canal}`);
  console.log(`  estado: ${estadoPrevio.estado} → ${nuevo.estado}  | intento #${nuevo.intentos}`);
  console.log(`  próximo contacto: ${nuevo.proximoContacto || "—"}`);
  if (up.fallidos || cr.fallidos) console.log("  ⚠️ fallos:", { lead: up.lotes, toque: cr.lotes });
}

async function main() {
  cargarEnv(path.join(__dirname, "..", ".env"));
  const args = parseArgs(process.argv.slice(2));
  const hoy = args.fecha && args.modo === "recordatorios" ? args.fecha : hoyISO();
  if (!args.modo) {
    console.error("Uso: node bin/seguir.js --recordatorios | --toque <recId> --canal .. --resultado ..");
    process.exit(1);
  }
  const svc = crearAirtableService();
  if (args.modo === "recordatorios") await cmdRecordatorios(svc, hoy);
  else await cmdToque(svc, args, hoyISO());
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
