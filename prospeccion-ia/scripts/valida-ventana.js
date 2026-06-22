#!/usr/bin/env node
/**
 * Validador de ventana de envío para outreach (anti-quema de número, mejor tasa de respuesta).
 *
 * Evalúa si un momento dado cae en la ventana óptima para contactar PYMEs B2B por WhatsApp,
 * según día de semana y hora. Devuelve nivel (optimo/aceptable/malo), razón y la próxima
 * ventana óptima. Reglas alineadas con references/compliance.md.
 *
 * Perú no tiene horario de verano → offset fijo UTC-5. Para otra zona, pasar --offset.
 *
 * Uso:
 *   node valida-ventana.js                 # evalúa AHORA (hora Piura)
 *   node valida-ventana.js --offset -5     # otra zona
 */

const OFFSET_DEFAULT = -5; // Perú (America/Lima), sin DST
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Slots óptimos en minutos desde medianoche.
const SLOTS_OPTIMOS = [[570, 690], [930, 1050]]; // 9:30-11:30 y 15:30-17:30
const COMERCIAL = [540, 1080];                    // 9:00-18:00
const ALMUERZO = [780, 900];                      // 13:00-15:00

// Día: óptimo mar-jue (2-4), aceptable lun/vie (1,5), malo finde (0,6).
function nivelDia(d) {
  if (d >= 2 && d <= 4) return "optimo";
  if (d === 1 || d === 5) return "aceptable";
  return "malo";
}

function nivelHora(min) {
  if (SLOTS_OPTIMOS.some(([a, b]) => min >= a && min < b)) return "optimo";
  const enComercial = min >= COMERCIAL[0] && min < COMERCIAL[1];
  const enAlmuerzo = min >= ALMUERZO[0] && min < ALMUERZO[1];
  if (enComercial && !enAlmuerzo) return "aceptable";
  return "malo";
}

const peor = (a, b) => {
  const orden = { malo: 0, aceptable: 1, optimo: 2 };
  return orden[a] <= orden[b] ? a : b;
};

// Devuelve la "hora de pared" en la zona como un Date cuyos getUTC* son los locales.
function pared(date, offset) {
  return new Date(date.getTime() + offset * 3600 * 1000);
}

function proximaVentanaOptima(desde, offset) {
  // Avanza en pasos de 15 min hasta el primer momento día-óptimo + hora-óptima (máx ~10 días).
  // Alinea el inicio a múltiplo de 15 min para aterrizar en el borde limpio del slot (9:30, 15:30).
  let t = new Date(Math.ceil(desde.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
  for (let i = 0; i < 10 * 24 * 4; i++) {
    const p = pared(t, offset);
    const d = p.getUTCDay();
    const min = p.getUTCHours() * 60 + p.getUTCMinutes();
    if (nivelDia(d) === "optimo" && nivelHora(min) === "optimo") {
      const hh = String(p.getUTCHours()).padStart(2, "0");
      const mm = String(p.getUTCMinutes()).padStart(2, "0");
      return `${DIAS[d]} ${String(p.getUTCDate()).padStart(2, "0")}/${String(p.getUTCMonth() + 1).padStart(2, "0")} ${hh}:${mm}`;
    }
    t = new Date(t.getTime() + 15 * 60 * 1000);
  }
  return "no encontrada";
}

/** Evalúa un instante. Devuelve {nivel, ok, dia, hora, razon, proxima}. */
function validaVentana(date = new Date(), offset = OFFSET_DEFAULT) {
  const p = pared(date, offset);
  const d = p.getUTCDay();
  const min = p.getUTCHours() * 60 + p.getUTCMinutes();
  const nd = nivelDia(d), nh = nivelHora(min);
  const nivel = peor(nd, nh);
  const hh = String(p.getUTCHours()).padStart(2, "0");
  const mm = String(p.getUTCMinutes()).padStart(2, "0");

  const razones = [];
  if (nd === "malo") razones.push("fin de semana (no laboran)");
  else if (nd === "aceptable") razones.push(d === 1 ? "lunes (bandeja saturada)" : "viernes (ya desconectan)");
  if (nh === "malo") {
    if (min >= ALMUERZO[0] && min < ALMUERZO[1]) razones.push("hora de almuerzo");
    else razones.push("fuera de horario comercial");
  } else if (nh === "aceptable") razones.push("horario comercial pero no pico");

  return {
    nivel,
    ok: nivel !== "malo",
    dia: DIAS[d],
    hora: `${hh}:${mm}`,
    razon: razones.join("; ") || "día y hora óptimos",
    proxima: nivel === "optimo" ? "ahora" : proximaVentanaOptima(date, offset),
  };
}

module.exports = { validaVentana };

if (require.main === module) {
  let offset = OFFSET_DEFAULT;
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) if (v[i] === "--offset") offset = parseFloat(v[++i]);
  const r = validaVentana(new Date(), offset);
  const icono = { optimo: "✅", aceptable: "⚠️", malo: "❌" }[r.nivel];
  console.log(`${icono} Ventana de envío: ${r.nivel.toUpperCase()} — ${r.dia} ${r.hora} (Piura)`);
  console.log(`   ${r.razon}`);
  if (r.nivel !== "optimo") console.log(`   👉 Próxima ventana óptima: ${r.proxima}`);
}
