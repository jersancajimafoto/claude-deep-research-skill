# Spec: Bóveda de comunidad — Jers Ancajima

**Fecha:** 2026-07-02
**Estado:** Aprobado por el usuario (diseño conversacional)
**Referencia:** https://www.tododeia.com/community (análisis Firecrawl 2026-07-02)
**Sub-proyecto de:** la web `tienda-jers/` (misma app Next.js, mismo stack y paleta).

## Objetivo

Una **Bóveda**: biblioteca navegable de recursos de IA/marketing/automatización bajo la
marca personal **Jers Ancajima**, dentro de la web `tienda-jers/`. Es el **destino** del
embudo de Instagram que ya existe en `ig-content-system/`: alguien comenta una palabra
clave en un carrusel de `@JJers | IA + Automatización`, recibe un DM (semi-automático,
vía `comments-watch.mjs`) con un link, y ese link ahora apunta a la Bóveda en vez de a un
PDF suelto en catbox/Drive.

Modelo de acceso aprobado: **híbrido**. Navegar la Bóveda es libre (cumple la promesa del
DM, cero rebote); **descargar/abrir un recurso pide email** (captura el lead en el momento
de máxima intención y construye la lista propia — cierra el hueco documentado de "no
captura email, depende de Meta").

## Alcance

**Incluye:**
- Página listado `/comunidad` (Bóveda): grid filtrable por tipo y nivel, con contador.
- Página detalle `/comunidad/[slug]` por recurso.
- Muro de email para desbloquear el recurso descargable (revelado inline tras dejar correo).
- Endpoint `/api/lead` que valida el email y lo guarda en Airtable (lista propia), y
  devuelve el enlace del recurso.
- Contenido inicial: los recursos de las 6 keywords activas del embudo
  (MARKETING, IA, AUTOMATIZAR, APPS, EMBUDO, SISTEMA).
- Conexión final: actualizar `ig-content-system/content/lead-magnet.json` para que cada
  `resource_link` apunte a la URL de la Bóveda correspondiente.

**No incluye (YAGNI):**
- Login/cuentas de usuario, contraseñas.
- Envío de email automático (welcome/entrega por correo) — el recurso se revela en pantalla
  al instante; el correo solo se captura. (Puede agregarse después.)
- Buscador de texto libre, comentarios, favoritos.
- Migrar los PDFs existentes a otro hosting — se referencian donde ya viven.

## Stack

- Se suma a `tienda-jers/` (Next.js App Router + Tailwind v4 ya configurados). Misma paleta
  (fondo #FAF8F3, tinta #10312C, primario #1E8A7B, acento #E8714C), mismas fuentes
  (Fraunces + Inter).
- Lead store: **Airtable** vía API REST con `fetch` nativo (el usuario ya usa Airtable para
  el CRM Afluencia). Sin dependencias nuevas de npm.
- Secretos (Airtable API key, base/table id) en `.env.local` (gitignored) + `.env.example`.

## Estructura (añadidos a tienda-jers/)

```
tienda-jers/
├── app/
│   ├── comunidad/
│   │   ├── page.tsx                 → Bóveda (grid filtrable)
│   │   └── [slug]/page.tsx          → detalle de recurso + muro de email
│   └── api/lead/route.ts            → valida email, guarda en Airtable, devuelve enlace
├── content/recursos/*.json          → 1 archivo por recurso
├── components/
│   ├── RecursoCard.tsx              → card de recurso en la Bóveda
│   ├── FiltrosBoveda.tsx            → filtros tipo + nivel (client component)
│   └── EmailGate.tsx                → formulario de email + revelado del recurso (client)
└── lib/recursos.ts                  → carga y valida los JSON de content/recursos/
```

## Modelo de recurso (JSON)

Un archivo por recurso en `content/recursos/`. Agregar recurso = crear JSON.

```json
{
  "slug": "checklist-marketing-que-vende",
  "tipo": "guia",
  "nivel": "principiante",
  "titulo": "El checklist de marketing que vende",
  "descripcion": "Los puntos que sí mueven la aguja en marketing para tu negocio.",
  "tags": ["marketing", "checklist"],
  "keyword": "MARKETING",
  "fecha": "Julio 2026",
  "recurso": {
    "tipo": "pdf",
    "url": "https://files.catbox.moe/jrfgat.pdf",
    "requiereEmail": true
  },
  "enlaceExterno": ""
}
```

- `tipo`: `guia` | `repo` | `proyecto` (filtro de la Bóveda, igual que tododeia).
- `nivel`: `principiante` | `intermedio` | `avanzado`.
- `keyword`: la palabra del embudo IG que dirige a este recurso (liga con `lead-magnet.json`).
- `recurso.requiereEmail`: si es `true`, el enlace se revela solo tras dejar correo (muro).
  Si es `false` o `enlaceExterno` está lleno (p. ej. un repo de GitHub), es abierto.
- Los PDFs se referencian donde ya viven (catbox), no se re-suben.

## Interfaz de la Bóveda `/comunidad`

- Encabezado: "Bóveda" + subtítulo (recursos nuevos cada semana).
- Barra de filtros (como tododeia): tipo (Todo / Guías / Repos / Proyectos) y nivel (Todos /
  Principiante / Intermedio / Avanzado). Contador de elementos ("N recursos").
- Grid de `RecursoCard`: badge de tipo, badge de nivel, título, descripción, tags.
- Filtrado en cliente (los recursos se cargan en el server y se filtran sin recargar).

## Interfaz de detalle `/comunidad/[slug]`

- ← Volver a la Bóveda.
- Título, badges (tipo, nivel), descripción, tags, fecha.
- Zona de recurso:
  - Si `requiereEmail`: `<EmailGate>` — un campo de correo + botón "Desbloquear". Al enviar,
    POST a `/api/lead`; si OK, revela el enlace/botón de descarga inline y muestra "listo".
  - Si abierto (repo/enlaceExterno): botón directo al enlace.
- Slug inexistente → `notFound()` (404).

## Flujo de captura de email

```
Recurso con muro → usuario deja correo → POST /api/lead { email, slug }
→ valida formato de email → guarda { email, slug, keyword, fecha } en Airtable
→ 200 { url } → EmailGate revela el enlace del recurso en pantalla
```

Sin envío de correo en MVP: el recurso se revela al instante (gratificación inmediata que
prometió el DM). El correo queda en la lista de Airtable para nurture/venta posterior.

## Conexión con el embudo de Instagram (ya existente)

`ig-content-system/` ya hace: carrusel con CTA "comenta PALABRA" → `comments-watch.mjs`
detecta el comentario → arma el DM con `resource_link`. Hoy ese link es un PDF. Cambio:
en `content/lead-magnet.json`, cada `resource_link` pasa a apuntar a
`https://<sitio>/comunidad/<slug>` del recurso equivalente. Mapa de keywords → recurso:

| keyword | recurso Bóveda |
|---|---|
| MARKETING | checklist de marketing que vende |
| IA | guía de 10 cosas para pedirle a la IA |
| AUTOMATIZAR | guía para automatizar respuestas |
| APPS | ideas de apps con IA |
| EMBUDO | checklist del embudo de contenido |
| SISTEMA | (venta — enlaza a la tienda / DM de venta) |

No se toca la lógica de detección de comentarios ni el envío del DM: solo cambia el destino
del enlace. La keyword `SISTEMA` sigue siendo de venta (puede enlazar a `/tienda`).

## Manejo de errores

- Slug inexistente → 404.
- `/api/lead` con email inválido → 400 con mensaje claro.
- `/api/lead` con slug inexistente o recurso sin `requiereEmail` → 400.
- Fallo de Airtable → 500 genérico; el front muestra "no se pudo, intenta de nuevo" y no
  revela el enlace (fail-closed: sin registro no hay recurso).

## Testing

- Fase 1–2: verificación visual local (`npm run dev`) + `npm run build` limpio; el filtrado
  cliente se prueba en el navegador.
- Fase 3: tests unitarios de `/api/lead` (email válido → 200 + payload correcto a Airtable
  mockeado; email inválido → 400; slug inexistente → 400; fallo Airtable → 500) y de
  `lib/recursos.ts` (carga, orden, contrato). Mismo patrón de mocks que `checkout.test.ts`.
- Fase 4: editar `lead-magnet.json`; smoke test del flujo comentario→DM→Bóveda en staging.

## Fases de implementación

1. **Bóveda navegable:** `/comunidad` + `/comunidad/[slug]`, filtros tipo/nivel, contenido de
   prueba, sin muro. Verificable en el navegador.
2. **Contenido real:** los 6 recursos de las keywords activas como JSON.
3. **Muro de email + captura:** `<EmailGate>`, `/api/lead` → Airtable, revelado inline, con
   tests.
4. **Conexión + deploy:** actualizar `lead-magnet.json` (resource_link → URLs Bóveda),
   deploy junto con la tienda, smoke test del embudo completo.
