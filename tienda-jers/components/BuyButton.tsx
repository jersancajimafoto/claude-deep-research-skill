"use client";

import { useState } from "react";

export default function BuyButton({
  slug,
  disponible,
}: {
  slug: string;
  disponible: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comprar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar el pago");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setCargando(false);
    }
  }

  if (!disponible) {
    return (
      <button
        disabled
        className="cursor-not-allowed rounded-full bg-borde px-8 py-3 font-semibold text-suave"
      >
        Próximamente
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={comprar}
        disabled={cargando}
        className="rounded-full bg-acento px-8 py-3 font-semibold text-white shadow-lg shadow-acento/20 transition hover:opacity-90 disabled:opacity-60"
      >
        {cargando ? "Redirigiendo…" : "Comprar"}
      </button>
      {error && <p className="mt-2 text-sm text-acento">{error}</p>}
    </div>
  );
}
