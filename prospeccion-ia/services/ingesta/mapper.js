"use strict";
/**
 * Mapper / normalizador de leads. FUNCIONES PURAS, sin dependencias externas.
 * Toma filas crudas (objeto keyed por encabezado del archivo) y las normaliza
 * a la forma limpia que se enviará a Airtable.
 *
 * Mismo input -> mismo output (determinista). Probado en ingesta.test.js.
 */

const PAIS = "51"; // Perú

// Alias de encabezados aceptados (se comparan en minúsculas, sin acentos/espacios).
const ALIAS = {
  nombre: ["nombre", "name", "empresa", "razonsocial", "contacto", "fullname"],
  telefono: ["telefono", "tel", "phone", "celular", "movil", "whatsapp", "wa"],
  correo: ["correo", "email", "mail", "ecorreo", "correoelectronico"],
};

// Normaliza una clave de encabezado para comparar: minúsculas, sin acentos, sin no-alfanum.
function claveCanonica(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Nombre: trim, colapsa espacios, Title Case respetando acentos.
function normalizaNombre(raw) {
  if (raw == null) return null;
  const limpio = String(raw).replace(/\s+/g, " ").trim();
  if (!limpio) return null;
  return limpio
    .split(" ")
    .map((p) => p.charAt(0).toLocaleUpperCase("es") + p.slice(1).toLocaleLowerCase("es"))
    .join(" ");
}

// Teléfono peruano -> E.164 "+51XXXXXXXXX". Devuelve null si no es válido.
function normalizaTelefono(raw) {
  if (raw == null) return null;
  // Si viene un enlace wa.link/wa.me, no hay número crudo utilizable -> null.
  if (/wa\.(me|link)/i.test(String(raw))) return null;
  let d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 9 && d.startsWith("9")) return "+" + PAIS + d; // celular
  if (d.length === 11 && d.startsWith(PAIS)) return "+" + d; // ya internacional
  if (d.length === 7 || d.length === 8) return "+" + PAIS + d; // fijo local
  return null; // no reconocido
}

// Correo: trim + minúsculas + validación básica. null si inválido.
function normalizaCorreo(raw) {
  if (raw == null) return null;
  const e = String(raw).trim().toLowerCase();
  if (!e) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/**
 * Construye un índice {campoLogico -> claveRealEnFila} a partir de los
 * encabezados presentes, usando los ALIAS.
 */
function detectaColumnas(fila) {
  const idx = {};
  const claves = Object.keys(fila);
  for (const campo of Object.keys(ALIAS)) {
    const aliasCanon = ALIAS[campo].map(claveCanonica);
    const hit = claves.find((k) => aliasCanon.includes(claveCanonica(k)));
    if (hit) idx[campo] = hit;
  }
  return idx;
}

/**
 * Normaliza una fila cruda -> lead limpio.
 * @param {object} fila  fila cruda del parser (keyed por encabezado).
 * @param {object} [columnas]  índice precomputado por detectaColumnas (opcional).
 * @returns {{nombre, telefono, correo, valido, _errores}}
 */
function normalizaLead(fila, columnas) {
  const idx = columnas || detectaColumnas(fila);
  const nombre = normalizaNombre(idx.nombre ? fila[idx.nombre] : null);
  const telefono = normalizaTelefono(idx.telefono ? fila[idx.telefono] : null);
  const correo = normalizaCorreo(idx.correo ? fila[idx.correo] : null);

  const _errores = [];
  if (!nombre) _errores.push("nombre faltante");
  if (!telefono && !correo) _errores.push("sin canal de contacto (telefono/correo)");

  return { nombre, telefono, correo, valido: _errores.length === 0, _errores };
}

/**
 * Da forma de registro Airtable a un lead limpio (campos -> "fields").
 * No escribe en Airtable; solo prepara el payload.
 */
function aRegistroAirtable(lead, extra = {}) {
  return {
    fields: {
      Nombre: lead.nombre || "",
      Telefono: lead.telefono || "",
      Correo: lead.correo || "",
      Estado: "Nuevo",
      "Fecha ingesta": new Date().toISOString().slice(0, 10),
      ...extra,
    },
  };
}

module.exports = {
  normalizaNombre,
  normalizaTelefono,
  normalizaCorreo,
  detectaColumnas,
  normalizaLead,
  aRegistroAirtable,
  claveCanonica,
};
