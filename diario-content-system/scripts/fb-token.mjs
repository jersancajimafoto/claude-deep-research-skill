// Intercambia un token de usuario CORTO por credenciales de larga duración y las ESCRIBE en .env:
// FB_PAGE_ID + FB_PAGE_TOKEN (página) e IG_USER_ID + IG_ACCESS_TOKEN (IG Business vinculado).
// Uso (en tu terminal; los secretos NO van al chat):
//   APP_ID=xxx APP_SECRET=xxx USER_TOKEN=xxx node scripts/fb-token.mjs
// Opcional: PAGE_NAME=eldiariodeloscasi (default) para elegir la Página si tienes varias.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "..", ".env");
const V = process.env.GRAPH_VERSION || "v21.0";
const APP_ID = process.env.APP_ID || process.argv[2];
const APP_SECRET = process.env.APP_SECRET || process.argv[3];
const USER_TOKEN = process.env.USER_TOKEN || process.argv[4];
const PAGE_NAME = (process.env.PAGE_NAME || "diario").toLowerCase();
if (!APP_ID || !APP_SECRET || !USER_TOKEN) {
  console.error("Falta APP_ID, APP_SECRET o USER_TOKEN.\nUso: APP_ID=.. APP_SECRET=.. USER_TOKEN=.. node scripts/fb-token.mjs");
  process.exit(1);
}
const g = async (p) => {
  const r = await fetch(`https://graph.facebook.com/${V}/${p}`);
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  return j;
};
function setEnv(key, val) {
  let lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
  lines = lines.filter(l => !new RegExp(`^\\s*${key}=`).test(l));
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  lines.push(`${key}=${val}`);
  writeFileSync(envPath, lines.join("\n") + "\n");
}
try {
  // 1) user token corto -> user token largo (~60 días; el page token derivado no expira)
  const ll = await g(`oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${USER_TOKEN}`);
  // 2) Páginas del usuario + su Page token
  const accts = await g(`me/accounts?fields=name,id,access_token&access_token=${ll.access_token}`);
  if (!accts.data?.length) { console.error("No se encontraron Páginas en esta cuenta."); process.exit(1); }
  let page = accts.data.find(p => p.name.toLowerCase().includes(PAGE_NAME)) || accts.data[0];
  console.log(`Página elegida: ${page.name} (${page.id})`);
  // 3) IG Business vinculado a la página
  const igq = await g(`${page.id}?fields=instagram_business_account&access_token=${page.access_token}`);
  const igId = igq.instagram_business_account?.id || "";
  if (!igId) console.warn("AVISO: la página no tiene IG Business vinculado; IG_USER_ID queda vacío.");
  setEnv("FB_PAGE_ID", page.id);
  setEnv("FB_PAGE_TOKEN", page.access_token);
  setEnv("IG_USER_ID", igId);
  setEnv("IG_ACCESS_TOKEN", ll.access_token);
  setEnv("GRAPH_VERSION", V);
  console.log(`OK: .env escrito (FB_PAGE_ID, FB_PAGE_TOKEN, IG_USER_ID=${igId || "—"}, IG_ACCESS_TOKEN).`);
  console.log("Verifica con: node scripts/publish.mjs check");
} catch (e) {
  console.error("ERROR:", e.message);
  process.exit(1);
}
