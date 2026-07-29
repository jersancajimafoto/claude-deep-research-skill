// Genera el PNG 1080x1920 de una frase (identidad "Diario" — papel crema, tinta, acento terracota).
// Modo foto opcional: si content/<slug>.json trae "bg" y existe assets/backgrounds/<archivo>,
// compone la foto con tratamiento cálido + tarjeta de papel translúcida (texto siempre legible).
// Uso: node scripts/build-frase.mjs <slug>
// JSON: { "frase": "texto (admite <em> y <br>)", "kicker": "opcional", "caption": "...", "bg": "sem1-d1.webp (opcional)" }
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const slug = process.argv[2];
if (!slug) { console.error("Falta <slug>. Ej: node scripts/build-frase.mjs sem1-d1"); process.exit(1); }

const CHROME = process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const meta = JSON.parse(readFileSync(join(root, "content", `${slug}.json`), "utf8"));
const kicker = meta.kicker || "el diario de los casi";
const frase = meta.frase;
if (!frase) { console.error("El JSON no tiene 'frase'."); process.exit(1); }
const fraseHTML = frase.replace(/<em>/g, '<em style="font-style:italic;color:#a85f5a">');

// Paleta identidad Diario
const PAPEL = "#f3ecdd", TINTA = "#2b2320", ACENTO = "#a85f5a", LINEA = "#d9ccae";

// ¿modo foto?
const bgPath = meta.bg ? join(root, "assets", "backgrounds", meta.bg) : null;
const hasBg = bgPath && existsSync(bgPath);
const bgUrl = hasBg ? "file://" + bgPath : null;

const fonts = `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,500&family=Caveat:wght@600&display=swap" rel="stylesheet">`;

const flat = `
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(${PAPEL},${PAPEL} 78px,${LINEA} 79px,${PAPEL} 80px);opacity:.55"></div>
  <div style="position:absolute;left:150px;top:0;bottom:0;width:2px;background:${ACENTO};opacity:.35"></div>
  <div style="position:relative;font:600 34px/1 Caveat,cursive;color:${ACENTO};margin-bottom:70px;transform:rotate(-1.5deg)">${kicker}</div>
  <div style="position:relative;font:500 88px/1.4 'Playfair Display',serif;color:${TINTA};text-align:center;text-wrap:balance">${fraseHTML}</div>
  <div style="position:absolute;bottom:150px;font:600 42px/1 Caveat,cursive;color:${ACENTO};transform:rotate(-2deg)">El Diario de los casi</div>`;

const photo = `
  <div style="position:absolute;inset:0;background:url('${bgUrl}') center/cover;filter:saturate(.55) contrast(1.02) brightness(.82) sepia(.14)"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,16,12,.35) 0%,rgba(24,16,12,.15) 35%,rgba(24,16,12,.55) 100%)"></div>
  <div style="position:relative;width:820px;background:rgba(243,236,221,.93);border:1px solid rgba(168,95,90,.4);border-radius:6px;padding:90px 70px 80px;box-shadow:0 30px 80px rgba(0,0,0,.35);text-align:center">
    <div style="font:600 34px/1 Caveat,cursive;color:${ACENTO};margin-bottom:44px;transform:rotate(-1.5deg)">${kicker}</div>
    <div style="font:500 76px/1.4 'Playfair Display',serif;color:${TINTA};text-wrap:balance">${fraseHTML}</div>
    <div style="margin-top:56px;font:600 38px/1 Caveat,cursive;color:${ACENTO};transform:rotate(-1.5deg)">El Diario de los casi</div>
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8">${fonts}
<style>*{margin:0;padding:0;box-sizing:border-box}
.page{width:1080px;height:1920px;position:relative;overflow:hidden;background:${PAPEL};display:flex;flex-direction:column;justify-content:center;align-items:center;padding:110px}</style>
</head><body><div class="page">${hasBg ? photo : flat}</div></body></html>`;

const htmlPath = join(root, "content", `${slug}.export.html`);
writeFileSync(htmlPath, html);

const outDir = join(root, "assets", slug);
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle0" });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 350));
  const el = await page.$(".page");
  const file = join(outDir, `${slug}.png`);
  await el.screenshot({ path: file });
  console.log(`OK: ${file}${hasBg ? " (modo foto)" : " (modo papel)"}`);
} finally {
  await browser.close();
}
