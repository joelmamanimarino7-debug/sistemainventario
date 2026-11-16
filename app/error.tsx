"use client";

import { btnPrimario } from "@/components/estilos";

export default function ErrorPagina({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="mx-auto mt-2 max-w-md text-zinc-500">{error.message}</p>
      <button onClick={reset} className={`${btnPrimario} mt-6`}>
        Reintentar
      </button>
    </div>
  );
}
