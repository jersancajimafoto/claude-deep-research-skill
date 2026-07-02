# Resumen Ejecutivo — Sistema CRM Kunda Leads (`prospeccion-ia`)

**Última actualización:** 2026-06-30
**Estado:** ✅ Completo, probado en vivo. Branch `feat/crm-ingesta-pipeline` · PR #11 (9 commits).

> Sistema de prospección, calificación, carga, seguimiento y medición de leads, operado por línea de comandos y respaldado en Airtable. `prospeccion-ia` es trabajo de agencia (Kunda), **no** el núcleo Python de la skill `deep-research`.

---

## 1. Veredicto

El ciclo completo de leads está operativo de punta a punta: **conseguir → calificar → cargar → recontactar → medir**. Cinco servicios modulares + cinco comandos. Todo verificado con datos reales en Airtable. Lo único fuera de alcance es la ejecución autónoma programada (cron), que quedó como opción no solicitada.

| Capacidad | Estado |
|---|---|
| Prospección (Google Places) → CRM | ✅ `npm run prospectar` |
| Prospección Firecrawl/scrapers (con email) → CRM | ✅ `--from <json>` |
| Carga de lista CSV/XLSX → CRM | ✅ `npm run procesar` |
| Scoring genérico (1–100 + categoría) | ✅ `scoringService` |
| Seguimiento (toques, estado, próximo contacto, recordatorios) | ✅ `npm run seguir` |
| Métricas de conversión (embudo, tasas) | ✅ `npm run metricas` |
| Re-scoring tras ediciones manuales | ✅ `npm run rescore` |
| Tablero visual | ✅ Airtable Interfaces, publicado |
| Ejecución autónoma (cron) | ⏳ No solicitada |

---

## 2. Arquitectura — servicios (`services/`)

| Servicio | Función | Deps |
|---|---|---|
| `ingesta/` | CSV (`csv-parser`) + XLSX (SheetJS) → normaliza nombre/teléfono(E.164)/correo → payload Airtable. Subida segura con `multer` 2.x | externas, fijadas con integrity |
| `scoring/scoringService.js` | Función pura: lead → `{ score 1–100, categoría, desglose }`. Reglas transparentes (+20 correo, +30 WhatsApp E.164, +25 empresa, +15 nombre, +3–10 origen) | zero-dep |
| `airtable/airtableService.js` | `fetch` nativo: crear/actualizar en lotes ≤10 (tolerante a fallos) + listar/obtener. Credenciales solo por env | zero-dep |
| `seguimiento/seguimientoService.js` | Estado del lead, backoff de reintentos [1,2,4,7] días, próximo contacto, recordatorios del día | zero-dep |
| `metricas/metricasService.js` | Embudo, tasa de contacto/conversión, conversión por categoría/origen, score promedio | zero-dep |

## 3. Comandos (`bin/`)

```bash
npm run prospectar -- --rubro "estudios contables" --ciudad "Trujillo"   # Places → CRM
npm run prospectar -- --from leads-firecrawl.json --origen firecrawl      # Firecrawl (con email) → CRM
npm run procesar   -- lista.csv --origen csv                              # lista existente → CRM
npm run seguir     -- --recordatorios                                     # a quién contactar hoy
npm run seguir     -- --toque recXXX --canal whatsapp --resultado contactado
npm run metricas   -- --periodo "Junio 2026"                             # snapshot de conversión
npm run rescore                                                           # recalcular scores
```
Todos aceptan `--dry` donde aplica.

## 4. Airtable — base `CRM Kunda Leads — Pipeline` (`app9XFFqPvRTFemz2`)

| Recurso | ID |
|---|---|
| Tabla Leads | `tbl46vQOqEcuUN1Dd` |
| Tabla Toques de seguimiento (enlazada a Leads) | `tblZwgAMWohE3MSVu` |
| Tabla Métricas | `tblmcH48p8Gxbqi39` |
| Tablero "Embudo y Conversión" (publicado) | `pbdBGJ2DAs4Kwyndm` / `pagVWhTfjUMJi0xyb` |

Campos alineados 1:1 con los payloads de los servicios. **Datos en vivo:** 3 leads cargados, 1 toque registrado, 1 snapshot de métricas.

## 5. Calidad y seguridad

- **74 pruebas** (`node:test`), 0 fallos. **0 vulnerabilidades** (`npm audit`).
- SheetJS oficial parchado, **vendorizado** (`vendor/xlsx-0.20.3.tgz`, `file:` con integrity) → reproducible offline con `npm ci`.
- **Credenciales solo por entorno** (`AIRTABLE_API_KEY`, `GOOGLE_PLACES_API_KEY`); nunca hardcodeadas ni impresas. `.env` git-ignored.
- **Sin PII en código**; `ingestaService` descarta filas inválidas sin exponer datos; `salida/*.json` (con leads) permanece local.
- WhatsApp con humano en el bucle (enlaces `wa.me`, sin envío automático).

## 6. Pendiente (opcional, no solicitado)

- **Ejecución autónoma (cron):** que `prospectar`/`seguir` corran solos en un horario sin intervención. Hoy todo es a pedido.
- **Merge del PR #11** a `main` del fork (decisión del usuario).
