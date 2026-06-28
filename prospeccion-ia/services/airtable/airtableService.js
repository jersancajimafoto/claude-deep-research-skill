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

  const urlTabla = (t) => `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(t || tabla)}`;
  const endpoint = urlTabla(tabla); // back-compat
  const headers = () => ({ Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" });

  // Extrae un mensaje de error legible de una respuesta no-ok. No lanza.
  async function detalleError(res) {
    let detalle = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.error) detalle = `${detalle} ${j.error.type || ""} ${j.error.message || ""}`.trim();
    } catch (_) { /* cuerpo no-JSON */ }
    return detalle;
  }

  // Envía un lote (<=10) con un método dado. Devuelve {ok, count, ids?, error?}. No lanza.
  async function enviarLote(url, registros, method) {
    try {
      const res = await fetchImpl(url, {
        method,
        headers: headers(),
        body: JSON.stringify({ records: registros, typecast: true }),
      });
      if (!res.ok) return { ok: false, count: 0, error: await detalleError(res) };
      const data = await res.json();
      return { ok: true, count: (data.records || []).length, ids: (data.records || []).map((r) => r.id) };
    } catch (e) {
      return { ok: false, count: 0, error: e.message };
    }
  }

  // Recorre lotes ≤10 de forma tolerante a fallos (create=POST / update=PATCH).
  async function porLotes(tablaDestino, registros, method, etiqueta) {
    if (!Array.isArray(registros)) throw new TypeError(`${etiqueta}: debe ser un array.`);
    const url = urlTabla(tablaDestino);
    const lotes = enLotes(registros, LIMITE_LOTE);
    const resultados = [];
    let ok = 0;
    for (let i = 0; i < lotes.length; i++) {
      const r = await enviarLote(url, lotes[i], method);
      resultados.push({ lote: i + 1, enviados: lotes[i].length, ...r });
      if (r.ok) ok += r.count;
      if (pausaMs > 0 && i < lotes.length - 1) await sleep(pausaMs); // rate limit
    }
    const clave = method === "PATCH" ? "actualizados" : "insertados";
    return { total: registros.length, [clave]: ok, fallidos: registros.length - ok, lotes: resultados };
  }

  /** Crea registros en una tabla (lotes ≤10, tolerante a fallos). */
  const crear = (tablaDestino, payloads) => porLotes(tablaDestino, payloads, "POST", "crear");

  /** Actualiza registros [{id, fields}] en una tabla (lotes ≤10). */
  const actualizar = (tablaDestino, registros) => porLotes(tablaDestino, registros, "PATCH", "actualizar");

  /** Inserta leads en la tabla por defecto. Back-compat. */
  const insertarLeads = (payloads) => crear(tabla, payloads);

  /**
   * Lista registros de una tabla (sigue paginación). Devuelve [{id, fields}].
   * @param {string} tablaDestino
   * @param {object} [opts] { filterByFormula, fields:[], pageSize, maxRecords }
   */
  async function listar(tablaDestino, opts = {}) {
    const out = [];
    let offset;
    do {
      const u = new URL(urlTabla(tablaDestino));
      if (opts.filterByFormula) u.searchParams.set("filterByFormula", opts.filterByFormula);
      if (opts.pageSize) u.searchParams.set("pageSize", String(opts.pageSize));
      if (Array.isArray(opts.fields)) opts.fields.forEach((f) => u.searchParams.append("fields[]", f));
      if (offset) u.searchParams.set("offset", offset);
      const res = await fetchImpl(u.toString(), { method: "GET", headers: headers() });
      if (!res.ok) throw new Error(`listar(${tablaDestino}): ${await detalleError(res)}`);
      const data = await res.json();
      out.push(...(data.records || []));
      offset = data.offset;
      if (opts.maxRecords && out.length >= opts.maxRecords) return out.slice(0, opts.maxRecords);
    } while (offset);
    return out;
  }

  /** Obtiene un registro por id. Devuelve {id, fields} o null si no existe. */
  async function obtener(tablaDestino, id) {
    const res = await fetchImpl(`${urlTabla(tablaDestino)}/${id}`, { method: "GET", headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`obtener(${tablaDestino}/${id}): ${await detalleError(res)}`);
    return res.json();
  }

  return { construirPayload, insertarLeads, crear, actualizar, listar, obtener, endpoint, tabla };
}

module.exports = { crearAirtableService, construirPayload, enLotes, LIMITE_LOTE };
