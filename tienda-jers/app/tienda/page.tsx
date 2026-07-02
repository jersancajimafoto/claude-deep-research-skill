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
