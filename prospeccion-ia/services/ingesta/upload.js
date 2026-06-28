"use strict";
/**
 * Capa de subida segura con multer (2.x). Aislada del parsing/normalización.
 * Guarda en disco con nombre generado (no se confía en el nombre del cliente),
 * filtra por extensión + mimetype, y limita tamaño.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const DIR_SUBIDAS = path.join(__dirname, "..", "..", "uploads");
const EXT_OK = new Set([".csv", ".xlsx", ".xls"]);
const MIME_OK = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // algunos navegadores mandan csv así
]);
const LIMITE_BYTES = 5 * 1024 * 1024; // 5 MB

fs.mkdirSync(DIR_SUBIDAS, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DIR_SUBIDAS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const id = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${id}${ext}`); // nombre del cliente NO se reutiliza
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!EXT_OK.has(ext)) return cb(new Error(`Extensión no permitida: ${ext}`));
  if (!MIME_OK.has(file.mimetype)) return cb(new Error(`Mimetype no permitido: ${file.mimetype}`));
  cb(null, true);
}

// Middleware listo para una ruta Express: upload.single("archivo")
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: LIMITE_BYTES, files: 1 },
});

module.exports = { upload, DIR_SUBIDAS, EXT_OK, MIME_OK, LIMITE_BYTES };
