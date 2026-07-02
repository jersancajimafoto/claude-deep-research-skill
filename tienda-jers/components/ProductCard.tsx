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
