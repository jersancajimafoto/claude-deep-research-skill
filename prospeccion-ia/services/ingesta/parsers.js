"use strict";
/**
 * Parsers de archivos -> array de filas crudas (objetos keyed por encabezado).
 * CSV via csv-parser (stream). XLSX via SheetJS (xlsx).
 * No normalizan nada: eso lo hace mapper.js.
 */

const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const XLSX = require("xlsx");

// Lee un .csv y resuelve a un array de objetos. Rechaza en error de stream.
function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const filas = [];
    fs.createReadStream(filePath)
      .on("error", reject)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
      .on("data", (fila) => filas.push(fila))
      .on("end", () => resolve(filas))
      .on("error", reject);
  });
}

// Lee la primera hoja de un .xlsx y devuelve array de objetos.
function parseXlsx(filePath) {
  const wb = XLSX.readFile(filePath);
  const hoja = wb.Sheets[wb.SheetNames[0]];
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json(hoja, { defval: null, raw: false });
}

// Dispatcher por extensión. Lanza si la extensión no es soportada.
async function parseArchivo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv") return parseCsv(filePath);
  if (ext === ".xlsx" || ext === ".xls") return parseXlsx(filePath);
  throw new Error(`Extensión no soportada: ${ext}`);
}

module.exports = { parseCsv, parseXlsx, parseArchivo };
