# Spec: Tienda digital marca personal Jers Ancajima

**Fecha:** 2026-07-02
**Estado:** Aprobado por el usuario (diseño conversacional)
**Referencia visual:** https://www.tododeia.com/tienda (análisis Firecrawl del 2026-07-01)

## Objetivo

Tienda de productos digitales (ebooks, packs de skills/templates) bajo la marca personal
**Jers Ancajima**, con branding derivado de Kunda (ambas marcas son del mismo dueño).
Patrón de referencia: tododeia.com/tienda — listado de cards + página de producto larga
+ checkout directo con Stripe, sin carrito.

## Alcance

**Incluye:**
- Página listado `/tienda` (grid de product cards).
- Página detalle `/tienda/[slug]` (landing larga por producto).
- Endpoint `/api/checkout` que crea una Stripe Checkout Session.
- 2 productos iniciales: guía marketing+IA (ebook) y pack de skills/templates de automatización.
- Deploy en Vercel; dominio propio se compra y conecta en la fase final.

**No incluye (YAGNI):**
- Carrito de compras, cuentas de usuario, base de datos.
- CMS — el contenido vive en JSON versionado en git.
- Blog, newsletter, home personal completa (puede agregarse después; `/` puede redirigir a `/tienda` por ahora).

## Stack

- **Next.js** (App Router) + **Tailwind CSS** + **Stripe** (Checkout Sessions).
- Deploy: **Vercel**. Dominio temporal `*.vercel.app`, luego dominio propio.
- Proyecto nuevo en carpeta propia del mono-repo: `tienda-jers/`. No toca el núcleo Python de la skill deep-research.

## Estructura

```
tienda-jers/
├── app/
│   ├── page.tsx                    → redirige a /tienda (por ahora)
│   ├── tienda/
│   │   ├── page.tsx                → listado (grid productos)
│   │   └── [slug]/page.tsx         → detalle producto
│   └── api/checkout/route.ts       → crea Stripe Checkout Session
├── content/productos/*.json        → 1 archivo por producto
├── components/
│   ├── ProductCard.tsx
│   ├── PriceTag.tsx
│   └── BuyButton.tsx
├── lib/
│   ├── stripe.ts                   → cliente Stripe (secret key vía env)
│   └── productos.ts                → carga y valida los JSON de content/
└── tailwind.config.ts              → tokens de la paleta Jers
```

## Modelo de producto (JSON)

Un archivo por producto en `content/productos/`. Agregar producto = crear JSON, cero código.

```json
{
  "slug": "guia-marketing-ia",
  "tipo": "Ebook",
  "titulo": "Marketing con IA de Cero a Cien",
  "subtitulo": "Guía práctica de marketing estratégico + automatización con IA",
  "descripcionCorta": "Para el card del listado",
  "descripcionLarga": "Párrafos del hook emocional",
  "autor": "Jers Ancajima",
  "version": "1.0",
  "fecha": "Julio 2026",
  "icono": "/images/store/guia-icon.png",
  "precio": { "usd": 29, "pen": 99 },
  "stripePriceId": "",
  "features": ["Descarga digital instantánea", "Pago seguro vía Stripe", "Pago único"],
  "queObtienes": ["bullet 1", "bullet 2"],
  "paraQuien": [{ "perfil": "Principiantes", "texto": "..." }],
  "contenido": [{ "seccion": "Fundamentos", "capitulos": ["1. ...", "2. ..."] }]
}
```

- `stripePriceId` vacío en fases 1–2; se llena en fase 3 con el ID generado en Stripe.
- Precio dual USD/PEN (patrón USD/MXN de tododeia). En Stripe: multi-currency Price o dos Prices.

## Flujo de compra

```
Click "Comprar" → POST /api/checkout { slug }
→ servidor resuelve stripePriceId desde el JSON
→ crea Stripe Checkout Session → redirect a Stripe
→ pago OK → redirect a /tienda/[slug]/gracias
→ entrega: email automático de Stripe con link/recibo (detalle fino en fase 3)
```

Sin carrito, sin login, sin DB. Cuenta Stripe existente (jersancajima@gmail.com), pendiente de configurar/verificar en fase 3.

## Anatomía de páginas (patrón tododeia)

**`/tienda`:** heading + subheading, grid de cards. Card: icono, badge tipo ("Ebook"),
título, descripción 1 línea, precio dual, botón "Comprar".

**`/tienda/[slug]`:** ← volver a tienda · icono + título + subtítulo + fecha + versión +
"por Jers Ancajima" · badge tipo · H1 + descripción larga (hook emocional) · pills de
features · sección "Qué obtienes" (bullets) · precio + botón comprar · social proof
(cuando haya ventas) · "Para quién es" (segmentos) · "Contenido completo" (índice).

## Diseño visual — paleta Jers (derivada de Kunda)

Base Kunda: verdes `#436159`/`#1E8A7B`/`#10312C`, crema `#F2EFE6`, naranja `#E8714C`.
Variación personal: misma familia, tono editorial de autor.

| Token | Valor | Uso |
|---|---|---|
| `fondo` | `#FAF8F3` | Fondo página (crema más claro que Kunda) |
| `tinta` | `#10312C` | Títulos y texto principal |
| `texto-suave` | `#5C6B66` | Párrafos, descripciones |
| `primario` | `#1E8A7B` | Links, badges, detalles |
| `acento` | `#E8714C` | Botón "Comprar" (pill, sombra naranja suave) |
| `card` | `#FFFFFF` | Cards, borde `#E3DBCB`, radio 8px |

Tipografía: serif editorial para títulos (Fraunces o Lora, Google Fonts) + Inter para
cuerpo. Diferencia deliberada del look tododeia (todo Arial); sensación "guía/libro".

## Fases de implementación

1. **Esqueleto:** Next.js + Tailwind, ambas rutas con contenido de prueba, sin pagos.
   Verificable: corre local, se ve en el navegador.
2. **Contenido real:** los 2 productos con copy real cargados desde JSON.
3. **Stripe test:** cuenta configurada, productos/prices creados, checkout funcional en
   modo test (tarjeta 4242...). Definir mecanismo exacto de entrega del PDF.
4. **Live:** compra de dominio, conexión a Vercel, Stripe en modo live, compra real de
   prueba.

Cada fase termina en algo visible y testeable antes de avanzar.

## Manejo de errores

- Slug inexistente → 404 de Next.js.
- `/api/checkout` con slug sin `stripePriceId` → 400 con mensaje claro (producto no disponible aún).
- Fallo de Stripe → mostrar error genérico y no romper la página.

## Testing

- Fases 1–2: verificación visual local (`npm run dev`) + build limpio (`npm run build`).
- Fase 3: flujo completo con tarjeta de prueba de Stripe.
- Fase 4: compra real de bajo monto como smoke test.
