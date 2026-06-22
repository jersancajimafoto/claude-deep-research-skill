#!/usr/bin/env node
/**
 * Generador de informe de auditoría web — branding Kunda.
 *
 * Uso:
 *   node generar-informe.js config.json          -> genera HTML
 *   node generar-informe.js config.json --pdf     -> genera HTML + PDF
 *
 * config.json: cliente, URL, hallazgos, y opcionalmente:
 *   - "lighthouseReport": ruta a report.json (toma scores SEO/A11y/BestPractices)
 *   - "webVitals": {"lcp": <ms>, "cls": <num>, "inp": <ms|null>} del performance trace
 * El score de Performance se calcula desde los Core Web Vitals.
 *
 * Entregable: informe-<slug>.html (+ .pdf). Imprimir/compartir con el cliente.
 */
const fs = require('fs');
const path = require('path');

const cfgPath = process.argv[2];
const wantPdf = process.argv.includes('--pdf');
if (!cfgPath) { console.error('Uso: node generar-informe.js config.json [--pdf]'); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const tpl = fs.readFileSync(path.join(__dirname, 'informe-template.html'), 'utf8');

// ---- scores Lighthouse (SEO / A11y / Best Practices) ----
let scores = Object.assign({}, cfg.scores);
if (cfg.lighthouseReport) {
  const r = JSON.parse(fs.readFileSync(cfg.lighthouseReport, 'utf8'));
  const get = id => r.categories[id] ? Math.round(r.categories[id].score * 100) : null;
  scores.seo ??= get('seo');
  scores.accessibility ??= get('accessibility');
  scores.bestPractices ??= get('best-practices');
}

// ---- Core Web Vitals: estado, score y tarjetas ----
// Umbrales oficiales Google. score por métrica: bueno=95, mejorable=65, malo=30.
function rate(value, good, poor) {
  if (value == null) return { state: null, score: null };
  if (value <= good) return { state: 'bueno', score: 95 };
  if (value <= poor) return { state: 'mejorable', score: 65 };
  return { state: 'malo', score: 30 };
}
const wv = cfg.webVitals || {};
const lcp = rate(wv.lcp, 2500, 4000);
const cls = rate(wv.cls, 0.1, 0.25);
const inp = rate(wv.inp, 200, 500);

const fmtLcp = v => v == null ? 's/d' : v < 1000 ? v + ' ms' : (v / 1000).toFixed(2) + ' s';
const fmtCls = v => v == null ? 's/d' : v.toFixed(2);
const fmtInp = v => v == null ? 's/d' : v + ' ms';
const stateLbl = { bueno: 'Bueno', mejorable: 'Mejorable', malo: 'Malo', null: 'Sin datos' };

const vitalCard = (name, desc, val, r) => `
      <div class="vital">
        <div class="vname">${name}</div>
        <div class="vval">${val}</div>
        <div class="vdesc">${desc}</div>
        <span class="vstate ${r.state || ''}">${stateLbl[r.state] || 'Sin datos'}</span>
      </div>`;
const webVitalsHtml = [
  vitalCard('LCP', 'Tiempo hasta ver el contenido principal', fmtLcp(wv.lcp), lcp),
  vitalCard('CLS', 'Cuánto "salta" el diseño al cargar', fmtCls(wv.cls), cls),
  vitalCard('INP', 'Rapidez de respuesta al interactuar', fmtInp(wv.inp), inp),
].join('\n');

// score de Performance = promedio de las métricas con dato
if (scores.performance == null) {
  const xs = [lcp.score, cls.score, inp.score].filter(s => s != null);
  scores.performance = xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}

// ---- helpers visuales ----
const ringColor = s => s == null ? '#E3DBCB' : s >= 90 ? '#1E8A7B' : s >= 50 ? '#E8A24C' : '#E8714C';
const nz = s => (s == null ? '—' : s);
// escapa HTML en texto de cliente para que < > & no rompan el render
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- tabla de páginas auditadas (opcional) ----
const scClass = s => s == null ? '' : s >= 90 ? 'g' : s >= 50 ? 'a' : 'r';
let paginasSection = '';
if (Array.isArray(cfg.paginas) && cfg.paginas.length) {
  const rows = cfg.paginas.map(p => `
      <tr>
        <td class="pg">${esc(p.nombre)}</td>
        <td class="sc ${scClass(p.performance)}">${nz(p.performance)}</td>
        <td class="sc ${scClass(p.seo)}">${nz(p.seo)}</td>
        <td class="sc ${scClass(p.accessibility)}">${nz(p.accessibility)}</td>
        <td class="sc ${scClass(p.bestPractices)}">${nz(p.bestPractices)}</td>
      </tr>`).join('');
  paginasSection = `<section>
    <div class="kicker-line">Alcance</div>
    <h2>Páginas auditadas</h2>
    <p class="lead">Revisamos ${cfg.paginas.length} páginas clave del sitio. Los problemas se repiten en casi todas porque vienen de la plantilla común.</p>
    <table class="ptable">
      <thead><tr><th>Página</th><th style="text-align:center">Perf.</th><th style="text-align:center">SEO</th><th style="text-align:center">Acces.</th><th style="text-align:center">B. prácticas</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

// ---- hallazgos ----
const prMap = { alta: 'p-alta', media: 'p-media', baja: 'p-baja' };
const hallazgosHtml = (cfg.hallazgos || []).map(h => `
    <div class="finding ${prMap[h.prioridad] || ''}">
      <div class="top">
        <span class="badge ${h.prioridad}">${esc(h.prioridad)}</span>
        <h3>${esc(h.titulo)}</h3>
      </div>
      <p>${esc(h.problema)}</p>
      ${h.fix ? `<div class="fix"><b>Cómo se arregla:</b> ${esc(h.fix)}</div>` : ''}
    </div>`).join('\n');

// ---- rellenar plantilla ----
const out = tpl
  .replaceAll('{{CLIENTE}}', cfg.cliente || '')
  .replaceAll('{{URL}}', cfg.url || '')
  .replaceAll('{{FECHA}}', cfg.fecha || new Date().toLocaleDateString('es-PE'))
  .replaceAll('{{DISPOSITIVO}}', cfg.dispositivo || 'Móvil')
  .replaceAll('{{S_PERF}}', nz(scores.performance)).replaceAll('{{C_PERF}}', ringColor(scores.performance))
  .replaceAll('{{S_SEO}}', nz(scores.seo)).replaceAll('{{C_SEO}}', ringColor(scores.seo))
  .replaceAll('{{S_A11Y}}', nz(scores.accessibility)).replaceAll('{{C_A11Y}}', ringColor(scores.accessibility))
  .replaceAll('{{S_BP}}', nz(scores.bestPractices)).replaceAll('{{C_BP}}', ringColor(scores.bestPractices))
  .replaceAll('{{WEBVITALS}}', webVitalsHtml)
  .replaceAll('{{RESUMEN}}', cfg.resumen || '')
  .replaceAll('{{PAGINAS_SECTION}}', paginasSection)
  .replaceAll('{{HALLAZGOS}}', hallazgosHtml)
  .replaceAll('{{CTA_LINK}}', cfg.ctaLink || '#')
  .replaceAll('{{CONTACTO}}', cfg.contacto || 'kunda.video');

const slug = (cfg.cliente || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const htmlPath = path.join(__dirname, `informe-${slug}.html`);
fs.writeFileSync(htmlPath, out);
console.log('HTML generado:', htmlPath);

// ---- export PDF (opcional) ----
if (wantPdf) {
  (async () => {
    let puppeteer;
    try { puppeteer = require('puppeteer'); }
    catch { console.error('Falta puppeteer. Instala: npm install puppeteer'); process.exit(1); }
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
    const pdfPath = path.join(__dirname, `informe-${slug}.pdf`);
    await page.pdf({
      path: pdfPath, format: 'A4', printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    await browser.close();
    console.log('PDF generado:', pdfPath);
  })();
}
