// Publica el reel de un slug en la página de FB (como Reel) y en IG (@eldiariodeloscasi).
// Uso:
//   node scripts/publish.mjs check                    -> verifica credenciales (página + IG)
//   node scripts/publish.mjs reel <slug>              -> DRY-RUN: sube el mp4 y muestra URL (no publica)
//   node scripts/publish.mjs reel <slug> --publish    -> publica FB Reel + IG Reel
//   node scripts/publish.mjs reel <slug> --publish --fb-only
// Lee <slug>-reel.mp4 (raíz) y el caption de content/<slug>.json.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
// carga .env
const envPath = join(root, ".env");
if (existsSync(envPath)) for (const l of readFileSync(envPath, "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { FB_PAGE_ID, FB_PAGE_TOKEN, IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
const V = process.env.GRAPH_VERSION || "v21.0";
const G = `https://graph.facebook.com/${V}`;

const api = async (path, params, token, method = "POST") => {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const r = method === "GET"
    ? await fetch(`${G}/${path}?${qs}`)
    : await fetch(`${G}/${path}`, { method, body: qs });
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${JSON.stringify(j.error)}`);
  return j;
};

const cmd = process.argv[2];

if (cmd === "check") {
  if (FB_PAGE_ID && FB_PAGE_TOKEN) {
    const p = await api(`${FB_PAGE_ID}`, { fields: "name,followers_count" }, FB_PAGE_TOKEN, "GET");
    console.log(`FB OK: ${p.name} — ${p.followers_count} seguidores`);
  } else console.log("FB: sin configurar (FB_PAGE_ID/FB_PAGE_TOKEN).");
  if (IG_USER_ID && IG_ACCESS_TOKEN) {
    const u = await api(`${IG_USER_ID}`, { fields: "username,followers_count" }, IG_ACCESS_TOKEN, "GET");
    console.log(`IG OK: @${u.username} — ${u.followers_count} seguidores`);
  } else console.log("IG: sin configurar (IG_USER_ID/IG_ACCESS_TOKEN).");
  process.exit(0);
}

if (cmd !== "reel") { console.error("Uso: publish.mjs check | reel <slug> [--publish] [--fb-only]"); process.exit(1); }
const slug = process.argv[3];
const doPublish = process.argv.includes("--publish");
const fbOnly = process.argv.includes("--fb-only");
if (!slug) { console.error("Falta <slug>."); process.exit(1); }

const caption = JSON.parse(readFileSync(join(root, "content", `${slug}.json`), "utf8")).caption || "";
const mp4 = join(root, `${slug}-reel.mp4`);
if (!existsSync(mp4)) { console.error(`No existe ${mp4}. Corre frase-reel.mjs ${slug}.`); process.exit(1); }

// hosting público temporal (Meta descarga el archivo desde ahí)
const HOSTS = [
  async (buf, name) => {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("fileToUpload", new Blob([buf], { type: "video/mp4" }), name);
    const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd });
    const u = (await r.text()).trim();
    if (!/^https:\/\/files\.catbox\.moe\//.test(u)) throw new Error("catbox: " + u);
    return u;
  },
  async (buf, name) => {
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: "video/mp4" }), name);
    const r = await fetch("https://tmpfiles.org/api/v1/upload", { method: "POST", body: fd });
    const j = await r.json();
    const u = j?.data?.url;
    if (!u) throw new Error("tmpfiles: " + JSON.stringify(j));
    return u.replace(/^http:/, "https:").replace("tmpfiles.org/", "tmpfiles.org/dl/");
  },
];
async function uploadVideo(path) {
  const buf = readFileSync(path);
  const name = path.split("/").pop();
  let last;
  for (const host of HOSTS) {
    try { return await host(buf, name); }
    catch (e) { last = e; console.error("  host falló (" + e.message + "), probando siguiente..."); }
  }
  throw new Error("Todos los hosts fallaron: " + (last?.message || "?"));
}

console.log("Subiendo video a hosting público...");
const videoUrl = await uploadVideo(mp4);
console.log("URL:", videoUrl);
if (!doPublish) { console.log("\nDRY-RUN. Caption:\n" + caption + "\n\nPara publicar: agrega --publish"); process.exit(0); }

// ── Facebook: como REEL de página (start -> rupload con file_url -> finish). Fallback: /videos.
async function publishFbReel() {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) { console.log("FB no configurado, salto."); return; }
  try {
    const start = await api(`${FB_PAGE_ID}/video_reels`, { upload_phase: "start" }, FB_PAGE_TOKEN);
    const up = await fetch(`https://rupload.facebook.com/video-upload/${V}/${start.video_id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${FB_PAGE_TOKEN}`, file_url: videoUrl },
    });
    const upj = await up.json();
    if (!upj.success) throw new Error("rupload: " + JSON.stringify(upj));
    // esperar a que el video procese antes de finish
    await new Promise(r => setTimeout(r, 15000));
    await api(`${FB_PAGE_ID}/video_reels`, {
      upload_phase: "finish", video_id: start.video_id,
      video_state: "PUBLISHED", description: caption,
    }, FB_PAGE_TOKEN);
    console.log("FB Reel publicado. video id:", start.video_id);
  } catch (e) {
    console.error("FB Reel falló (" + e.message + "). Fallback a video de página...");
    const post = await api(`${FB_PAGE_ID}/videos`, { file_url: videoUrl, description: caption }, FB_PAGE_TOKEN);
    console.log("FB video publicado. id:", post.id);
  }
}

// ── Instagram: contenedor REELS -> poll -> publish
async function publishIgReel() {
  if (fbOnly) return;
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) { console.log("IG no configurado, salto."); return; }
  const c = await api(`${IG_USER_ID}/media`, {
    media_type: "REELS", video_url: videoUrl, caption, share_to_feed: "true",
  }, IG_ACCESS_TOKEN);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const st = await api(`${c.id}`, { fields: "status_code" }, IG_ACCESS_TOKEN, "GET");
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR") throw new Error("IG contenedor en ERROR");
  }
  const pub = await api(`${IG_USER_ID}/media_publish`, { creation_id: c.id }, IG_ACCESS_TOKEN);
  console.log("IG Reel publicado. media id:", pub.id);
}

await publishFbReel();
await publishIgReel();
console.log("Listo.");
