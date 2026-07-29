// Convierte el PNG de una frase en un reel .mp4 9:16 (zoom lento Ken Burns + fade).
// SIN audio — la música trend se agrega al programar/publicar (o queda instrumental el video).
// Uso: node scripts/frase-reel.mjs <slug> [segundos]   (default 9s)
// Lee assets/<slug>/<slug>.png -> escribe <slug>-reel.mp4 en la raíz del proyecto.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const slug = process.argv[2];
const SEG = parseFloat(process.argv[3] || "9");
if (!slug) { console.error("Falta <slug>."); process.exit(1); }

const png = join(root, "assets", slug, `${slug}.png`);
if (!existsSync(png)) { console.error(`No existe ${png}. Corre antes build-frase.mjs ${slug}.`); process.exit(1); }

const out = join(root, `${slug}-reel.mp4`);
const FPS = 30, frames = Math.round(SEG * FPS);
// zoom 1.00 -> 1.07 centrado, fade in/out 0.6s
const vf = [
  `scale=2160:3840`,
  `zoompan=z='1+0.07*on/${frames}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${frames}:s=1080x1920:fps=${FPS}`,
  `fade=t=in:st=0:d=0.6,fade=t=out:st=${(SEG - 0.6).toFixed(1)}:d=0.6`,
  `format=yuv420p`,
].join(",");

execFileSync("ffmpeg", [
  "-y", "-loop", "1", "-i", png,
  "-vf", vf, "-t", String(SEG),
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart",
  out,
], { stdio: "inherit" });
console.log("OK:", out);
