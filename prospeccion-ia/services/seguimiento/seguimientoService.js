"use strict";
/**
 * seguimientoService — gestiona toques de seguimiento, estado del lead,
 * fecha de próximo contacto y recordatorios del día.
 *
 * FUNCIONES PURAS, sin dependencias externas, sin PII hardcodeada.
 * Fechas en formato ISO "YYYY-MM-DD".
 */

// Estados del ciclo de vida del lead.
const ESTADOS = Object.freeze(["Nuevo", "Contactado", "En seguimiento", "Ganado", "Perdido"]);
const ACTIVOS = Object.freeze(["Nuevo", "Contactado", "En seguimiento"]); // aún se trabajan
const CERRADOS = Object.freeze(["Ganado", "Perdido"]);

// Resultado posible de un toque.
const RESULTADOS = Object.freeze(["sin_respuesta", "contactado", "agendado", "no_interesado", "ganado"]);

// Canales de contacto válidos.
const CANALES = Object.freeze(["whatsapp", "llamada", "correo", "presencial"]);

// Backoff (días) para reintentos sin respuesta. Tras agotarlo -> Perdido.
const BACKOFF = Object.freeze([1, 2, 4, 7]);
const DIAS_TRAS_CONTACTO = 3;

// --- helpers de fecha (puros) ---

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00Z");
  if (isNaN(d.getTime())) throw new TypeError(`Fecha inválida: ${isoDate}`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function esFechaISO(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Normaliza/valida un toque.
 * @param {object} t { canal, resultado, nota?, fecha, fechaAgenda? }
 */
function nuevoToque(t = {}) {
  if (!CANALES.includes(t.canal)) throw new Error(`canal inválido: ${t.canal}`);
  if (!RESULTADOS.includes(t.resultado)) throw new Error(`resultado inválido: ${t.resultado}`);
  if (!esFechaISO(t.fecha)) throw new Error(`fecha inválida (YYYY-MM-DD): ${t.fecha}`);
  if (t.resultado === "agendado" && !esFechaISO(t.fechaAgenda)) {
    throw new Error("resultado 'agendado' requiere fechaAgenda (YYYY-MM-DD)");
  }
  return {
    canal: t.canal,
    resultado: t.resultado,
    nota: typeof t.nota === "string" ? t.nota.trim() : "",
    fecha: t.fecha,
    fechaAgenda: t.fechaAgenda || null,
  };
}

/**
 * Aplica un toque al estado del lead -> nuevo estado, intentos, próximo contacto.
 * PURA: no muta la entrada.
 * @param {object} estadoLead { estado, intentos }
 * @param {object} toque       (de nuevoToque)
 */
function aplicarToque(estadoLead = {}, toque) {
  const t = nuevoToque(toque);
  const intentos = (estadoLead.intentos || 0) + 1;
  let estado = estadoLead.estado || "Nuevo";
  let proximoContacto = null;

  switch (t.resultado) {
    case "contactado":
      estado = "En seguimiento";
      proximoContacto = addDays(t.fecha, DIAS_TRAS_CONTACTO);
      break;
    case "agendado":
      estado = "En seguimiento";
      proximoContacto = t.fechaAgenda;
      break;
    case "sin_respuesta":
      if (intentos <= BACKOFF.length) {
        estado = estado === "Nuevo" ? "Contactado" : estado;
        proximoContacto = addDays(t.fecha, BACKOFF[intentos - 1]);
      } else {
        estado = "Perdido"; // agotó reintentos
      }
      break;
    case "no_interesado":
      estado = "Perdido";
      break;
    case "ganado":
      estado = "Ganado";
      break;
  }

  return { estado, intentos, proximoContacto, ultimoToque: t.fecha };
}

/**
 * Recordatorios del día: leads activos cuyo próximo contacto ya venció (<= hoy).
 * @param {Array<{id?, estado, proximoContacto}>} leads
 * @param {string} hoy  ISO "YYYY-MM-DD"
 */
function recordatoriosDelDia(leads, hoy) {
  if (!esFechaISO(hoy)) throw new TypeError(`hoy inválido: ${hoy}`);
  if (!Array.isArray(leads)) throw new TypeError("leads debe ser array");
  return leads.filter(
    (l) => ACTIVOS.includes(l.estado) && esFechaISO(l.proximoContacto) && l.proximoContacto <= hoy
  );
}

/**
 * Payload Airtable para la tabla "Toques de seguimiento".
 * No escribe en Airtable; solo arma fields. leadId = id del registro Lead enlazado.
 */
function payloadToque(leadId, toque) {
  const t = nuevoToque(toque);
  return {
    fields: {
      Lead: leadId ? [leadId] : [],
      Canal: t.canal,
      Resultado: t.resultado,
      Nota: t.nota,
      Fecha: t.fecha,
      "Próximo contacto": t.resultado === "agendado" ? t.fechaAgenda : null,
    },
  };
}

module.exports = {
  ESTADOS, ACTIVOS, CERRADOS, RESULTADOS, CANALES, BACKOFF,
  addDays, esFechaISO, nuevoToque, aplicarToque, recordatoriosDelDia, payloadToque,
};
