import { beforeEach, describe, expect, it, vi } from "vitest";

const { retrieveMock } = vi.hoisted(() => ({ retrieveMock: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: retrieveMock } } },
}));

vi.mock("@/lib/productos", () => ({
  getProducto: (slug: string) => {
    if (slug === "con-precio")
      return { slug, titulo: "Test", stripePriceId: "price_123" };
    if (slug === "sin-pdf")
      return { slug, titulo: "Sin PDF", stripePriceId: "price_456" };
    return undefined;
  },
}));

import { GET } from "./route";

function req(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return new Request(`http://localhost/api/descarga?${search}`);
}

describe("GET /api/descarga", () => {
  beforeEach(() => vi.clearAllMocks());

  it("400 si falta session_id", async () => {
    const res = await GET(req({ slug: "con-precio" }));
    expect(res.status).toBe(400);
  });

  it("400 si el slug no existe", async () => {
    const res = await GET(req({ session_id: "sess_1", slug: "nada" }));
    expect(res.status).toBe(400);
  });

  it("403 si el pago no está confirmado", async () => {
    retrieveMock.mockResolvedValue({
      payment_status: "unpaid",
      metadata: { slug: "con-precio" },
    });
    const res = await GET(req({ session_id: "sess_1", slug: "con-precio" }));
    expect(res.status).toBe(403);
  });

  it("403 si la sesión pagada corresponde a otro producto", async () => {
    retrieveMock.mockResolvedValue({
      payment_status: "paid",
      metadata: { slug: "otro" },
    });
    const res = await GET(req({ session_id: "sess_1", slug: "con-precio" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("La compra no corresponde a este producto");
  });

  it("404 si el pago es correcto pero el archivo no existe", async () => {
    retrieveMock.mockResolvedValue({
      payment_status: "paid",
      metadata: { slug: "sin-pdf" },
    });
    const res = await GET(req({ session_id: "sess_1", slug: "sin-pdf" }));
    expect(res.status).toBe(404);
  });
});
