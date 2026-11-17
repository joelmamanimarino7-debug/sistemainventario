import type { ReactNode } from "react";
import { Marca } from "./Navegacion";

/** Marco centrado para las pantallas sin menú (iniciar sesión, primer uso). */
export function PantallaAcceso({ nombre, titulo, texto, children }: { nombre: string; titulo: string; texto?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Fondo: degradado cálido suave */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fbe3cd_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#e7dccd_0%,_transparent_50%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <Marca letra={nombre.charAt(0)} />
          <span className="font-display text-xl font-semibold text-tierra-900">{nombre}</span>
        </div>
        <section className="rounded-2xl border border-tierra-200/80 bg-papel p-7 shadow-[0_8px_32px_-12px_rgba(61,49,40,0.25)]">
          <h1 className="text-2xl font-semibold text-tierra-900">{titulo}</h1>
          {texto && <p className="mt-1.5 text-sm text-tierra-500">{texto}</p>}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
