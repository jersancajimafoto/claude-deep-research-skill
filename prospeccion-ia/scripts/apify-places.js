#!/usr/bin/env node
/**
 * Prospección vía Apify — actor "Google Maps con detalles de contacto"
 * (lukaskrivka/google-maps-with-contact-details). Saca negocios CON email,
 * teléfono, web y redes en un paso, y los vuelca al MISMO formato de lead que
 * produce prospecta-places.js → consumible por score-lead.js sin cambios.
 *
 * Ventaja sobre Places: el actor extrae EMAIL (Places no lo da), y score-lead
 * ya bonifica leads con email.
 *
 * Zero-deps: usa fetch nativo + la REST API de Apify (run-sync-get-dataset-items).
 *
 * Uso:
 *   node apify-places.js "estudios contables en Piura, Perú"
 *   node apify-places.js "<query>" --max 50 --salida salida/contables-apify.json
 *
 * Requiere APIFY_TOKEN en prospeccion-ia/.env
 */
const fs = require("fs");
const path = require("path");
const { normalizaDominio } = require("./normaliza-dominio");

const ACTOR = "lukaskrivka~google-maps-with-contact-details";

// Dominios que NO son web propia (misma lista que prospecta-places.js).
const NO_ES_WEB_PROPIA = [
  "facebook.com", "instagram.com", "tiktok.com", "twitter.com", "x.com",
  "linkedin.com", "youtube.com", "wa.me", "api.whatsapp.com", "linktr.ee",
  "negocio.site", "business.site", "sites.google.com", "google.com",
  "wixsite.com", "blogspot.com",
];
function esWebPropia(dominio) {
  if (!dominio) return false;
  return !NO_ES_WEB_PROPIA.some((d) => dominio === d || dominio.endsWith("." + d));
}

function primerEmail(item) {
  if (Array.isArray(item.emails) && item.emails.length) return item.emails[0];
  if (typeof item.email === "string") return item.email;
  return "";
}

function estado(item) {
  if (item.permanentlyClosed) return "CLOSED";
  if (item.temporarilyClosed) return "TEMP_CLOSED";
  return item.businessStatus || "OPERATIONAL";
}

/**
 * Mapea un item del dataset del actor de Apify al formato de lead del pipeline.
 * Defensivo: acepta variantes de nombre de campo entre actors de Google Maps.
 */
function mapeaActorItem(item) {
  const web = item.website || item.url || item.websiteUri || null;
  const dominio = normalizaDominio(web);
  return {
    place_id: item.placeId || item.place_id || item.id || null,
    empresa: item.title || item.name || item.displayName?.text || "",
    web: web,
    dominio: dominio,
    web_propia: esWebPropia(dominio),
    telefono: item.phone || item.phoneUnformatted || item.nationalPhoneNumber || "",
    ubicacion: item.address || item.formattedAddress || "",
    email: primerEmail(item),
    rating: item.totalScore ?? item.rating ?? null,
    resenas: item.reviewsCount ?? item.userRatingCount ?? 0,
    estado_negocio: estado(item),
  };
}

// --- carga .env (parser mínimo, sin dependencias) ---
function cargaEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const linea of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m && !linea.trim().startsWith("#")) out[m[1]] = m[2].trim();
  }
  return out;
}

function parseArgs(argv) {
  const args = { query: null, max: 50, salida: null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--max") args.max = parseInt(argv[++i], 10);
    else if (argv[i] === "--salida") args.salida = argv[++i];
    else rest.push(argv[i]);
  }
  args.query = rest.join(" ").trim();
  return args;
}

function slug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function corre(token, query, max) {
  const url = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const input = {
    searchStringsArray: [query],
    maxCrawledPlacesPerSearch: max,
    language: "es",
    countryCode: "pe",
    scrapeContacts: true,
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Apify ${resp.status}: ${txt.slice(0, 300)}`);
  }
  return resp.json();
}

async function main() {
  const env = cargaEnv();
  const token = env.APIFY_TOKEN;
  if (!token || token.includes("PEGA_TU")) {
    console.error("Falta APIFY_TOKEN en .env (Apify → Settings → Integrations).");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.query) {
    console.error('uso: node apify-places.js "<nicho> en <ciudad>" [--max N] [--salida ruta.json]');
    process.exit(1);
  }

  const items = await corre(token, args.query, args.max);
  const vistos = new Set();
  const leads = [];
  for (const it of items || []) {
    const lead = mapeaActorItem(it);
    if (!lead.place_id || vistos.has(lead.place_id)) continue; // dedup por place_id
    vistos.add(lead.place_id);
    leads.push(lead);
  }

  const salida = args.salida || path.join(__dirname, "..", "salida", slug(args.query) + "-apify.json");
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify({ query: args.query, total: leads.length, leads }, null, 2));

  const conEmail = leads.filter((l) => l.email).length;
  const sinWebPropia = leads.filter((l) => !l.web_propia).length;
  console.log(`✓ ${leads.length} negocios (${conEmail} con email, ${sinWebPropia} sin web propia). Guardado: ${salida}`);
}

module.exports = { mapeaActorItem, esWebPropia, primerEmail };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
