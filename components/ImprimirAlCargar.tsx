"use client";

import { useEffect } from "react";

/** Abre el diálogo de impresión al cargar la página (para el ticket de venta). */
export function ImprimirAlCargar({ activo }: { activo: boolean }) {
  useEffect(() => {
    if (!activo) return;
    const t = setTimeout(() => window.print(), 300); // deja que carguen las fuentes
    return () => clearTimeout(t);
  }, [activo]);
  return null;
}

export function BotonesTicket() {
  return (
    <div className="mx-auto mb-4 flex max-w-[80mm] gap-2 print:hidden">
      <button onClick={() => window.print()} className="flex-1 rounded-lg bg-acento-700 px-3 py-2 text-sm font-medium text-white hover:bg-acento-800">
        🖨 Imprimir
      </button>
      <button onClick={() => window.close()} className="rounded-lg border border-gris-300 bg-papel px-3 py-2 text-sm text-gris-700 hover:bg-gris-50">
        Cerrar
      </button>
    </div>
  );
}
