# Roadmap de Producto — Afluencia

**Sistema:** Afluencia (Prospección + CRM de leads) · **Objetivo:** *"Clientes que llegan solos."*
**Agencia:** Kunda · **Creador:** Jerson Ancajima
**Fecha:** 2026-07-05

---

## Principio rector

**Vender el resultado antes que el producto.** No se construye SaaS sin mercado validado. Cada nivel se desbloquea con una **puerta** (señal de negocio real), no con una fecha ni con ganas. El objetivo de cada etapa es generar caja y aprendizaje que financien y definan la siguiente.

---

## Estado actual (base técnica ya construida)

Motor Node reutilizable + Airtable + n8n:
- Servicios: `ingesta`, `scoring`, `airtable`, `seguimiento`, `metricas` (74 pruebas, 0 vulns).
- CLIs: `prospectar`, `procesar`, `seguir`, `metricas`, `rescore`.
- Airtable: base pipeline (Leads / Toques / Métricas / Interesados) + tablero.
- n8n: intake de interesados (MVP-1) activo.

Esto es el **activo**: ~60–70% se reusa en los niveles 2 y 3 sin reescribir.

---

## Nivel 1 — Servicio gestionado (AHORA)

**Qué es:** tú operas el motor (CLI + Airtable), entregas leads calificados; vendes el resultado.
**Meta:** validar mercado y generar caja. Cero desarrollo nuevo obligatorio.

**Acciones:**
- Salir a vender con el catálogo (Afluencia) + formulario de intake.
- Operar cada cliente con los CLIs actuales.
- Cobrar los planes definidos (Inicial / Crecimiento / Élite).

**No hacer todavía:** app, migración de DB, multi-tenant, billing. Sería prematuro.

### 🚪 Puerta 1 → 2 (no pasar sin esto)
- **3–5 clientes pagando** (idealmente recurrente), y
- **≥1 caso con resultado real** (cierre atribuible + testimonio), y
- la **operación manual empieza a doler** (te consume horas que ya no escalan).

Si no se cumplen las tres → seguir en Nivel 1, ajustar oferta/precio, no construir.

---

## Nivel 2 — App web interna (para ti y tu equipo)

**Qué es:** una interfaz web sobre el mismo motor, para operar sin CLI. Uso interno, no clientes.
**Meta:** que la operación escale sin que dependa de la terminal ni de una sola persona.

**Qué se construye:**
- Frontend simple (Next.js) que dispara los servicios ya existentes vía API.
- Envolver los CLIs/servicios en una API HTTP (la ruta Express de `ingesta` ya es el punto de partida).
- Panel: correr prospección, ver leads, registrar toques, ver métricas — todo desde web.
- Backend de datos: puede seguir en Airtable en esta etapa (aún sirve para pocos clientes).

**Reuso:** scoring, ingesta, seguimiento, métricas → intactos. Solo se agrega capa web + API.

### 🚪 Puerta 2 → 3 (no pasar sin esto)
- **Demanda real de auto-servicio** (clientes que piden su propio acceso), y
- **volumen que Airtable ya no aguanta** (multi-cliente, muchos registros), y
- números que justifican meses de desarrollo (p. ej. **15–20 clientes** o pipeline claro de más).

---

## Nivel 3 — SaaS multi-cliente (producto)

**Qué es:** el cliente se registra, define su nicho, paga suscripción y recibe sus leads en su propio panel.
**Meta:** producto que escala sin tu operación manual. Es un activo vendible/invertible.

**Qué se construye (alto esfuerzo, meses):**
- Frontend completo: login, onboarding, dashboard por cliente.
- **Migración de Airtable a Postgres/Supabase** (multi-tenant real).
- Auth + roles + aislamiento de datos por cliente.
- Billing/suscripciones (Stripe).
- Colas + cron por cliente (prospección y seguimiento programados).
- WhatsApp API oficial + opt-in a escala (compliance Ley 29733).
- Modelo de precios que cubra el **costo de Google Places por cliente**.
- Infra, monitoreo, soporte.

**Reuso:** el motor (scoring, ingesta, seguimiento, métricas) pasa a ser el núcleo de la API. No se tira.

---

## Excepción (cuándo sí saltar antes al producto)

Construir el SaaS antes de facturar servicio **solo** tiene sentido si el objetivo es **levantar inversión o vender la empresa** — ahí el producto ES el activo. Para generar caja hoy: servicio primero.

---

## Mapa de reuso (qué sirve en cada nivel)

| Pieza | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Servicios (scoring/ingesta/seguimiento/métricas) | ✅ CLI | ✅ vía API | ✅ núcleo del backend |
| Airtable | ✅ backend | ✅ backend | ➡️ migra a Postgres |
| n8n | ✅ glue/automatización | ✅ colas/cron | ➡️ colas propias |
| Catálogo/oferta | ✅ venta | ✅ venta | ✅ marketing |

---

## Riesgos / decisiones abiertas

- **Costo de API (Google Places) por cliente** → el precio debe cubrirlo con margen; medir en Nivel 1.
- **Compliance WhatsApp a escala** → hoy es humano-en-el-bucle (bien); el SaaS exige API oficial + opt-in.
- **Exposición pública** → el intake y cualquier panel necesitan hosting siempre-activo (no localhost) desde el Nivel 2.
- **Foco** → cada nivel construido antes de su puerta es tiempo y plata en riesgo.

---

## Resumen en una línea

**Nivel 1 (vender servicio) → validar con clientes reales → Nivel 2 (app interna) → escalar → Nivel 3 (SaaS) solo si el mercado lo pide.** El código ya hecho es tu activo y se reusa en los tres.
