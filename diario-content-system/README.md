# Diario Content System

Pipeline automatizado de reels de frases para **El Diario de los casi** (Facebook + Instagram).
Instancia separada de `ig-content-system/` (Kunda) — misma arquitectura, otra cuenta, otra identidad.

```
content/<slug>.json  →  build-frase (PNG 1080x1920)  →  frase-reel (mp4 9s)  →  publish (FB Reel + IG Reel)
                                                 cola: content/queue.json + launchd cada 30 min
```

## Setup una sola vez

### 1. Dependencias
```bash
cd diario-content-system
npm install          # puppeteer-core
```
Requiere Chrome del sistema y ffmpeg (ya instalados en esta Mac).

### 2. Credenciales (los secretos NUNCA van al chat)
Usa la misma app de Meta que Kunda (developers.facebook.com → tu app Business).

1. Abre **Graph API Explorer** (developers.facebook.com/tools/explorer), selecciona tu app.
2. *Generate Access Token* con permisos: `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `business_management`.
   Al autorizar, marca la página **El Diario de los casi** y su IG.
3. Copia el token corto y corre EN TU TERMINAL:
   ```bash
   APP_ID=xxx APP_SECRET=xxx USER_TOKEN=xxx PAGE_NAME=diario node scripts/fb-token.mjs
   ```
   Escribe FB_PAGE_ID, FB_PAGE_TOKEN (no expira), IG_USER_ID e IG_ACCESS_TOKEN (~60 días) en `.env`.
4. Verifica:
   ```bash
   node scripts/publish.mjs check
   ```

### 3. Activar el scheduler (launchd, cada 30 min)
```bash
cat > ~/Library/LaunchAgents/com.diario.scheduler.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.diario.scheduler</string>
  <key>ProgramArguments</key><array>
    <string>/usr/local/bin/node</string>
    <string>SCRIPTS_DIR/scheduler.mjs</string>
  </array>
  <key>StartInterval</key><integer>1800</integer>
  <key>StandardOutPath</key><string>LOGS_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key><string>LOGS_DIR/launchd.err.log</string>
</dict></plist>
EOF
# reemplaza SCRIPTS_DIR/LOGS_DIR por las rutas absolutas reales y el node por `which node`
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.diario.scheduler.plist
```
Luego habilita la cola: `"enabled": true` en `content/queue.json`.

## Identidad visual (dirección "Diario")

Papel crema (#f3ecdd), tinta (#2b2320), acento terracota (#a85f5a), serif Playfair + firma
manuscrita Caveat, líneas de cuaderno. **Cada frase lleva su propia foto de fondo** relevante
al mensaje (campo `img_prompt` en el JSON), generada con OpenRouter/FLUX con tratamiento fijo
(cálido, desaturado, grano) para mantener identidad. El texto va sobre una tarjeta de papel
translúcida → siempre legible. Sin foto, cae al modo papel plano (mismo look sin imagen).

### Fondos por frase (una vez que OPENROUTER_API_KEY esté en .env)
```bash
node scripts/backgrounds.mjs            # genera el fondo de cada frase pendiente (idempotente)
node scripts/backgrounds.mjs --force sem1-d3   # regenera uno
node scripts/entregar.mjs --all         # rearma los mp4 con los nuevos fondos
```

## Uso diario

```bash
node scripts/build-frase.mjs sem1-d1        # JSON -> PNG (assets/sem1-d1/)
node scripts/frase-reel.mjs sem1-d1         # PNG -> sem1-d1-reel.mp4 (9s)
node scripts/publish.mjs reel sem1-d1       # DRY-RUN (sube y muestra URL, no publica)
node scripts/publish.mjs reel sem1-d1 --publish   # publica FB Reel + IG Reel
node scripts/scheduler.mjs --dry            # qué publicaría la cola
```

- **Cola:** `content/queue.json` — items `{slug, at, status}`, hora ISO -05:00 (Perú). 19:00 Perú = 18:00 México (horario objetivo del público, 45% MX).
- **Pausar todo:** `"enabled": false`.
- **Logs:** `logs/scheduler.log`.
- **Renovar token IG (~60 días):** repetir paso 2 (el de página no expira).

## Formato de content/<slug>.json
```json
{
  "kicker": "opcional (default: el diario de los casi)",
  "frase": "Texto de la frase.<br>Admite <em>cursiva dorada</em>.",
  "caption": "Caption con CTA y hashtags.\n#eldiariodeloscasi ..."
}
```

## Estrategia (resumen del diagnóstico 2026-07-06)
- Crecimiento viene de recomendaciones de página de FB, no del contenido; hay que activar 1.235 seguidores fríos.
- Reels de 7–15 s (0 reproducciones de 1 min en el histórico), texto grande, CTA de comentario fácil.
- Meta corto plazo: mantener ≥500 seguidores 30 días seguidos → Estrellas (~1 ago 2026).
