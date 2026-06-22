#!/usr/bin/env node
/**
 * Scoring determinista + routing, CONFIGURABLE POR TIPO DE OFERTA (dos modos).
 *
 *   --modo dolor    (Modo A) vender servicios a negocios. Sin web propia = buen lead.
 *                   Rutea oferta: Auditoría Web / Automatización IA. (default)
 *   --modo capital  (Modo B) vender a personas con capital (inversión, alto ticket).
 *                   Trayectoria + formalidad = buen lead. Filtra contacto directo (celular).
 *
 * Mismo input -> mismo output. Rúbricas documentadas en references/rubrica-scoring.md.
 *
 * Uso:
 *   node score-lead.js entrada.json --ciudad Piura --cp-prefijo 20            # modo dolor
 *   node score-lead.js entrada.json --modo capital --min-rating 4             # modo capital
 */

const fs = require("fs");
const { normalizaDominio } = require("./normaliza-dominio");

const REDES = ["facebook.com","instagram.com","tiktok.com","twitter.com","x.com","linkedin.com","youtube.com"];
const GRATIS = ["negocio.site","business.site","sites.google.com","wixsite.com","blogspot.com"];
const NO_CLIENTE = ["colegio de","colegio profesional","asociación","asociacion","cámara de","camara de","municipalidad","ministerio","sunat","universidad"];
const PAIS = "51"; // Perú

function clasificaWeb(lead) {
  // Normaliza primero (minúsculas, sin protocolo/www/path) para que la
  // comparación contra REDES/GRATIS funcione con dominios crudos.
  const dom = normalizaDominio(lead.dominio);
  if (!dom) return "ninguna";
  if (REDES.some((r) => dom === r || dom.endsWith("." + r))) return "red_social";
  if (GRATIS.some((g) => dom === g || dom.endsWith("." + g))) return "gratis";
  return "propia";
}

// Celular peruano (9 díg, empieza en 9) -> formato internacional, o null si es fijo.
function celular(tel) {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) return PAIS + d;
  if (d.length === 11 && d.startsWith(PAIS + "9")) return d;
  return null;
}

// Heurística: el nombre identifica a la persona titular (vs una marca/clínica).
function esTitular(nombre) {
  const t = /\b(dr|dra|mg|lic|ing|arq|abog|c\.?d|esp)\.?\b/i.test(nombre);
  const pareceNombre = /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/.test(nombre);
  const marca = /cl[ií]nica|centro|consultorio|spa|grupo|group|asociad|corp|s\.?a\.?c|e\.?i\.?r\.?l|dental|odonto|internacional|solutions/i.test(nombre);
  return t || (pareceNombre && !marca);
}

function enCiudad(lead, ciudad, cpPrefijo) {
  if (!ciudad) return true;
  const cn = ciudad.toLowerCase();
  const dir = (lead.ubicacion || "").toLowerCase();
  const nombre = (lead.empresa || "").toLowerCase();
  const cp = (dir.match(/\b(\d{5})\b/) || [])[1] || null;
  return dir.includes(cn) || nombre.includes(cn) || (cpPrefijo && cp ? cp.startsWith(cpPrefijo) : false);
}

const prioridadDe = (s) => (s >= 70 ? "5-alta" : s >= 45 ? "3-4-media" : "1-2-baja");

// ---------- MODO A: dolor (vender servicios) ----------
function scoreDolor(lead, ciudad, cpPrefijo) {
  const nombre = (lead.empresa || "").toLowerCase();
  const web = clasificaWeb(lead);
  const razones = [];
  let score = 0;

  const esNoCliente = NO_CLIENTE.some((t) => nombre.includes(t));
  if (esNoCliente) razones.push("No es cliente comercial (gremio/institución)"); else score += 20;

  const geo = enCiudad(lead, ciudad, cpPrefijo);
  if (geo) score += 20; else razones.push(`Fuera de ${ciudad}`);

  if (web === "ninguna") { score += 30; razones.push("Sin web ni red (solo ficha Google)"); }
  else if (web === "gratis") { score += 28; razones.push("Solo sitio gratis"); }
  else if (web === "red_social") { score += 22; razones.push("Solo presencia en redes, sin web propia"); }
  else { if ((lead.resenas||0) < 10) { score += 12; razones.push("Web propia pero baja tracción"); } else { score += 4; razones.push("Web propia y activa"); } }

  if (lead.telefono) score += 10;
  if (lead.ubicacion) score += 5;
  if (lead.email) score += 5;
  if ((lead.resenas||0) > 0) score += Math.min(10, 4 + (lead.resenas >= 5 ? 6 : lead.resenas));

  if (esNoCliente) score -= 40;
  score = Math.max(0, Math.min(100, score));

  let oferta;
  if (esNoCliente || !geo) oferta = "Revisar manual";
  else if (web === "red_social") oferta = "Automatización IA";
  else oferta = "Auditoría Web";

  const oportunidad = oferta === "Auditoría Web"
    ? "Ofrecer auditoría web gratuita (gancho Kunda) → rediseño / presencia digital y SEO local."
    : oferta === "Automatización IA"
    ? "Activo en redes pero sin web: ofrecer automatización IA (respuestas, captación, gestión)."
    : "Verificar manualmente antes de contactar.";

  return { score, prioridad: prioridadDe(score), oferta,
    problema_detectado: razones.join("; ") || "Sin señales destacadas", oportunidad,
    descalificado: esNoCliente || !geo };
}

// ---------- MODO B: capital (vender a personas con capital) ----------
function scoreCapital(lead, ciudad, cpPrefijo, minRating) {
  const nombre = (lead.empresa || "").toLowerCase();
  const web = clasificaWeb(lead);
  const cel = celular(lead.telefono);
  const titular = esTitular(lead.empresa || "");
  const razones = [];
  let score = 0;

  const esNoCliente = NO_CLIENTE.some((t) => nombre.includes(t));
  const geo = enCiudad(lead, ciudad, cpPrefijo);
  if (!geo) razones.push(`Fuera de ${ciudad}`);

  // Encaje geográfico (15)
  if (geo) score += 15;
  // Contacto directo por celular (25) — clave en modo capital
  if (cel) { score += 25; } else razones.push("Sin celular (no contacto directo)");
  // Trayectoria / consolidación (30) por reseñas
  score += Math.min(30, (lead.resenas || 0) * 1.5);
  if ((lead.resenas||0) >= 20) razones.push(`Trayectoria sólida (${lead.resenas} reseñas)`);
  // Formalidad: web propia (15)
  if (web === "propia") { score += 15; razones.push("Web propia (empresa formal)"); }
  // Reputación 4-5★ (15)
  if (lead.rating >= 4.5) score += 15; else if (lead.rating >= 4) score += 8;

  if (esNoCliente) { score -= 40; razones.push("No es cliente (institución)"); }
  // Filtro de calidad opcional por rating mínimo
  const bajoRating = minRating && (!(lead.rating >= minRating));
  if (bajoRating) razones.push(`Rating < ${minRating}`);

  score = Math.round(Math.max(0, Math.min(100, score)));
  const descalificado = esNoCliente || !geo || !cel || bajoRating;
  const contacto = titular ? "Directo" : "Recepción";

  const problema = (titular ? "Contacto directo (titular)" : "Contacto por recepción")
    + (razones.length ? "; " + razones.join("; ") : "");
  const oportunidad = descalificado
    ? "Revisar antes de contactar."
    : "Invitar a la oferta del cliente (inversión / alto ticket). Reforzar con firma y web.";

  return { score, prioridad: prioridadDe(score), contacto, celular: cel,
    problema_detectado: problema, oportunidad, descalificado };
}

/** Dispatcher por modo. opts: {modo, ciudad, cpPrefijo, minRating} */
function scoreLead(lead, opts = {}) {
  const modo = opts.modo || "dolor";
  const base = { place_id: lead.place_id, empresa: lead.empresa, modo };
  const r = modo === "capital"
    ? scoreCapital(lead, opts.ciudad, opts.cpPrefijo, opts.minRating)
    : scoreDolor(lead, opts.ciudad, opts.cpPrefijo);
  return { ...base, ...r };
}

function main() {
  const argv = process.argv.slice(2);
  let entrada = null, ciudad = null, cpPrefijo = null, salida = null, modo = "dolor", minRating = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ciudad") ciudad = argv[++i];
    else if (argv[i] === "--cp-prefijo") cpPrefijo = argv[++i];
    else if (argv[i] === "--modo") modo = argv[++i];
    else if (argv[i] === "--min-rating") minRating = parseFloat(argv[++i]);
    else if (argv[i] === "--salida") salida = argv[++i];
    else entrada = argv[i];
  }
  if (!entrada) {
    console.error('uso: node score-lead.js <entrada.json> [--modo dolor|capital] [--ciudad C] [--cp-prefijo 20] [--min-rating 4] [--salida ruta.json]');
    process.exit(1);
  }
  if (!["dolor", "capital"].includes(modo)) { console.error('--modo debe ser "dolor" o "capital"'); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(entrada, "utf8"));
  const scored = (data.leads || []).map((l) => scoreLead(l, { modo, ciudad, cpPrefijo, minRating }))
    .sort((a, b) => b.score - a.score);

  const out = salida || entrada.replace(/\.json$/, "") + "-scored.json";
  fs.writeFileSync(out, JSON.stringify({ modo, ciudad, total: scored.length, leads: scored }, null, 2));

  const alta = scored.filter((l) => l.prioridad === "5-alta").length;
  const desc = scored.filter((l) => l.descalificado).length;
  console.log(`✓ ${scored.length} scored [modo ${modo}] | prioridad alta: ${alta} | descalificados: ${desc}`);
  if (modo === "dolor") {
    const c = (o) => scored.filter((l) => l.oferta === o).length;
    console.log(`  Auditoría Web: ${c("Auditoría Web")} · Automatización IA: ${c("Automatización IA")} · Revisar: ${c("Revisar manual")}`);
  } else {
    const dir = scored.filter((l) => l.contacto === "Directo" && !l.descalificado).length;
    console.log(`  Contacto Directo (titular, válido): ${dir}`);
  }
  console.log(`  guardado: ${out}`);
}

if (require.main === module) main();
module.exports = { scoreLead, clasificaWeb, celular, esTitular };
