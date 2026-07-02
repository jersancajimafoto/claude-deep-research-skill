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
    if (!session.url) {
      return NextResponse.json(
        { error: "No se pudo iniciar el pago. Intenta de nuevo." },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
