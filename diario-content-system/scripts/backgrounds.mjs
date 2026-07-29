// Genera el fondo de cada frase a partir de content/<slug>.json -> img_prompt.
// Fuente por defecto: Pollinations.ai (FLUX, GRATIS, sin cuenta ni clave).
// Opcional: --openrouter usa OpenRouter/FLUX (requiere OPENROUTER_API_KEY sk-or- en .env, de pago).
// Estilo fijo (mismo tratamiento) para mantener identidad. Idempotente: solo genera los que faltan.
// Uso:
//   node scripts/backgrounds.mjs                 -> todos los pending de la cola (Pollinations)
//   node scripts/backgrounds.mjs sem1-d3         -> uno
//   node scripts/backgrounds.mjs --force sem1-d3 -> regenera
//   node scripts/backgrounds.mjs --openrouter    -> usa OpenRouter en vez de Pollinations
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const bgDir = join(root, "assets", "backgrounds");
mkdirSync(bgDir, { recursive: true });

const force = process.argv.includes("--force");
const useOR = process.argv.includes("--openrouter");
const args = process.argv.slice(2).filter(a => !a.startsWith("--"));

const STYLE = "Cinematic 35mm film photograph, vertical composition, %s, muted desaturated warm tones, soft natural light, quiet melancholic mood, visible film grain, no people, no text, no words, shallow depth of field, editorial fine-art photography";

// --- fuente OpenRouter (opcional, de pago) ---
let KEY;
if (useOR) {
  const envPath = join(root, ".env");
  KEY = process.env.OPENROUTER_API_KEY;
  if (!KEY && existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^\s*OPENROUTER_API_KEY=(.+)$/m);
    if (m) KEY = m[1].trim().replace(/^["']|["']$/g, "");
  }
  if (!KEY || !KEY.startsWith("sk-or-")) { console.error("--openrouter: falta OPENROUTER_API_KEY (sk-or-) en .env."); process.exit(1); }
}
const GEN = join(process.env.HOME, ".claude/skills/generate-image/scripts/generate_image.py");

async function pollinations(prompt, out, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&model=flux&seed=${seed}`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 5000) throw new Error("respuesta muy chica");
      writeFileSync(out, buf);
      return true;
    } catch (e) { console.error(`  intento ${i + 1} falló (${e.message})`); }
  }
  return false;
}

let slugs;
if (args[0]) slugs = [args[0]];
else slugs = JSON.parse(readFileSync(join(root, "content", "queue.json"), "utf8"))
  .items.filter(i => i.status === "pending").map(i => i.slug);

let seed = 7;
for (const slug of slugs) {
  const metaPath = join(root, "content", `${slug}.json`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!meta.img_prompt) { console.log(`- ${slug}: sin img_prompt, salto.`); continue; }
  const out = join(bgDir, `${slug}.png`);
  if (existsSync(out) && !force) { console.log(`= ${slug}: ya existe, salto.`); meta.bg = `${slug}.png`; writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n"); continue; }
  const prompt = STYLE.replace("%s", meta.img_prompt);
  console.log(`~ ${slug}: generando (${useOR ? "OpenRouter" : "Pollinations"})...`);
  let ok;
  if (useOR) {
    const r = spawnSync("python3", [GEN, prompt, "--model", "black-forest-labs/flux.2-pro", "--output", out],
      { encoding: "utf8", env: { ...process.env, OPENROUTER_API_KEY: KEY } });
    ok = r.status === 0 && existsSync(out);
  } else {
    ok = await pollinations(prompt, out, seed++);
  }
  if (!ok) { console.error(`  FALLÓ ${slug}.`); continue; }
  meta.bg = `${slug}.png`;
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  rmSync(join(root, "assets", slug, `${slug}.png`), { force: true });
  rmSync(join(root, `${slug}-reel.mp4`), { force: true });
  console.log(`  OK ${slug} -> assets/backgrounds/${slug}.png`);
}
console.log("Listo. Ahora: node scripts/entregar.mjs --all  (rearma los mp4 con los fondos).");
