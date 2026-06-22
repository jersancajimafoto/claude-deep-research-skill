#!/usr/bin/env node
/**
 * Normaliza una URL/dominio a una clave determinista para deduplicar leads.
 *
 * Reglas: minúsculas, sin protocolo, sin "www.", sin path/query/hash, sin puerto,
 * sin punto/barra final. Mismo input lógico -> mismo output siempre.
 *
 *   normalizaDominio("https://www.Ejemplo.com/contacto?x=1") === "ejemplo.com"
 *   normalizaDominio(null) === null
 *
 * Uso CLI:  node normaliza-dominio.js "https://www.Ejemplo.com/x"
 */

function normalizaDominio(input) {
  if (!input || typeof input !== "string") return null;
  let s = input.trim().toLowerCase();
  if (!s) return null;

  // Asegura un protocolo para que el parser de URL funcione.
  if (!/^[a-z]+:\/\//.test(s)) s = "http://" + s;

  let host;
  try {
    host = new URL(s).hostname;
  } catch {
    // Fallback: extrae el host a mano si la URL es inválida.
    host = s.replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0].split(":")[0];
  }

  host = host.replace(/^www\./, "").replace(/\.+$/, "").trim();
  return host || null;
}

module.exports = { normalizaDominio };

// Ejecución directa como CLI.
if (require.main === module) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("uso: node normaliza-dominio.js <url-o-dominio>");
    process.exit(1);
  }
  console.log(normalizaDominio(arg));
}
