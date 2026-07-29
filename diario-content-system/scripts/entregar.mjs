// Modo ENTREGA (subida manual con audio trend): arma la carpeta para-subir/<slug>/
// con el mp4 y el caption.txt listo para copiar. No publica nada.
// Uso:
//   node scripts/entregar.mjs <slug>     -> arma un item
//   node scripts/entregar.mjs --all      -> arma todos los pending de la cola
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const outRoot = join(root, "para-subir");
mkdirSync(outRoot, { recursive: true });

const run = (script, args) => {
  const r = spawnSync(process.execPath, [join(__dir, script), ...args], { encoding: "utf8", stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${script} falló`);
};

function entregar(slug, at) {
  const meta = JSON.parse(readFileSync(join(root, "content", `${slug}.json`), "utf8"));
  const mp4 = join(root, `${slug}-reel.mp4`);
  if (!existsSync(join(root, "assets", slug, `${slug}.png`))) run("build-frase.mjs", [slug]);
  if (!existsSync(mp4)) run("frase-reel.mjs", [slug]);
  const dir = join(outRoot, slug);
  mkdirSync(dir, { recursive: true });
  copyFileSync(mp4, join(dir, `${slug}-reel.mp4`));
  const fecha = at ? new Date(at).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "full", timeStyle: "short" }) : "(sin fecha)";
  const txt = `SUBIR: ${fecha} (hora Perú)\nRedes: Facebook (Reel) + Instagram (Reel)\nAl subir: elegir SONIDO EN TENDENCIA en la app.\n\n----- CAPTION (copiar tal cual) -----\n${meta.caption || ""}\n`;
  writeFileSync(join(dir, "caption.txt"), txt);
  console.log(`OK entrega: para-subir/${slug}/  (${fecha})`);
}

if (process.argv.includes("--all")) {
  const q = JSON.parse(readFileSync(join(root, "content", "queue.json"), "utf8"));
  for (const it of q.items.filter(i => i.status === "pending")) entregar(it.slug, it.at);
} else {
  const slug = process.argv[2];
  if (!slug) { console.error("Falta <slug> o --all."); process.exit(1); }
  const q = JSON.parse(readFileSync(join(root, "content", "queue.json"), "utf8"));
  const it = q.items.find(i => i.slug === slug);
  entregar(slug, it?.at);
}
