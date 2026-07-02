import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

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
  // Nota: se usa vi.clearAllMocks() en vez de createMock.mockReset() porque
  // en Vitest 4.1.9 reusar un mock con mockReset() tras mockResolvedValue()
  // y luego mockRejectedValue() dispara un unhandledRejection espurio pese a
  // que la promesa sí se captura en el try/catch de route.ts.
  beforeEach(() => vi.clearAllMocks());

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

  it("500 si Stripe devuelve session.url nulo", async () => {
    createMock.mockResolvedValue({ url: null });
    const res = await POST(req({ slug: "con-precio" }));
    expect(res.status).toBe(500);
  });
});
