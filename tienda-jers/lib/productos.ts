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
