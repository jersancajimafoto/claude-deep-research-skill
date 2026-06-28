"use strict";
/**
 * airtableService — une el flujo CRM e inserta en Airtable.
 *
 * Flujo:  ingestaService (lead limpio) + scoringService (score/categoria/desglose)
 *         -> construirPayload -> insertarLeads (lotes de <=10, tolerante a fallos).
 *
 * SEGURIDAD: la API Key NUNCA se hardcodea. Se lee de variables de entorno
 * (AIRTABLE_API_KEY, AIRTABLE_BASE_ID) o se inyecta vía config en pruebas.
 * Sin dependencias externas: usa `fetch` nativo (Node 18+). `fetch` es
 * inyectable para test sin red ni credenciales reales.
 */

const LIMITE_LOTE = 10; // límite de records por request de la API de Airtable

// Divide un array en trozos de tamaño `n`.
function enLotes(arr, n = LIMITE_LOTE) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Estructura el payload Airtable uniendo lead limpio + resultado de scoring.
 * FUNCIÓN PURA. Devuelve { fields: {...} }.
 * @param {object} lead     { nombre, telefono, correo, empresa, origen }
 * @param {object} scoring  { score, categoria, desglose }
 * @param {object} [extra]  campos adicionales a mezclar en fields
 */
function construirPayload(lead = {}, scoring = {}, extra = {}) {
  const desglose = scoring.desglose || {};
  return {
    fields: {
      Nombre: lead.nombre || "",
      "Teléfono": lead.telefono || "",
      Correo: lead.correo || "",
      Empresa: lead.empresa || "",
      Origen: lead.origen || "",
      Score: typeof scoring.score === "number" ? scoring.score : null,
      "Categoría": scoring.categoria || "",
      Desglose: JSON.stringify(desglose),
      "Fecha ingesta": new Date().toISOString().slice(0, 10),
      ...extra,
    },
  };
}

/**
 * Crea el servicio. Resuelve credenciales desde config o entorno.
 * @param {object} [config]
 * @param {string} [config.apiKey]   default process.env.AIRTABLE_API_KEY
 * @param {string} [config.baseId]   default process.env.AIRTABLE_BASE_ID
 * @param {string} [config.tabla]    nombre/id de tabla (default env o "Leads")
 * @param {function} [config.fetchImpl]  inyección de fetch (test)
 * @param {number} [config.pausaMs]  pausa entre lotes (rate limit), default 220ms
 */
function crearAirtableService(config = {}) {
  const apiKey = config.apiKey || process.env.AIRTABLE_API_KEY;
  const baseId = config.baseId || process.env.AIRTABLE_BASE_ID;
  const tabla = config.tabla || process.env.AIRTABLE_TABLA || "Leads";
  const fetchImpl = config.fetchImpl || globalThis.fetch;
  const pausaMs = config.pausaMs != null ? config.pausaMs : 220;

  if (!apiKey) throw new Error("Falta credencial: define AIRTABLE_API_KEY en el entorno (no se hardcodea).");
  if (!baseId) throw new Error("Falta AIRTABLE_BASE_ID en el entorno.");
  if (typeof fetchImpl !== "function") throw new Error("No hay implementación de fetch disponible (Node 18+ o inyecta config.fetchImpl).");

  const endpoint = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tabla)}`;

  // Inserta un solo lote (<=10). Devuelve {ok, count, ids?, error?}. No lanza.
  async function insertarLote(payloads) {
    try {
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ records: payloads, typecast: true }),
      });
      if (!res.ok) {
        let detalle = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          if (j && j.error) detalle = `${detalle} ${j.error.type || ""} ${j.error.message || ""}`.trim();
        } catch (_) { /* cuerpo no-JSON */ }
        return { ok: false, count: 0, error: detalle };
      }
      const data = await res.json();
      return { ok: true, count: (data.records || []).length, ids: (data.records || []).map((r) => r.id) };
    } catch (e) {
      return { ok: false, count: 0, error: e.message };
    }
  }

  /**
   * Inserta muchos payloads en lotes de <=10, tolerante a fallos.
   * Un lote que falla NO detiene los demás.
   * @param {Array<{fields:object}>} payloads  ya construidos (construirPayload)
   * @returns {Promise<{total, insertados, fallidos, lotes:Array}>}
   */
  async function insertarLeads(payloads) {
    if (!Array.isArray(payloads)) throw new TypeError("insertarLeads: 'payloads' debe ser un array.");
    const lotes = enLotes(payloads, LIMITE_LOTE);
    const resultados = [];
    let insertados = 0;

    for (let i = 0; i < lotes.length; i++) {
      const r = await insertarLote(lotes[i]);
      resultados.push({ lote: i + 1, enviados: lotes[i].length, ...r });
      if (r.ok) insertados += r.count;
      if (pausaMs > 0 && i < lotes.length - 1) await sleep(pausaMs); // respeta rate limit
    }

    return {
      total: payloads.length,
      insertados,
      fallidos: payloads.length - insertados,
      lotes: resultados,
    };
  }

  return { construirPayload, insertarLeads, endpoint, tabla };
}

module.exports = { crearAirtableService, construirPayload, enLotes, LIMITE_LOTE };
