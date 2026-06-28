"use strict";
/**
 * Servicio de ingesta — orquestador.
 * Flujo: archivo subido (multer) -> parseArchivo -> normalizaLead por fila
 *        -> separa válidos/inválidos -> arma payload Airtable.
 *
 * No escribe en Airtable: devuelve los registros listos para que la capa
 * MCP/Airtable los inserte (dedup + permisos viven fuera de aquí).
 */

const fs = require("fs");
const { parseArchivo } = require("./parsers");
const { normalizaLead, detectaColumnas, aRegistroAirtable } = require("./mapper");
const { upload } = require("./upload");

/**
 * Ingesta un archivo ya en disco.
 * @param {string} filePath  ruta del archivo (.csv/.xlsx)
 * @param {object} [opts]
 * @param {string} [opts.origen]  etiqueta de origen para Airtable
 * @param {boolean} [opts.borrarTrasLeer=false]  borra el archivo tras procesarlo
 * @returns {Promise<{total, validos, invalidos, registros, descartados}>}
 */
async function ingestaArchivo(filePath, opts = {}) {
  const filas = await parseArchivo(filePath);
  const columnas = filas.length ? detectaColumnas(filas[0]) : {};

  const validos = [];
  const descartados = [];
  for (const fila of filas) {
    const lead = normalizaLead(fila, columnas);
    if (lead.valido) validos.push(lead);
    else descartados.push({ _errores: lead._errores }); // sin PII en el rechazo
  }

  const extra = opts.origen ? { Origen: opts.origen } : {};
  const registros = validos.map((l) => aRegistroAirtable(l, extra));

  if (opts.borrarTrasLeer) {
    try { fs.unlinkSync(filePath); } catch (_) { /* best-effort */ }
  }

  return {
    total: filas.length,
    validos: validos.length,
    invalidos: descartados.length,
    registros,     // listos para Airtable
    descartados,   // solo conteo de errores, sin datos personales
  };
}

/**
 * Handler Express: POST con multipart field "archivo".
 * Úsalo como: app.post("/ingesta", ...rutaIngesta())
 */
function rutaIngesta(opts = {}) {
  return [
    upload.single("archivo"),
    async (req, res) => {
      if (!req.file) return res.status(400).json({ error: "Falta el archivo 'archivo'" });
      try {
        const r = await ingestaArchivo(req.file.path, { borrarTrasLeer: true, ...opts });
        res.json(r);
      } catch (e) {
        res.status(422).json({ error: e.message });
      }
    },
  ];
}

module.exports = { ingestaArchivo, rutaIngesta };
