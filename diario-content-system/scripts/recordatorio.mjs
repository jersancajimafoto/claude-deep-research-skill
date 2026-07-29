// Recordatorio diario de subida manual. Lo dispara launchd a las 18:45 (hora Perú).
// Busca en la cola el item pendiente cuya fecha (Lima) sea HOY, arma su carpeta de
// entrega si falta, muestra una notificación macOS y abre la carpeta en Finder.
// Uso: node scripts/recordatorio.mjs        (normal)
//      node scripts/recordatorio.mjs --test  (fuerza el primer pendiente, para probar)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const test = process.argv.includes("--test");

const q = JSON.parse(readFileSync(join(root, "content", "queue.json"), "utf8"));
const pend = q.items.filter(i => i.status === "pending").sort((a, b) => new Date(a.at) - new Date(b.at));
// 3 slots/día: dispara el item cuyo horario 'at' esté dentro de ±90 min de ahora (el más cercano).
const now = Date.now();
const WIN = 90 * 60 * 1000;
const item = test ? pend[0]
  : pend.filter(i => Math.abs(new Date(i.at).getTime() - now) <= WIN)
        .sort((a, b) => Math.abs(new Date(a.at) - now) - Math.abs(new Date(b.at) - now))[0];
if (!item) { console.log(`Sin subida en la ventana de ahora (${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}).`); process.exit(0); }

// asegura la carpeta de entrega
spawnSync(process.execPath, [join(__dir, "entregar.mjs"), item.slug], { stdio: "inherit" });

const dir = join(root, "para-subir", item.slug);
const frase = (JSON.parse(readFileSync(join(root, "content", `${item.slug}.json`), "utf8")).frase || "")
  .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
const hora = new Date(item.at).toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" });

// notificación macOS (con sonido)
const msg = `Reel de hoy listo (${hora}). Súbelo a FB + IG con audio trend. "${frase}…"`;
spawnSync("osascript", ["-e",
  `display notification ${JSON.stringify(msg)} with title "El Diario de los casi" sound name "Glass"`]);
// abre la carpeta en Finder
spawnSync("open", [dir]);
console.log(`Recordado: ${item.slug} -> ${dir}`);
