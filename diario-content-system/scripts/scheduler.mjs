// Scheduler local por HORA EXACTA: publica los reels cuya hora programada ya pasó.
// Lo dispara launchd cada 30 min. Cada item de la cola tiene su 'at' (ISO con -05:00, hora Perú).
// Uso: node scripts/scheduler.mjs        -> publica el item vencido más antiguo (si enabled)
//      node scripts/scheduler.mjs --dry  -> muestra qué publicaría, sin publicar
// Cola: content/queue.json  { enabled, items:[{slug, at, status}] }
// Pipeline por item: build-frase -> frase-reel -> publish reel --publish
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const queuePath = join(root, "content", "queue.json");
const logDir = join(root, "logs");
mkdirSync(logDir, { recursive: true });
const dry = process.argv.includes("--dry");
const log = (m) => {
  const line = `[${new Date().toISOString()}] ${m}`;
  console.log(line); appendFileSync(join(logDir, "scheduler.log"), line + "\n");
};

const q = JSON.parse(readFileSync(queuePath, "utf8"));
if (!q.enabled) { log("PAUSADO (enabled=false)."); process.exit(0); }
q.items ||= [];

const now = Date.now();
const due = q.items
  .filter(it => it.status === "pending" && new Date(it.at).getTime() <= now)
  .sort((a, b) => new Date(a.at) - new Date(b.at));

if (due.length === 0) {
  const next = q.items.filter(it => it.status === "pending").sort((a, b) => new Date(a.at) - new Date(b.at))[0];
  log(`Nada vencido. ${next ? "Próximo: " + next.slug + " @ " + next.at : "Cola vacía."}`);
  process.exit(0);
}

const item = due[0]; // uno por corrida (evita ráfagas si la Mac estuvo apagada)
log(`Vencido: ${item.slug} (programado ${item.at})${dry ? " (DRY)" : ""}. Pendientes vencidos: ${due.length}`);
if (dry) { log(`DRY: publicaría ${item.slug}.`); process.exit(0); }

const run = (script, args) => {
  const r = spawnSync(process.execPath, [join(__dir, script), ...args], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  appendFileSync(join(logDir, "scheduler.log"), out);
  if (r.status !== 0) throw new Error(`${script} salió con ${r.status}`);
  return out;
};

try {
  if (!existsSync(join(root, `${item.slug}-reel.mp4`))) {
    run("build-frase.mjs", [item.slug]);
    run("frase-reel.mjs", [item.slug]);
  }
  run("publish.mjs", ["reel", item.slug, "--publish"]);
  item.status = "published"; item.published_at = new Date().toISOString();
  log(`PUBLICADO: ${item.slug}`);
} catch (e) {
  item.retries = (item.retries || 0) + 1;
  if (item.retries >= 3) { item.status = "failed"; log(`FALLÓ definitivo (${item.retries} intentos): ${item.slug} — ${e.message}`); }
  else log(`FALLÓ (intento ${item.retries}/3, reintenta próxima corrida): ${item.slug} — ${e.message}`);
}
writeFileSync(queuePath, JSON.stringify(q, null, 2) + "\n");
