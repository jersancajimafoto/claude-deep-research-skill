"use strict";
/**
 * metricasService — agrega métricas de conversión del pipeline CRM.
 * FUNCIONES PURAS, sin dependencias externas, sin PII.
 *
 * Entrada: array de leads { estado, categoria, score, origen }.
 * "Conversión" = lead en estado "Ganado".
 */

const ACTIVOS = ["Nuevo", "Contactado", "En seguimiento"];

// Redondea a `dec` decimales (porcentaje 0..100).
function pct(num, den, dec = 1) {
  if (!den) return 0;
  const p = (num / den) * 100;
  const f = Math.pow(10, dec);
  return Math.round(p * f) / f;
}

function contarPor(leads, campo) {
  const out = {};
  for (const l of leads) {
    const k = l && l[campo] != null && String(l[campo]).trim() !== "" ? l[campo] : "(sin dato)";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

/**
 * Métricas globales.
 * @param {Array} leads
 * @returns {{
 *   total, porEstado, porCategoria, porOrigen,
 *   contactados, ganados, perdidos, activos,
 *   tasaContacto, conversionGlobal, conversionEfectiva, scorePromedio, embudo
 * }}
 */
function calcularMetricas(leads) {
  if (!Array.isArray(leads)) throw new TypeError("leads debe ser array");
  const total = leads.length;

  const porEstado = contarPor(leads, "estado");
  const porCategoria = contarPor(leads, "categoria");
  const porOrigen = contarPor(leads, "origen");

  const nuevos = porEstado["Nuevo"] || 0;
  const ganados = porEstado["Ganado"] || 0;
  const perdidos = porEstado["Perdido"] || 0;
  const activos = ACTIVOS.reduce((a, e) => a + (porEstado[e] || 0), 0);
  const contactados = total - nuevos; // recibieron al menos un toque

  const conScore = leads.filter((l) => typeof l.score === "number");
  const scorePromedio = conScore.length
    ? Math.round((conScore.reduce((a, l) => a + l.score, 0) / conScore.length) * 10) / 10
    : 0;

  return {
    total,
    porEstado,
    porCategoria,
    porOrigen,
    contactados,
    ganados,
    perdidos,
    activos,
    tasaContacto: pct(contactados, total),       // % que recibió gestión
    conversionGlobal: pct(ganados, total),       // ganados / total
    conversionEfectiva: pct(ganados, contactados), // ganados / contactados
    scorePromedio,
    embudo: {
      Nuevo: nuevos,
      Contactado: porEstado["Contactado"] || 0,
      "En seguimiento": porEstado["En seguimiento"] || 0,
      Ganado: ganados,
      Perdido: perdidos,
    },
  };
}

/**
 * Conversión desglosada por una dimensión (origen, categoria, ...).
 * Útil para validar si el scoring predice conversión.
 * @returns {Object<string,{total, ganados, conversion}>}
 */
function conversionPor(leads, campo) {
  if (!Array.isArray(leads)) throw new TypeError("leads debe ser array");
  const grupos = {};
  for (const l of leads) {
    const k = l && l[campo] != null && String(l[campo]).trim() !== "" ? l[campo] : "(sin dato)";
    if (!grupos[k]) grupos[k] = { total: 0, ganados: 0, conversion: 0 };
    grupos[k].total += 1;
    if (l.estado === "Ganado") grupos[k].ganados += 1;
  }
  for (const k of Object.keys(grupos)) {
    grupos[k].conversion = pct(grupos[k].ganados, grupos[k].total);
  }
  return grupos;
}

module.exports = { calcularMetricas, conversionPor, pct };
