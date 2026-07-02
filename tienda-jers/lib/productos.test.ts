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
