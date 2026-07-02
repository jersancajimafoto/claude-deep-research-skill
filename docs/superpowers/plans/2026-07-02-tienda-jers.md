# Tienda Jers Ancajima — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tienda de productos digitales bajo la marca personal Jers Ancajima con listado, páginas de producto y checkout directo vía Stripe (patrón tododeia.com/tienda).

**Architecture:** Next.js App Router con contenido en JSON versionado (sin DB, sin carrito, sin login). Un route handler crea Stripe Checkout Sessions; la página de gracias verifica el pago y habilita la descarga del PDF. Tokens de diseño en Tailwind v4 (`@theme` en CSS).

**Tech Stack:** Next.js 15+ (App Router, TypeScript), Tailwind CSS v4, Stripe Node SDK, Vitest para tests unitarios.

**Spec:** `docs/superpowers/specs/2026-07-02-tienda-jers-design.md`

## Global Constraints

- Proyecto vive en `tienda-jers/` dentro del mono-repo; NO tocar `scripts/` ni `tests/` del núcleo Python.
- Paleta exacta: fondo `#FAF8F3`, tinta `#10312C`, texto-suave `#5C6B66`, primario `#1E8A7B`, acento `#E8714C`, borde card `#E3DBCB`, card `#FFFFFF`.
- Tipografía: Fraunces (títulos) + Inter (cuerpo), vía `next/font/google`.
- Copy de UI en español. Botón de compra: "Comprar".
- Precios duales: `usd: 29`, `pen: 99` por producto.
- Sin dependencias más allá de: next, react, react-dom, tailwindcss, stripe, vitest (dev).
- Secretos Stripe SOLO en `.env.local` (gitignored). Nunca commitear claves.
- Nota: el spec menciona `tailwind.config.ts`; `create-next-app` actual usa Tailwind v4 donde los tokens van en `app/globals.css` con `@theme`. Se sigue Tailwind v4.

---

### Task 1: Scaffold del proyecto Next.js

**Files:**
- Create: `tienda-jers/` (via create-next-app)
- Modify: `.gitignore` (raíz del mono-repo, solo si create-next-app no genera el suyo)

**Interfaces:**
- Produces: proyecto Next.js corriendo en `localhost:3000` con Tailwind v4 activo. Alias de imports `@/*` apuntando a la raíz de `tienda-jers/`.

- [ ] **Step 1: Generar el proyecto**

```bash
cd /Users/jersancajima/Documents/GitHub/claude-deep-research-skill
npx create-next-app@latest tienda-jers --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-eslint --turbopack
```

Expected: carpeta `tienda-jers/` con `app/`, `package.json`, `app/globals.css` conteniendo `@import "tailwindcss"`.

- [ ] **Step 2: Verificar que corre**

```bash
cd tienda-jers && npm run dev &
sleep 6 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`. Después matar el server (`kill %1`).

- [ ] **Step 3: Verificar build limpio**

```bash
cd tienda-jers && npm run build
```

Expected: build exitoso sin errores.

- [ ] **Step 4: Commit**

```bash
git add tienda-jers && git commit -m "feat(tienda): scaffold Next.js + Tailwind para tienda Jers Ancajima"
```

---

### Task 2: Tokens de diseño y tipografía

**Files:**
- Modify: `tienda-jers/app/globals.css`
- Modify: `tienda-jers/app/layout.tsx`

**Interfaces:**
- Produces: clases Tailwind `bg-fondo`, `text-tinta`, `text-suave`, `text-primario`, `bg-acento`, `border-borde`, `bg-card` y fuentes `font-titulo` / `font-cuerpo` disponibles en todo el proyecto.

- [ ] **Step 1: Reemplazar `app/globals.css` con los tokens**

```css
@import "tailwindcss";

@theme {
  --color-fondo: #faf8f3;
  --color-tinta: #10312c;
  --color-suave: #5c6b66;
  --color-primario: #1e8a7b;
  --color-acento: #e8714c;
  --color-borde: #e3dbcb;
  --color-card: #ffffff;
  --font-titulo: var(--font-fraunces);
  --font-cuerpo: var(--font-inter);
}

body {
  background-color: var(--color-fondo);
  color: var(--color-tinta);
  font-family: var(--font-cuerpo), sans-serif;
}
```

- [ ] **Step 2: Reemplazar `app/layout.tsx` con fuentes y metadata**

```tsx
import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tienda — Jers Ancajima",
  description:
    "Recursos digitales de marketing, IA y automatización creados por Jers Ancajima.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
cd tienda-jers && npm run build
```

Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add tienda-jers/app && git commit -m "feat(tienda): tokens de paleta Jers y tipografía Fraunces+Inter"
```

---

### Task 3: Modelo de producto y capa de carga (`lib/productos.ts`)

**Files:**
- Create: `tienda-jers/lib/productos.ts`
- Create: `tienda-jers/content/productos/guia-marketing-ia.json`
- Create: `tienda-jers/content/productos/pack-skills-automatizacion.json`
- Create: `tienda-jers/lib/productos.test.ts`
- Modify: `tienda-jers/package.json` (script `test`, devDependency vitest)

**Interfaces:**
- Produces:
  - `type Producto = { slug: string; tipo: string; titulo: string; subtitulo: string; descripcionCorta: string; descripcionLarga: string[]; autor: string; version: string; fecha: string; icono: string; precio: { usd: number; pen: number }; stripePriceId: string; features: string[]; queObtienes: string[]; paraQuien: { perfil: string; texto: string }[]; contenido: { seccion: string; capitulos: string[] }[] }`
  - `getProductos(): Producto[]` — todos los productos, orden alfabético por slug.
  - `getProducto(slug: string): Producto | undefined`

- [ ] **Step 1: Instalar vitest y agregar script**

```bash
cd tienda-jers && npm install -D vitest
```

En `tienda-jers/package.json`, dentro de `"scripts"`, agregar:

```json
"test": "vitest run"
```

- [ ] **Step 2: Crear los dos JSON de producto (contenido inicial editable)**

`tienda-jers/content/productos/guia-marketing-ia.json`:

```json
{
  "slug": "guia-marketing-ia",
  "tipo": "Ebook",
  "titulo": "Marketing con IA de Cero a Cien",
  "subtitulo": "Guía práctica de marketing estratégico + automatización con IA",
  "descripcionCorta": "La guía en español para integrar IA en tu estrategia de marketing: de los fundamentos a flujos automatizados completos.",
  "descripcionLarga": [
    "La IA cambió el marketing. Pero la mayoría de negocios apenas usa el 10% de lo que puede hacer.",
    "Esta guía te lleva del \"no sé por dónde empezar\" al \"acabo de automatizar mi prospección, contenido y reportes\". Paso a paso. Sin jerga. Con ejemplos reales de negocios en Latinoamérica.",
    "No importa si no sabes programar. Cada concepto está explicado con analogías simples y flujos que puedes copiar."
  ],
  "autor": "Jers Ancajima",
  "version": "1.0",
  "fecha": "Julio 2026",
  "icono": "/images/store/guia-icon.png",
  "precio": { "usd": 29, "pen": 99 },
  "stripePriceId": "",
  "features": [
    "Descarga digital instantánea",
    "Pago seguro vía Stripe",
    "Pago único — sin suscripción"
  ],
  "queObtienes": [
    "Guía completa en español con ejemplos prácticos",
    "Flujos de automatización listos para copiar",
    "Plantillas de prompts para marketing",
    "PDF listo para leer en cualquier dispositivo"
  ],
  "paraQuien": [
    {
      "perfil": "Emprendedores y PYMEs",
      "texto": "Quieres usar IA en tu negocio sin contratar una agencia. Empieza por los fundamentos."
    },
    {
      "perfil": "Marketers",
      "texto": "Ya haces marketing y quieres multiplicar tu output con automatización."
    },
    {
      "perfil": "Freelancers y agencias",
      "texto": "Quieres ofrecer servicios de IA a tus clientes con procesos probados."
    }
  ],
  "contenido": [
    {
      "seccion": "Fundamentos",
      "capitulos": [
        "1. Qué puede (y qué no puede) hacer la IA en marketing",
        "2. Las herramientas que importan en 2026",
        "3. Prompting para marketing"
      ]
    },
    {
      "seccion": "Estrategia",
      "capitulos": [
        "4. Investigación de mercado con IA",
        "5. Contenido y redes sociales automatizados",
        "6. Prospección y CRM inteligente"
      ]
    },
    {
      "seccion": "Automatización",
      "capitulos": [
        "7. Flujos completos end-to-end",
        "8. Medición y reportes automáticos",
        "9. Casos reales paso a paso"
      ]
    }
  ]
}
```

`tienda-jers/content/productos/pack-skills-automatizacion.json`:

```json
{
  "slug": "pack-skills-automatizacion",
  "tipo": "Pack de templates",
  "titulo": "Pack de Skills y Templates de Automatización",
  "subtitulo": "Skills, prompts y flujos listos para usar con Claude y herramientas de IA",
  "descripcionCorta": "Paquete de skills, plantillas y workflows probados: prospección, auditoría web, contenido y CRM — listos para copiar y adaptar.",
  "descripcionLarga": [
    "Cada skill de este pack nació de un proyecto real: prospección de leads, auditorías web, sistemas de contenido, CRM automatizado.",
    "No son ejemplos de juguete. Son los flujos que uso con clientes reales, documentados para que los adaptes a tu negocio en minutos.",
    "Incluye instrucciones de instalación y personalización para cada skill."
  ],
  "autor": "Jers Ancajima",
  "version": "1.0",
  "fecha": "Julio 2026",
  "icono": "/images/store/pack-icon.png",
  "precio": { "usd": 29, "pen": 99 },
  "stripePriceId": "",
  "features": [
    "Descarga digital instantánea",
    "Pago seguro vía Stripe",
    "Pago único — sin suscripción"
  ],
  "queObtienes": [
    "Skills listos para instalar en Claude Code",
    "Plantillas de prompts por caso de uso",
    "Workflows de prospección y auditoría documentados",
    "Guía de instalación y personalización"
  ],
  "paraQuien": [
    {
      "perfil": "Usuarios de Claude",
      "texto": "Ya usas Claude y quieres skills probados en vez de construir desde cero."
    },
    {
      "perfil": "Consultores y agencias",
      "texto": "Necesitas procesos replicables para entregar a clientes más rápido."
    }
  ],
  "contenido": [
    {
      "seccion": "Incluido en el pack",
      "capitulos": [
        "1. Skill de prospección de leads",
        "2. Skill de auditoría web",
        "3. Sistema de contenido para redes",
        "4. Plantillas de CRM y scoring",
        "5. Guía de instalación"
      ]
    }
  ]
}
```

- [ ] **Step 3: Escribir el test que falla**

`tienda-jers/lib/productos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getProducto, getProductos } from "./productos";

describe("getProductos", () => {
  it("devuelve los productos ordenados por slug", () => {
    const productos = getProductos();
    expect(productos.length).toBe(2);
    expect(productos.map((p) => p.slug)).toEqual([
      "guia-marketing-ia",
      "pack-skills-automatizacion",
    ]);
  });

  it("cada producto tiene los campos requeridos", () => {
    for (const p of getProductos()) {
      expect(p.titulo).toBeTruthy();
      expect(p.precio.usd).toBeGreaterThan(0);
      expect(p.precio.pen).toBeGreaterThan(0);
      expect(Array.isArray(p.queObtienes)).toBe(true);
    }
  });
});

describe("getProducto", () => {
  it("encuentra un producto por slug", () => {
    expect(getProducto("guia-marketing-ia")?.titulo).toBe(
      "Marketing con IA de Cero a Cien"
    );
  });

  it("devuelve undefined para slug inexistente", () => {
    expect(getProducto("no-existe")).toBeUndefined();
  });
});
```

- [ ] **Step 4: Correr el test — debe fallar**

```bash
cd tienda-jers && npx vitest run lib/productos.test.ts
```

Expected: FAIL — `Cannot find module './productos'` (o equivalente).

- [ ] **Step 5: Implementar `lib/productos.ts`**

```ts
import fs from "node:fs";
import path from "node:path";

export type Producto = {
  slug: string;
  tipo: string;
  titulo: string;
  subtitulo: string;
  descripcionCorta: string;
  descripcionLarga: string[];
  autor: string;
  version: string;
  fecha: string;
  icono: string;
  precio: { usd: number; pen: number };
  stripePriceId: string;
  features: string[];
  queObtienes: string[];
  paraQuien: { perfil: string; texto: string }[];
  contenido: { seccion: string; capitulos: string[] }[];
};

const DIR = path.join(process.cwd(), "content", "productos");

export function getProductos(): Producto[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map(
      (f) =>
        JSON.parse(fs.readFileSync(path.join(DIR, f), "utf-8")) as Producto
    )
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getProducto(slug: string): Producto | undefined {
  return getProductos().find((p) => p.slug === slug);
}
```

- [ ] **Step 6: Correr tests — deben pasar**

```bash
cd tienda-jers && npx vitest run lib/productos.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add tienda-jers/lib tienda-jers/content tienda-jers/package.json tienda-jers/package-lock.json
git commit -m "feat(tienda): modelo Producto, carga desde JSON y 2 productos iniciales"
```

---

### Task 4: Componentes compartidos (PriceTag, ProductCard, BuyButton)

**Files:**
- Create: `tienda-jers/components/PriceTag.tsx`
- Create: `tienda-jers/components/BuyButton.tsx`
- Create: `tienda-jers/components/ProductCard.tsx`
- Create: `tienda-jers/public/images/store/guia-icon.png` (placeholder)
- Create: `tienda-jers/public/images/store/pack-icon.png` (placeholder)

**Interfaces:**
- Consumes: `Producto` de `@/lib/productos`.
- Produces:
  - `<PriceTag precio={{usd, pen}} />` — precio dual estilizado.
  - `<BuyButton slug={string} disponible={boolean} />` — client component; POST a `/api/checkout` y redirige. Si `disponible` es false, muestra "Próximamente" deshabilitado.
  - `<ProductCard producto={Producto} />` — card completa que linkea a `/tienda/[slug]`.

- [ ] **Step 1: Crear iconos placeholder**

```bash
cd tienda-jers && mkdir -p public/images/store
# Placeholder 1x1 PNG transparente (se reemplazan con diseños reales después)
python3 -c "
import base64, pathlib
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
pathlib.Path('public/images/store/guia-icon.png').write_bytes(png)
pathlib.Path('public/images/store/pack-icon.png').write_bytes(png)
"
```

- [ ] **Step 2: Crear `components/PriceTag.tsx`**

```tsx
export default function PriceTag({
  precio,
}: {
  precio: { usd: number; pen: number };
}) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-titulo text-2xl font-semibold text-tinta">
        ${precio.usd} USD
      </span>
      <span className="text-sm text-suave">S/ {precio.pen} PEN</span>
    </p>
  );
}
```

- [ ] **Step 3: Crear `components/BuyButton.tsx`**

```tsx
"use client";

import { useState } from "react";

export default function BuyButton({
  slug,
  disponible,
}: {
  slug: string;
  disponible: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comprar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar el pago");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setCargando(false);
    }
  }

  if (!disponible) {
    return (
      <button
        disabled
        className="cursor-not-allowed rounded-full bg-borde px-8 py-3 font-semibold text-suave"
      >
        Próximamente
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={comprar}
        disabled={cargando}
        className="rounded-full bg-acento px-8 py-3 font-semibold text-white shadow-lg shadow-acento/20 transition hover:opacity-90 disabled:opacity-60"
      >
        {cargando ? "Redirigiendo…" : "Comprar"}
      </button>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Crear `components/ProductCard.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import type { Producto } from "@/lib/productos";
import PriceTag from "./PriceTag";

export default function ProductCard({ producto }: { producto: Producto }) {
  return (
    <Link
      href={`/tienda/${producto.slug}`}
      className="flex flex-col gap-4 rounded-lg border border-borde bg-card p-6 transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <Image
          src={producto.icono}
          alt={producto.titulo}
          width={48}
          height={48}
          className="rounded"
        />
        <span className="rounded-full border border-primario px-3 py-1 text-xs font-medium text-primario">
          {producto.tipo}
        </span>
      </div>
      <h3 className="font-titulo text-xl font-semibold text-tinta">
        {producto.titulo}
      </h3>
      <p className="text-sm text-suave">{producto.descripcionCorta}</p>
      <div className="mt-auto flex items-center justify-between">
        <PriceTag precio={producto.precio} />
        <span className="text-sm font-medium text-primario">
          Ver producto →
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: Verificar build**

```bash
cd tienda-jers && npm run build
```

Expected: build exitoso (componentes aún sin usar — warning de unused es aceptable, error no).

- [ ] **Step 6: Commit**

```bash
git add tienda-jers/components tienda-jers/public
git commit -m "feat(tienda): componentes PriceTag, BuyButton y ProductCard"
```

---

### Task 5: Página de listado `/tienda` y redirect de `/`

**Files:**
- Create: `tienda-jers/app/tienda/page.tsx`
- Modify: `tienda-jers/app/page.tsx`

**Interfaces:**
- Consumes: `getProductos()` de `@/lib/productos`, `<ProductCard />`.
- Produces: `/tienda` renderiza el grid; `/` redirige a `/tienda`.

- [ ] **Step 1: Crear `app/tienda/page.tsx`**

```tsx
import { getProductos } from "@/lib/productos";
import ProductCard from "@/components/ProductCard";

export const metadata = {
  title: "Tienda — Jers Ancajima",
  description:
    "Recursos digitales de marketing, IA y automatización creados por Jers Ancajima.",
};

export default function TiendaPage() {
  const productos = getProductos();
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="font-titulo text-4xl font-semibold text-tinta">
          Recursos para crecer con IA
        </h1>
        <p className="mt-3 text-suave">
          Guías y herramientas que creé para ayudarte a crecer — por Jers
          Ancajima.
        </p>
      </header>
      <div className="grid gap-6 sm:grid-cols-2">
        {productos.map((p) => (
          <ProductCard key={p.slug} producto={p} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Reemplazar `app/page.tsx` con redirect**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/tienda");
}
```

- [ ] **Step 3: Verificar en dev**

```bash
cd tienda-jers && npm run dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/tienda
curl -s http://localhost:3000/tienda | grep -o "Marketing con IA de Cero a Cien" | head -1
```

Expected: `200` y el título del producto presente. Matar server después.

- [ ] **Step 4: Verificar build y tests**

```bash
cd tienda-jers && npm run build && npm test
```

Expected: build OK, 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tienda-jers/app && git commit -m "feat(tienda): página /tienda con grid de productos y redirect desde /"
```

---

### Task 6: Página de detalle `/tienda/[slug]`

**Files:**
- Create: `tienda-jers/app/tienda/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getProducto(slug)`, `getProductos()`, `<PriceTag />`, `<BuyButton />`.
- Produces: página de producto completa; slug inexistente → 404 vía `notFound()`.

- [ ] **Step 1: Crear `app/tienda/[slug]/page.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducto, getProductos } from "@/lib/productos";
import PriceTag from "@/components/PriceTag";
import BuyButton from "@/components/BuyButton";

export function generateStaticParams() {
  return getProductos().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const producto = getProducto(slug);
  if (!producto) return {};
  return {
    title: `${producto.titulo} — Jers Ancajima`,
    description: producto.descripcionCorta,
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const producto = getProducto(slug);
  if (!producto) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/tienda" className="text-sm text-primario hover:underline">
        ← Volver a la tienda
      </Link>

      <header className="mt-8 flex items-start gap-4">
        <Image
          src={producto.icono}
          alt={producto.titulo}
          width={64}
          height={64}
          className="rounded"
        />
        <div>
          <h1 className="font-titulo text-3xl font-semibold text-tinta">
            {producto.titulo}
          </h1>
          <p className="mt-1 text-suave">{producto.subtitulo}</p>
          <p className="mt-2 text-sm text-suave">
            {producto.fecha} · Versión {producto.version} · por {producto.autor}
          </p>
          <span className="mt-2 inline-block rounded-full border border-primario px-3 py-1 text-xs font-medium text-primario">
            {producto.tipo}
          </span>
        </div>
      </header>

      <section className="mt-10 space-y-4">
        {producto.descripcionLarga.map((parrafo, i) => (
          <p key={i} className="leading-relaxed text-suave">
            {parrafo}
          </p>
        ))}
      </section>

      <ul className="mt-8 flex flex-wrap gap-2">
        {producto.features.map((f) => (
          <li
            key={f}
            className="rounded-full border border-borde bg-card px-4 py-1.5 text-sm text-suave"
          >
            {f}
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="font-titulo text-2xl font-semibold text-tinta">
          Qué obtienes
        </h2>
        <ul className="mt-4 space-y-2">
          {producto.queObtienes.map((item) => (
            <li key={item} className="flex gap-2 text-suave">
              <span className="text-primario">✓</span> {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-lg border border-borde bg-card p-8 text-center">
        <PriceTag precio={producto.precio} />
        <div className="mt-4 flex justify-center">
          <BuyButton
            slug={producto.slug}
            disponible={producto.stripePriceId !== ""}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-titulo text-2xl font-semibold text-tinta">
          Para quién es
        </h2>
        <div className="mt-4 space-y-4">
          {producto.paraQuien.map((seg) => (
            <div key={seg.perfil}>
              <h3 className="font-semibold text-tinta">{seg.perfil}</h3>
              <p className="text-suave">{seg.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-titulo text-2xl font-semibold text-tinta">
          Contenido completo
        </h2>
        {producto.contenido.map((sec) => (
          <div key={sec.seccion} className="mt-6">
            <h3 className="font-semibold text-primario">{sec.seccion}</h3>
            <ul className="mt-2 space-y-1">
              {sec.capitulos.map((cap) => (
                <li key={cap} className="text-suave">
                  {cap}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verificar en dev — producto y 404**

```bash
cd tienda-jers && npm run dev &
sleep 6
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/tienda/guia-marketing-ia
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/tienda/no-existe
```

Expected: `200` y `404`. Matar server después.

- [ ] **Step 3: Verificar build y tests**

```bash
cd tienda-jers && npm run build && npm test
```

Expected: OK. En el build las dos rutas de producto aparecen prerenderizadas (SSG).

- [ ] **Step 4: Commit**

```bash
git add tienda-jers/app && git commit -m "feat(tienda): página de detalle de producto con 404 para slugs inválidos"
```

---

### Task 7: Endpoint de checkout (`/api/checkout`) con Stripe en modo test

**Files:**
- Create: `tienda-jers/lib/stripe.ts`
- Create: `tienda-jers/app/api/checkout/route.ts`
- Create: `tienda-jers/app/api/checkout/checkout.test.ts`
- Create: `tienda-jers/.env.local` (NO commitear — ya está en .gitignore de Next)
- Create: `tienda-jers/.env.example`

**Interfaces:**
- Consumes: `getProducto(slug)`.
- Produces:
  - `POST /api/checkout` con body `{ slug: string }` → `200 { url: string }` | `400 { error: string }` (slug faltante, producto inexistente o sin `stripePriceId`) | `500 { error: string }` (fallo Stripe).
  - `lib/stripe.ts` exporta `stripe` (instancia del SDK con `process.env.STRIPE_SECRET_KEY`).

- [ ] **Step 1: Instalar Stripe SDK**

```bash
cd tienda-jers && npm install stripe
```

- [ ] **Step 2: Crear `.env.example` y `.env.local`**

`.env.example` (este SÍ se commitea):

```bash
# Claves de Stripe — https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxx
# URL base del sitio (para redirects de checkout)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local`: copiar `.env.example` y poner la clave **test** real (`sk_test_...`) del dashboard de Stripe. Verificar que `.gitignore` de `tienda-jers` incluye `.env*`.

- [ ] **Step 3: Crear `lib/stripe.ts`**

```ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
```

- [ ] **Step 4: Escribir el test que falla**

`tienda-jers/app/api/checkout/checkout.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: createMock } } },
}));

vi.mock("@/lib/productos", () => ({
  getProducto: (slug: string) => {
    if (slug === "con-precio")
      return { slug, titulo: "Test", stripePriceId: "price_123" };
    if (slug === "sin-precio")
      return { slug, titulo: "Test", stripePriceId: "" };
    return undefined;
  },
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => createMock.mockReset());

  it("crea sesión y devuelve url para producto con precio", async () => {
    createMock.mockResolvedValue({ url: "https://checkout.stripe.com/abc" });
    const res = await POST(req({ slug: "con-precio" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/abc");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_123", quantity: 1 }],
        mode: "payment",
      })
    );
  });

  it("400 si el producto no tiene stripePriceId", async () => {
    const res = await POST(req({ slug: "sin-precio" }));
    expect(res.status).toBe(400);
  });

  it("400 si el slug no existe", async () => {
    const res = await POST(req({ slug: "nada" }));
    expect(res.status).toBe(400);
  });

  it("500 si Stripe falla", async () => {
    createMock.mockRejectedValue(new Error("stripe caído"));
    const res = await POST(req({ slug: "con-precio" }));
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 5: Correr test — debe fallar**

```bash
cd tienda-jers && npx vitest run app/api/checkout/checkout.test.ts
```

Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 6: Implementar `app/api/checkout/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getProducto } from "@/lib/productos";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  let slug: string | undefined;
  try {
    ({ slug } = await request.json());
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const producto = slug ? getProducto(slug) : undefined;
  if (!producto || !producto.stripePriceId) {
    return NextResponse.json(
      { error: "Producto no disponible" },
      { status: 400 }
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: producto.stripePriceId, quantity: 1 }],
      success_url: `${base}/tienda/${producto.slug}/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/tienda/${producto.slug}`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7: Correr tests — deben pasar**

```bash
cd tienda-jers && npm test
```

Expected: los 4 tests de checkout + 4 de productos PASS.

- [ ] **Step 8: Verificar build**

```bash
cd tienda-jers && npm run build
```

Expected: build OK.

- [ ] **Step 9: Commit**

```bash
git add tienda-jers/lib tienda-jers/app/api tienda-jers/.env.example tienda-jers/package.json tienda-jers/package-lock.json
git commit -m "feat(tienda): endpoint /api/checkout con Stripe Checkout Sessions"
```

---

### Task 8: Página de gracias con verificación de pago y descarga

**Files:**
- Create: `tienda-jers/app/tienda/[slug]/gracias/page.tsx`
- Create: `tienda-jers/app/api/descarga/route.ts`
- Create: `tienda-jers/private/descargas/.gitkeep` (los PDF reales NO se commitean)
- Modify: `tienda-jers/.gitignore` (agregar `private/descargas/*.pdf`)

**Interfaces:**
- Consumes: `stripe` de `@/lib/stripe`, `getProducto(slug)`.
- Produces:
  - `/tienda/[slug]/gracias?session_id=...` — server component: verifica `session.payment_status === "paid"`; si pagado muestra botón de descarga a `/api/descarga?session_id=...&slug=...`; si no, mensaje de pago no confirmado.
  - `GET /api/descarga?session_id=...&slug=...` → verifica sesión pagada y hace stream de `private/descargas/<slug>.pdf` | `403` si no pagada | `404` si no hay archivo.

- [ ] **Step 1: Crear carpeta de descargas y gitignore**

```bash
cd tienda-jers && mkdir -p private/descargas && touch private/descargas/.gitkeep
echo "private/descargas/*.pdf" >> .gitignore
```

- [ ] **Step 2: Crear `app/tienda/[slug]/gracias/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducto } from "@/lib/productos";
import { stripe } from "@/lib/stripe";

export default async function GraciasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id } = await searchParams;
  const producto = getProducto(slug);
  if (!producto) notFound();

  let pagado = false;
  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      pagado = session.payment_status === "paid";
    } catch {
      pagado = false;
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      {pagado ? (
        <>
          <h1 className="font-titulo text-3xl font-semibold text-tinta">
            ¡Gracias por tu compra!
          </h1>
          <p className="mt-4 text-suave">
            Tu pago de <strong>{producto.titulo}</strong> fue confirmado.
            También recibirás un recibo de Stripe por correo.
          </p>
          <a
            href={`/api/descarga?session_id=${session_id}&slug=${slug}`}
            className="mt-8 inline-block rounded-full bg-acento px-8 py-3 font-semibold text-white shadow-lg shadow-acento/20 transition hover:opacity-90"
          >
            Descargar ahora
          </a>
        </>
      ) : (
        <>
          <h1 className="font-titulo text-3xl font-semibold text-tinta">
            Pago no confirmado
          </h1>
          <p className="mt-4 text-suave">
            No pudimos confirmar tu pago. Si crees que es un error, escríbeme.
          </p>
          <Link
            href={`/tienda/${slug}`}
            className="mt-8 inline-block text-primario hover:underline"
          >
            ← Volver al producto
          </Link>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Crear `app/api/descarga/route.ts`**

```ts
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getProducto } from "@/lib/productos";
import { stripe } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const slug = searchParams.get("slug");

  const producto = slug ? getProducto(slug) : undefined;
  if (!sessionId || !producto) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pago no confirmado" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 403 });
  }

  const archivo = path.join(
    process.cwd(),
    "private",
    "descargas",
    `${producto.slug}.pdf`
  );
  if (!fs.existsSync(archivo)) {
    return NextResponse.json(
      { error: "Archivo no disponible, contacta al autor" },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(fs.readFileSync(archivo)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${producto.slug}.pdf"`,
    },
  });
}
```

- [ ] **Step 4: Verificar build y tests**

```bash
cd tienda-jers && npm run build && npm test
```

Expected: OK, 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tienda-jers/app tienda-jers/private tienda-jers/.gitignore
git commit -m "feat(tienda): página de gracias y descarga protegida por verificación de pago"
```

---

### Task 9: Configuración de Stripe (pasos manuales guiados) + prueba end-to-end en modo test

**Files:**
- Modify: `tienda-jers/content/productos/guia-marketing-ia.json` (llenar `stripePriceId`)
- Modify: `tienda-jers/content/productos/pack-skills-automatizacion.json` (llenar `stripePriceId`)
- Create: `tienda-jers/private/descargas/guia-marketing-ia.pdf` (archivo de prueba)

Esta task mezcla pasos manuales del usuario (dashboard de Stripe) con verificación. Guiar al usuario en cada paso manual.

- [ ] **Step 1 (manual, usuario): Completar perfil de Stripe**

En https://dashboard.stripe.com — cuenta de jersancajima@gmail.com. Activar modo **Test** (toggle arriba a la derecha). No hace falta verificación del negocio para modo test.

- [ ] **Step 2 (manual, usuario): Crear productos y precios en modo test**

Dashboard → Product catalog → Add product:
- Producto 1: nombre "Marketing con IA de Cero a Cien", precio one-time $29.00 USD. Guardar y copiar el ID del precio (`price_...`).
- Producto 2: nombre "Pack de Skills y Templates de Automatización", precio one-time $29.00 USD. Copiar `price_...`.
- (Opcional ahora, necesario antes de live: agregar currency option PEN S/ 99 a cada precio.)

- [ ] **Step 3: Pegar los price IDs en los JSON**

En cada JSON de `content/productos/`, reemplazar `"stripePriceId": ""` con el ID real, p. ej. `"stripePriceId": "price_1Qxxxx"`.

- [ ] **Step 4: Colocar PDF de prueba**

```bash
cd tienda-jers
# cualquier PDF sirve como prueba; ejemplo con uno existente del repo
cp "../prospeccion-ia/assets/entregable-oroazul-final.pdf" private/descargas/guia-marketing-ia.pdf
```

- [ ] **Step 5: Prueba end-to-end en modo test**

```bash
cd tienda-jers && npm run dev
```

En el navegador: `http://localhost:3000/tienda/guia-marketing-ia` → botón "Comprar" (ya no dice "Próximamente") → redirige a Stripe → pagar con tarjeta test `4242 4242 4242 4242`, fecha futura, CVC cualquiera → redirige a `/gracias` → "Descargar ahora" descarga el PDF.

Expected: flujo completo sin errores. Verificar también que volver a `/gracias` sin `session_id` muestra "Pago no confirmado".

- [ ] **Step 6: Correr tests y build**

```bash
cd tienda-jers && npm test && npm run build
```

Expected: OK.

- [ ] **Step 7: Commit**

```bash
git add tienda-jers/content
git commit -m "feat(tienda): conectar productos con precios de Stripe (modo test)"
```

---

### Task 10: Deploy a Vercel + dominio + Stripe live

Pasos mayormente manuales del usuario, guiados. Sin código nuevo salvo variables de entorno.

- [ ] **Step 1 (manual, usuario): Crear proyecto en Vercel**

1. https://vercel.com → login con GitHub.
2. Import del repo; **Root Directory: `tienda-jers`** (crítico — es mono-repo).
3. En Environment Variables agregar `STRIPE_SECRET_KEY` (por ahora la `sk_test_...`) y `NEXT_PUBLIC_SITE_URL` (la URL `https://<proyecto>.vercel.app`).
4. Deploy.

Expected: tienda visible en `https://<proyecto>.vercel.app/tienda`.

- [ ] **Step 2: Smoke test en Vercel (modo test)**

Repetir compra con tarjeta `4242...` en la URL de producción. Expected: flujo completo OK.

- [ ] **Step 3 (manual, usuario): Comprar y conectar dominio**

1. Comprar dominio (Namecheap o similar; verificar disponibilidad de jersancajima.com primero).
2. Vercel → Settings → Domains → agregar dominio → seguir instrucciones DNS.
3. Actualizar `NEXT_PUBLIC_SITE_URL` en Vercel al dominio nuevo y redeploy.

- [ ] **Step 4 (manual, usuario): Activar Stripe live**

1. Dashboard Stripe → completar activación de cuenta (datos de negocio/personales, cuenta bancaria para payouts).
2. En modo **Live**: recrear los 2 productos/precios (los IDs de test no existen en live). Copiar los nuevos `price_...`.
3. Actualizar los `stripePriceId` en los JSON, commit, push (redeploy automático).
4. En Vercel cambiar `STRIPE_SECRET_KEY` a la `sk_live_...` y redeploy.

- [ ] **Step 5: Smoke test real**

Compra real de $29 con tarjeta propia (el dinero vuelve como payout menos fee de Stripe — costo real solo la comisión). Verificar email de recibo y descarga.

- [ ] **Step 6: Commit final**

```bash
git add tienda-jers/content
git commit -m "feat(tienda): price IDs de Stripe live"
```

---

## Self-Review (completado)

- **Cobertura del spec:** rutas (`/tienda`, `/tienda/[slug]`, `/api/checkout`) → Tasks 5–7. JSON por producto → Task 3. Paleta/tipografía → Task 2. Flujo de compra + gracias + entrega → Tasks 7–8. Fases 3–4 (Stripe test, dominio/live) → Tasks 9–10. Manejo de errores (404, 400 sin priceId, fallo Stripe) → Tasks 6–7. Sin gaps.
- **Placeholders:** ninguno — todo paso con código lo incluye completo. Los pasos "manuales, usuario" son inherentemente manuales (dashboards externos), con instrucciones concretas.
- **Consistencia de tipos:** `Producto` definido en Task 3 y consumido igual en Tasks 4–8; `getProducto`/`getProductos` con las mismas firmas en todos los usos; respuesta de `/api/checkout` (`{url}` | `{error}`) coincide entre route y BuyButton.
