// Renderiza brochure-capera.html -> PDF A4 vertical + PNG por página.
// Correr desde ig-content-system/ (ahí vive puppeteer-core). Chrome del sistema.
import puppeteer from "../../../ig-content-system/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const base = "/Users/jersancajima/Documents/GitHub/claude-deep-research-skill/marcas/jers-ia/propuesta-capera";
const html = join(base, "brochure-capera.html");
const outDir = join(base, "render");
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--hide-scrollbars", "--allow-file-access-from-files"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
  await page.goto("file://" + html, { waitUntil: "networkidle0" });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise(r => setTimeout(r, 600));

  // Aviso si alguna página se desborda de A4 (297mm).
  const overflow = await page.evaluate(() => {
    const mm = 297 * (96 / 25.4);
    return [...document.querySelectorAll(".page")]
      .map((el, i) => ({ n: i + 1, h: Math.round(el.scrollHeight), max: Math.round(mm) }))
      .filter(p => p.h > p.max + 2);
  });
  if (overflow.length) console.warn("DESBORDE:", overflow);

  const pages = await page.$$(".page");
  let n = 0;
  for (const el of pages) {
    n++;
    const file = join(outDir, `pag-${String(n).padStart(2, "0")}.png`);
    await el.screenshot({ path: file });
    console.log("PNG", file);
  }

  const pdf = join(outDir, "Propuesta-LomaAlta-EntregaEtapaI.pdf");
  await page.pdf({ path: pdf, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log("PDF", pdf, `(${n} páginas)`);
} finally {
  await browser.close();
}
