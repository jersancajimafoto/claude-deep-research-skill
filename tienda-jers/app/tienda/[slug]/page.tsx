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
