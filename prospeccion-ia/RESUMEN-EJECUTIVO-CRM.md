# Resumen Ejecutivo — Diagnóstico del Sistema CRM `prospeccion-ia`

**Fecha diagnóstico inicial:** 2026-06-27
**Última actualización:** 2026-06-27 — se construyeron tres servicios nuevos (`ingestaService`, `scoringService`, `airtableService`).
**Alcance:** estado del sistema para el caso de uso de gestión y recontacto de leads en Airtable.
**Naturaleza:** factual. Lo que no existe en el código se marca como **No existe**.

> **Nota:** el diagnóstico original fue read-only. Esta versión incorpora los servicios añadidos después; las filas afectadas pasaron de ❌/⚠️ a ✅.

---

## 1. Veredicto general

El sistema combina un **motor de prospección Google Places** con una **cadena de servicios modulares nueva** (ingesta CSV/XLSX → scoring genérico → inserción en Airtable), más salida a WhatsApp por enlaces `wa.me`. La conexión a Airtable **ya existe a nivel de código** (`airtableService`), además de la vía MCP del asistente. Quedan pendientes el seguimiento (fechas de recontacto, toques) y las métricas de conversión.

| Bloque | Estado |
|---|---|
| Prospección (Google Places) | ✅ Funcional |
| Scoring / clasificación | ✅ Genérico para cualquier lead (`scoringService`) + el motor Places previo |
| Salida WhatsApp | ✅ Genera enlaces `wa.me` (envío manual, 1 clic) |
| Conexión Airtable | ✅ Código (`airtableService`, lotes ≤10, tolerante a fallos) + vía MCP |
| Ingesta Excel/CSV | ✅ `ingestaService` (CSV + XLSX → normalización → payload Airtable) |
| Seguimiento (toques, fechas, recordatorios) | ✅ `seguimientoService` (estado, backoff, próximo contacto, recordatorios) |
| Métricas de conversión | ✅ `metricasService` (embudo, tasas, conversión por dimensión) |

---

## 2. Componentes encontrados

### 2.1 Airtable
- **Vía código (nuevo):** `services/airtable/airtableService.js` inserta en `api.airtable.com` con `fetch` nativo, en lotes ≤10, tolerante a fallos. Autenticación por **env** (`AIRTABLE_API_KEY`), nunca hardcodeada.
- **Vía MCP del asistente:** sigue disponible (`create_base`, `create_table`, `create_field`, `create_records_for_table`, `update_records_for_table`, `create_interface`, `create_page`, `publish_interface`).
- **Variables de entorno (solo nombres):** `GOOGLE_PLACES_API_KEY`, `AIRTABLE_BASE_ID` y, nuevas en `.env.example`, `AIRTABLE_API_KEY` y `AIRTABLE_TABLA`. Los valores viven en `.env` (git-ignored).
- **Bases ya operativas vía MCP:** "CRM Prospección IA — Piura" y "Oro Azul — Inversionistas" (tabla Leads cargada), más la interfaz "CRM Kunda Leads".

> Implicación: la carga puede automatizarse desde código reutilizable (`airtableService`) o seguir operándose por MCP. El dedup y los permisos siguen fuera del servicio.

### 2.2 WhatsApp
- `scripts/genera-mensajes.js` — genera mensajes personalizados y enlaces `https://wa.me/<cel>?text=...` a un archivo `.md`.
- **Envío:** manual, 1 clic humano. **No hay** automatización de envío.
- **No hay** fechas de próximo contacto ni registro de toques de seguimiento.
- Validación de ventana de envío disponible en `scripts/valida-ventana.js`.

### 2.3 Scripts (Node.js, sin dependencias externas)
| Script | Función |
|---|---|
| `scripts/prospecta-places.js` | Google Places Text Search → JSON (no escribe en Airtable) |
| `scripts/score-lead.js` | Scoring determinista, dos modos: `--modo dolor` y `--modo capital` |
| `scripts/genera-mensajes.js` | Mensajes + enlaces `wa.me` |
| `scripts/valida-ventana.js` | Validador de ventana de envío |
| `scripts/normaliza-dominio.js` | Normalización de dominio |
| `scripts/apify-places.js` | Fuente alternativa (Apify) |
| `*.test.js` | Pruebas con `node:test` |

- **Scoring (motor Places previo):** determinista, opera sobre objetos con forma de Places (`empresa`, `dominio`, `telefono`, etc.). Sigue para el flujo de prospección.
- **`scripts/` previos:** sin dependencias externas, solo módulos nativos + locales.

### 2.4 Servicios nuevos (`services/`)
Cadena modular, probada con `node:test`. Total suite del proyecto: **51 pruebas, 0 fallos**.

| Servicio | Archivo | Función | Deps |
|---|---|---|---|
| Ingesta | `services/ingesta/` | CSV (`csv-parser`) + XLSX (SheetJS vendorizado) → normaliza nombre/teléfono/correo → payload Airtable. Subida segura con `multer` 2.x | externas, fijadas con integrity |
| Scoring | `services/scoring/scoringService.js` | Función pura: lead → `{ score 1–100, categoría, desglose }`. Reglas transparentes | zero-dep |
| Airtable | `services/airtable/airtableService.js` | Une lead limpio + scoring → `fields{}` → inserta en lotes ≤10, tolerante a fallos | zero-dep (`fetch` nativo) |
| Seguimiento | `services/seguimiento/seguimientoService.js` | Estado del lead, toques, backoff de reintentos, fecha de próximo contacto, recordatorios del día | zero-dep |
| Métricas | `services/metricas/metricasService.js` | Embudo, tasa de contacto/conversión, conversión por categoría/origen, score promedio | zero-dep |

- **Dependencias del proyecto:** ahora hay `package.json` + `package-lock.json`. `xlsx` vendorizado en `vendor/xlsx-0.20.3.tgz` (SheetJS oficial parchado, `file:` con integrity) → `npm audit` = **0 vulnerabilidades**, reproducibilidad offline.

---

## 3. Qué falta para el nuevo caso de uso

1. ~~**Ingesta Excel/CSV → Airtable.**~~ ✅ **Hecho** — `ingestaService` (CSV + XLSX, normalización, payload).
2. ~~**Scoring genérico por lead.**~~ ✅ **Hecho** — `scoringService` (rúbrica configurable, no atada a Places).
3. ~~**Conexión Airtable a nivel de código.**~~ ✅ **Hecho** — `airtableService` (lotes ≤10, tolerante a fallos, credenciales por env).
4. ~~**Seguimiento (Toques de seguimiento).**~~ ✅ **Hecho** — `seguimientoService` (estado, backoff, próximo contacto, recordatorios).
5. ~~**Métricas de conversión.**~~ ✅ **Hecho** — `metricasService` (embudo, tasas, conversión por dimensión).

> Todas las piezas de software del caso de uso están construidas. Lo pendiente es **operativo/infra**: crear las tablas reales en Airtable (Leads / Toques / Métricas) y cablear un orquestador end-to-end.

---

## 4. Reglas de seguridad validadas

- **Sin valores de credenciales en entregables.** Se mencionan solo **nombres** de variables (`GOOGLE_PLACES_API_KEY`, `AIRTABLE_BASE_ID`); nunca su valor. El `.env` está git-ignored.
- **Sin PII de leads en documentos que circulan.** Nombres, teléfonos y correos no se incluyen en PDFs/reportes; los contactos crudos viven solo en Airtable con permisos. Regla reconfirmada en la decisión previa del manual (se ofreció anexo agregado, no lista cruda).
- **WhatsApp con humano en el bucle.** Envío de 1 clic, sin automatización → reduce riesgo de spam y deja control al operador.
- **Credenciales solo por entorno (nuevo).** `airtableService` lee `AIRTABLE_API_KEY` de env; nunca se hardcodea ni se loguea. Las pruebas usan credenciales ficticias y `fetch` inyectado (sin red ni secretos reales).
- **PII fuera de los rechazos.** `ingestaService` descarta filas inválidas devolviendo solo el conteo de errores, sin nombre/teléfono/correo.

---

## 5. Recomendación de próximos pasos

| Prioridad | Acción | Estado |
|---|---|---|
| Alta | Ingesta Excel/CSV → Airtable con mapeo de columnas | ✅ Hecho (`ingestaService`) |
| Alta | Rúbrica de scoring genérica | ✅ Hecho (`scoringService`) |
| Alta | Integración Airtable a nivel de código | ✅ Hecho (`airtableService`) |
| Alta | Lógica de seguimiento (toques, próximo contacto, recordatorios) | ✅ Hecho (`seguimientoService`) |
| Alta | Métricas de conversión | ✅ Hecho (`metricasService`) |
| Media | Crear tablas reales en Airtable (Leads / Toques / Métricas) vía MCP | ✅ Hecho — base `app9XFFqPvRTFemz2` |
| Media | Orquestador end-to-end: archivo → ingesta → scoring → Airtable | ✅ Hecho (`bin/procesar.js`), probado en vivo |
| Media | CLI de seguimiento: recordatorios + registrar toques | ✅ Hecho (`bin/seguir.js`), probado en vivo |
| Baja | Vista/tablero de conversión en Airtable Interfaces | ✅ Hecho — `pbdBGJ2DAs4Kwyndm`, publicado |
| — | Cargar `AIRTABLE_API_KEY` real (PAT) | ✅ Hecho — inserción y seguimiento operando en vivo |

### Airtable — base del pipeline
- **Base:** `CRM Kunda Leads — Pipeline` (`app9XFFqPvRTFemz2`).
- **Tablas:** `Leads` (`tbl46vQOqEcuUN1Dd`), `Toques de seguimiento` (`tblZwgAMWohE3MSVu`, enlazada a Leads), `Métricas` (`tblmcH48p8Gxbqi39`).
- Campos alineados 1:1 con los payloads de los servicios. `.env.example` ya apunta `AIRTABLE_BASE_ID` a esta base.
- **Tablero (Interfaces):** `Tablero CRM Kunda Leads` (`pbdBGJ2DAs4Kwyndm`), página "Embudo y Conversión" publicada. Elementos: total de leads, score promedio, donut por estado (embudo), donut por categoría, barras por origen, score promedio por categoría; filtros por estado/categoría/origen.
