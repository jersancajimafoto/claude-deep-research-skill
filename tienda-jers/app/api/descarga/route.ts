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
    if (session.metadata?.slug !== producto.slug) {
      return NextResponse.json(
        { error: "La compra no corresponde a este producto" },
        { status: 403 }
      );
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
