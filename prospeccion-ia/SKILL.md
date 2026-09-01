---
name: prospeccion-ia
description: >-
  Afluencia — Prospección + CRM de leads con IA sobre Airtable ("Clientes que llegan solos").
  Prospecta empresas de un nicho + ciudad, normaliza y deduplica, puntúa con rúbrica fija (1-100),
  carga al CRM, opera el seguimiento (toques, próximo contacto, recordatorios) y mide conversión.
  Doble uso: pipeline propio de Kunda (se encadena con auditoria-kunda como gancho) y servicio
  premium gestionado para clientes. Usa esta skill SIEMPRE que el usuario diga "Afluencia",
  "prospectar", "buscar clientes potenciales", "llenar el CRM", "generar leads", "campaña de
  prospección", "leads cualificados", "contactar empresas en frío", "captar clientes B2B", o
  pase un nicho + ciudad pidiendo encontrar empresas para venderles algo. NO uses esta skill para
  auditar una web concreta (eso es auditoria-kunda), ni para contenido de redes/blog, ni para B2C.
---

# Afluencia — Prospección + CRM de leads

**Objetivo de marca:** *Clientes que llegan solos.* · Agencia **Kunda** · Creador **Jers Ancajima**.
(Nombre anterior, aún presente en assets viejos: "Kunda Leads".)

Convierte un nicho + ciudad en un CRM Airtable lleno de leads B2B cualificados, listos para
contactar, y opera el recontacto hasta el cierre. Idempotente y reanudable: cada etapa lee/escribe
estado en Airtable, no en la conversación.

Lee `references/` antes de operar: esquema de datos, rúbrica de scoring y reglas de compliance
(no negociables para el outreach).

## Requisitos previos

- **Airtable** — por MCP (`mcp__*airtable*`) o por código (`AIRTABLE_API_KEY` en `.env`).
  Base del pipeline: `app9XFFqPvRTFemz2` (ver `RESUMEN-EJECUTIVO-CRM.md`).
- **Google Places API** (`GOOGLE_PLACES_API_KEY`) — prospección de negocios locales.
- **firecrawl MCP** — fuente alternativa (directorios, listados; sí trae email).
- **Node 18+** para los servicios y CLIs. Deps fijadas (`npm ci`), SheetJS vendorizado.

## Dos formas de operar

### A) Por comandos (recomendado — rápido y repetible)

```bash
npm run prospectar -- --rubro "<nicho>" --ciudad "<ciudad>"   # Places → normaliza → scoring → Airtable
npm run prospectar -- --from leads.json --origen firecrawl     # scraper externo (con email) → CRM
npm run procesar   -- lista.csv --origen csv                   # lista CSV/XLSX existente → CRM
npm run seguir     -- --recordatorios                          # a quién contactar hoy
npm run seguir     -- --toque <recId> --canal whatsapp --resultado contactado
npm run metricas   -- --periodo "Julio 2026"                   # snapshot de conversión
npm run rescore                                                # recalcular scores tras ediciones
```
Todos aceptan `--dry` donde aplica (no escribe en Airtable). `npm test` → suite completa.

### B) Servicios (`services/`) — para integrar en otra app

| Servicio | Función |
|---|---|
| `ingesta/` | CSV + XLSX → normaliza nombre/teléfono(E.164)/correo → payload Airtable (multer para subida) |
| `scoring/scoringService.js` | Función pura: lead → `{ score 1-100, categoría, desglose }` |
| `airtable/airtableService.js` | crear/actualizar en lotes ≤10 + listar/obtener; credenciales solo por env |
| `seguimiento/seguimientoService.js` | Estado del lead, backoff [1,2,4,7] días, próximo contacto, recordatorios |
| `metricas/metricasService.js` | Embudo, tasa de contacto/conversión, conversión por dimensión |

Scripts previos en `scripts/` (Places, dedup, scoring 2-modos, mensajes WhatsApp, ventana de envío).

## Flujo: de nicho a CRM cualificado

### 1. Definir el ICP (campaña)
Anclar SIEMPRE: decisor + sector + ciudad + tamaño + señales de dolor + descalificadores. Si el
usuario da un "nicho" que es un decisor ("dueños", "gerentes") sin sector/ciudad, pídeselos antes
de seguir — sin foco el sistema no rinde (Error #1).

### 2. Prospectar
Google Places (negocios locales con ficha) o firecrawl (directorios; sí trae email). **No inventes
datos** — campo vacío es mejor que dato falso.

### 3. Normalizar + deduplicar
Clave anti-dup: `place_id` (Places) o dominio normalizado. Teléfonos a **E.164**; se descartan
fijos y enlaces `wa.link` cuando se exige celular directo.

### 4. Cualificar (scoring) — elige el MODO según a quién vende el cliente
- `--modo dolor` (default): el cliente vende **servicios a negocios**. Sin web = buen lead.
  Rutea oferta (Auditoría Web / Automatización IA). Ej: contadores Piura.
- `--modo capital`: el cliente vende **a personas con capital**. Trayectoria + formalidad = buen
  lead; filtra celular directo, marca Directo/Recepción. Ej: profesionales para Oro Azul.
- `scoringService` (genérico): +20 correo · +30 WhatsApp E.164 · +25 empresa · +15 nombre ·
  +3-10 origen → categoría Alta ≥70 / Media ≥40 / Baja.

El score debe ser **explicable**, no opinión: siempre devuelve el desglose.

### 5. Outreach (con compliance)
⚠️ Lee `references/compliance.md` PRIMERO. Reglas duras: opt-out, identificación real, solo B2B
relevante, warm-up 20/día → máx 30-50/día, solo prioridad alta/media. Envío **1-clic humano** por
`wa.me` (nunca automatizado masivo). `valida-ventana.js` chequea día/hora.

### 5b. Pre-calificación y citas (nivel "Citas Calificadas")
Marco **DDP** (Dinero, Decisión, Problema) — `references/calificacion-citas.md`. Campos `calificacion`
y `cita` en Airtable. Eleva la oferta de "entregar leads" a "entregar citas calificadas".

### 6. Seguimiento
`npm run seguir --recordatorios` lista los leads activos con próximo contacto vencido. Cada toque
avanza el estado (Nuevo → Contactado → En seguimiento → Ganado/Perdido) y recalcula la fecha con
backoff [1,2,4,7] días; tras agotarlo → Perdido.

### 7. Métricas
`npm run metricas` calcula embudo, tasa de contacto, conversión global/efectiva y score promedio,
y guarda un snapshot en la tabla Métricas. Tablero en Airtable Interfaces.

## Estado de construcción

- [x] F1 Cimientos · [x] F2 Prospección+dedup · [x] F3 Scoring (2 modos + genérico)
- [x] F4 Outreach WhatsApp + compliance + ventana de envío
- [x] **F5 Seguimiento + métricas** (`seguimientoService`, `metricasService`, CLIs `seguir`/`metricas`, tablero)
- [x] F6 Producto: servicio empaquetado + onboarding <1h
- [x] Puente prospección→CRM en un comando (`bin/prospectar.js`, Places y Firecrawl)
- [x] Intake de interesados (n8n → tabla `Interesados`)
- [ ] Ejecución autónoma programada (cron) — opcional, ver ROADMAP

74 pruebas (`node:test`), 0 vulnerabilidades.

## Material comercial (para vender el servicio)

| Doc | Uso |
|---|---|
| `assets/catalogo-afluencia.pdf` | **Catálogo comercial 13 págs para el cliente** (el entregable de venta) |
| `GUION-VENTA-AFLUENCIA.md` | Script del comercial: apertura, descubrimiento, demo, objeciones, cierre |
| `PITCH-DENTAL-AFLUENCIA.md` | Pitch por vertical (dental = convenios corporativos, no pacientes B2C) |
| `ROADMAP-PRODUCTO-AFLUENCIA.md` | Niveles 1→3 (servicio → app interna → SaaS) con puertas de validación |
| `RESUMEN-EJECUTIVO-CRM.md` | Estado técnico del sistema, IDs de Airtable |
| `assets/manual-kunda-leads.pdf` | Manual de operación/capacitación (nombre viejo, pendiente renombrar) |

⚠️ **Regla de encaje:** Afluencia encuentra **negocios (B2B)**, no consumidores. Si el cliente solo
quiere clientes B2C individuales, Afluencia NO es su producto → derivar a publicidad/contenido.

Arquitectura completa y decisiones: `ARQUITECTURA.md`.
