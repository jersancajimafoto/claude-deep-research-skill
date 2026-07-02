export default function PriceTag({
  precio,
}: {
  precio: { usd: number; pen: number };
}) {
  return (
    <p className="flex items-baseline gap-2">
      <span className="font-titulo text-2xl font-semibold text-tinta">
        ${precio.usd} USD
      </span>
      <span className="text-sm text-suave">S/ {precio.pen} PEN</span>
    </p>
  );
}
