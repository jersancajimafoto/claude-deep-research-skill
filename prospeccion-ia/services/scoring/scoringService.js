"use strict";
/**
 * scoringService — califica un lead del CRM.
 * FUNCIÓN PURA, sin dependencias externas, sin PII hardcodeada.
 * Mismo input -> mismo output (determinista).
 *
 * Entrada: lead { nombre, telefono, correo, empresa, origen }
 * Salida:  { score (1..100), categoria ("Alta"|"Media"|"Baja"), desglose }
 */

// Pesos de cada regla. Suman 100 como máximo (transparente y testeable).
const PESOS = Object.freeze({
  correo: 20,   // correo válido
  telefono: 30, // teléfono E.164 válido para WhatsApp
  empresa: 25,  // incluye nombre de empresa
  nombre: 15,   // incluye nombre del contacto
  origen: 10,   // calidad de la fuente
});

// Peso por origen (calidad de la fuente). Default -> "otro".
const ORIGEN_PESO = Object.freeze({
  referido: 10,
  evento: 8,
  web: 7,
  csv: 5,
  otro: 3,
});

// Umbrales de categoría.
const UMBRAL_ALTA = 70;
const UMBRAL_MEDIA = 40;

// --- validadores puros ---

function correoValido(c) {
  if (typeof c !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
}

// WhatsApp = número móvil en E.164. Genérico E.164 estricto;
// para Perú (+51) exige prefijo móvil 9 (consistente con el ingestaService).
function telefonoWhatsAppValido(t) {
  if (typeof t !== "string") return false;
  const s = t.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(s)) return false; // E.164 estricto
  if (s.startsWith("+51")) return /^\+519\d{8}$/.test(s); // móvil Perú
  return true; // otro país: E.164 válido se acepta como WhatsApp-capable
}

function textoPresente(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function pesoOrigen(origen) {
  const k = textoPresente(origen) ? origen.trim().toLowerCase() : "otro";
  return Object.prototype.hasOwnProperty.call(ORIGEN_PESO, k)
    ? ORIGEN_PESO[k]
    : ORIGEN_PESO.otro;
}

function categoriaDe(score) {
  if (score >= UMBRAL_ALTA) return "Alta";
  if (score >= UMBRAL_MEDIA) return "Media";
  return "Baja";
}

/**
 * Califica un lead.
 * @param {object} lead
 * @returns {{score:number, categoria:string, desglose:object}}
 */
function scoreLead(lead) {
  if (lead == null || typeof lead !== "object") {
    throw new TypeError("scoreLead: 'lead' debe ser un objeto");
  }

  const desglose = {
    correo: correoValido(lead.correo) ? PESOS.correo : 0,
    telefono: telefonoWhatsAppValido(lead.telefono) ? PESOS.telefono : 0,
    empresa: textoPresente(lead.empresa) ? PESOS.empresa : 0,
    nombre: textoPresente(lead.nombre) ? PESOS.nombre : 0,
    origen: pesoOrigen(lead.origen),
  };

  const bruto = Object.values(desglose).reduce((a, b) => a + b, 0);
  const score = Math.max(1, Math.min(100, bruto)); // garantiza rango 1..100

  return { score, categoria: categoriaDe(score), desglose };
}

module.exports = {
  scoreLead,
  categoriaDe,
  correoValido,
  telefonoWhatsAppValido,
  PESOS,
  ORIGEN_PESO,
  UMBRAL_ALTA,
  UMBRAL_MEDIA,
};
