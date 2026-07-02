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
