#!/usr/bin/env node
/**
 * Genera mensajes de WhatsApp personalizados + links wa.me para los leads cualificados.
 *
 * Envío 1-click humano (anti-baneo): produce un .md con links clickeables; una persona abre
 * cada uno y envía. NO envía automáticamente. Reglas en references/compliance.md.
 *
 * Reusa el scoring de score-lead.js para decidir oferta/prioridad. Solo genera para leads
 * cualificados, prioridad alta/media, con celular válido.
 *
 * Uso:
 *   node genera-mensajes.js salida/estudios-contables-en-piura-peru.json \
 *     --ciudad Piura --cp-prefijo 20 --rubro contadores --remitente "Jerson Ancajima - Marketing Digital"
 */

const fs = require("fs");
const { scoreLead, clasificaWeb } = require("./score-lead");
const { validaVentana } = require("./valida-ventana");

const PAIS = "51"; // Perú

// Footer de opt-out obligatorio en todo mensaje de contacto en frío
// (requisito anti-spam / Ley 29733 de Protección de Datos Personales, Perú).
const OPT_OUT_LINE = "\n\nSi prefieres que no te contacte, respóndeme *BAJA* y no te escribo más. 🙏";

function args() {
  const a = { entrada: null, ciudad: null, cp: null, rubro: "su servicio", remitente: "Jerson Ancajima - Marketing Digital", salida: null };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    if (v[i] === "--ciudad") a.ciudad = v[++i];
    else if (v[i] === "--cp-prefijo") a.cp = v[++i];
    else if (v[i] === "--rubro") a.rubro = v[++i];
    else if (v[i] === "--remitente") a.remitente = v[++i];
    else if (v[i] === "--salida") a.salida = v[++i];
    else a.entrada = v[i];
  }
  return a;
}

// Celular peruano: 9 dígitos empezando en 9. Devuelve formato internacional o null.
function celular(tel) {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) return PAIS + d;
  if (d.length === 11 && d.startsWith(PAIS + "9")) return d;
  return null; // fijo u otro → WhatsApp no aplica
}

// Limpia nombres de ficha Google con keywords ("Empresa | Estudio Contable - Piura").
function nombreLimpio(empresa) {
  return (empresa || "").split("|")[0].trim() || empresa;
}

function redDeDominio(dom) {
  if (!dom) return "sus redes";
  if (dom.includes("tiktok")) return "TikTok";
  if (dom.includes("facebook")) return "Facebook";
  if (dom.includes("instagram")) return "Instagram";
  return "sus redes";
}

function mensajeAuditoria(lead, s, rubro, remitente) {
  const web = clasificaWeb(lead);
  if (web === "propia" || web === "gratis") {
    return `Hola, buen día 👋 Soy ${remitente}.\n\nEncontré la web de ${nombreLimpio(lead.empresa)} pero se ve desactualizada, y eso resta confianza a quien los busca en Google.\n\nLes hago una auditoría gratuita que revisa velocidad, errores y cómo se ven frente a su competencia. Sin compromiso. ¿Le interesa que se la pase?` + OPT_OUT_LINE;
  }
  return `Hola, buen día 👋 Soy ${remitente}.\n\nVi que ${nombreLimpio(lead.empresa)} aparece en Google, pero no encontré su página web. Hoy la gente busca ${rubro} en Google antes de decidir, y sin web esos clientes terminan eligiendo a otro.\n\nLes preparo una auditoría digital gratis (sin compromiso) que muestra qué están perdiendo y cómo solucionarlo. ¿Se la envío?` + OPT_OUT_LINE;
}

function mensajeAutomatizacion(lead, remitente) {
  const red = redDeDominio(lead.dominio);
  return `Hola, buen día 👋 Soy ${remitente}.\n\nVi que ${nombreLimpio(lead.empresa)} está activo en ${red} 👏 Buena presencia. Pero muchos estudios pierden consultas porque no alcanzan a responder a tiempo cada mensaje.\n\nArmamos un asistente con IA que responde, agenda citas y capta clientes 24/7 desde su WhatsApp y redes. ¿Le muestro en 5 min cómo funcionaría para ${nombreLimpio(lead.empresa)}?` + OPT_OUT_LINE;
}

// Llama a scoreLead con la forma correcta de opts. Antes se pasaba posicional
// (lead, ciudad, cp) pero la firma es scoreLead(lead, {modo,ciudad,cpPrefijo}),
// así que el filtro por ciudad/CP se ignoraba y se generaban mensajes a leads
// de otra ciudad.
function scoreParaMensajes(lead, ciudad, cp) {
  return scoreLead(lead, { modo: "dolor", ciudad, cpPrefijo: cp });
}

function main() {
  const a = args();
  if (!a.entrada) { console.error("uso: node genera-mensajes.js <prospeccion.json> --ciudad <C> [--cp-prefijo 20] [--rubro contadores] [--remitente \"...\"]"); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(a.entrada, "utf8"));
  const items = [];
  const saltados = { descalificado: 0, prioridad_baja: 0, sin_celular: 0 };

  for (const lead of data.leads || []) {
    const s = scoreParaMensajes(lead, a.ciudad, a.cp);
    if (s.descalificado) { saltados.descalificado++; continue; }
    if (s.prioridad === "1-2-baja") { saltados.prioridad_baja++; continue; }
    const cel = celular(lead.telefono);
    if (!cel) { saltados.sin_celular++; continue; }

    const msg = s.oferta === "Automatización IA"
      ? mensajeAutomatizacion(lead, a.remitente)
      : mensajeAuditoria(lead, s, a.rubro, a.remitente);
    const link = `https://wa.me/${cel}?text=${encodeURIComponent(msg)}`;

    items.push({
      place_id: lead.place_id, empresa: lead.empresa, telefono: lead.telefono, celular: cel,
      score: s.score, prioridad: s.prioridad, oferta: s.oferta, mensaje: msg, wa_link: link,
      // Trazabilidad del dato (base legal: interés legítimo B2B; origen público).
      fuente: "Google Business Profile (datos públicos)",
      obtenido: new Date().toISOString(),
    });
  }

  items.sort((x, y) => y.score - x.score);

  const baseSalida = a.salida || a.entrada.replace(/\.json$/, "") + "-mensajes";
  fs.writeFileSync(baseSalida + ".json", JSON.stringify({ total: items.length, saltados, items }, null, 2));

  // Markdown legible con links clickeables (1-click envío manual).
  let md = `# Mensajes WhatsApp — ${items.length} leads listos para contactar\n\n`;
  md += `> Click en el link → se abre WhatsApp con el mensaje cargado → revísalo y envíalo.\n`;
  md += `> Respeta compliance: horario comercial, gradual, registrar en Airtable.\n`;
  md += `> Datos de contacto: Google Business Profile (público). Todo mensaje incluye opción de baja (responder BAJA). Si piden baja, NO volver a contactar.\n\n`;
  for (const it of items) {
    md += `## ${it.empresa}  \`${it.score}\` ${it.prioridad} · ${it.oferta}\n`;
    md += `📞 ${it.telefono}\n\n`;
    md += "```\n" + it.mensaje + "\n```\n";
    md += `👉 [Abrir WhatsApp](${it.wa_link})\n\n---\n\n`;
  }
  fs.writeFileSync(baseSalida + ".md", md);

  console.log(`✓ ${items.length} mensajes generados. Saltados: ${JSON.stringify(saltados)}`);
  console.log(`  ${baseSalida}.md  (links clickeables)`);
  console.log(`  ${baseSalida}.json`);

  // Aviso de ventana de envío (no bloquea, solo informa).
  const w = validaVentana();
  const icono = { optimo: "✅", aceptable: "⚠️", malo: "❌" }[w.nivel];
  console.log(`\n${icono} Ventana de envío AHORA: ${w.nivel.toUpperCase()} (${w.dia} ${w.hora} Piura) — ${w.razon}`);
  if (w.nivel !== "optimo") console.log(`   👉 Esperá a la próxima ventana óptima: ${w.proxima}`);
}

module.exports = { mensajeAuditoria, mensajeAutomatizacion, scoreParaMensajes, celular, OPT_OUT_LINE };

if (require.main === module) main();
