import type { ReactNode } from "react";

/** Marco centrado para las pantallas sin menú (iniciar sesión, primer uso). */
export function PantallaAcceso({ nombre, titulo, texto, children }: { nombre: string; titulo: string; texto?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-700 font-bold text-white">{nombre.charAt(0)}</span>
          <span className="text-lg font-semibold text-zinc-900">{nombre}</span>
        </div>
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs">
          <h1 className="text-xl font-semibold text-zinc-900">{titulo}</h1>
          {texto && <p className="mt-1 text-sm text-zinc-500">{texto}</p>}
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}
