"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const secciones = [
  {
    titulo: "Operación",
    enlaces: [
      { href: "/", texto: "Inicio", icono: "◧" },
      { href: "/ventas/nueva", texto: "Nueva venta", icono: "＋" },
      { href: "/ventas", texto: "Ventas", icono: "▤" },
      { href: "/entradas", texto: "Entradas", icono: "↓" },
    ],
  },
  {
    titulo: "Inventario",
    enlaces: [
      { href: "/productos", texto: "Productos", icono: "▦" },
      { href: "/movimientos", texto: "Movimientos", icono: "⇅" },
    ],
  },
  {
    titulo: "Catálogos",
    enlaces: [
      { href: "/categorias", texto: "Categorías", icono: "◇" },
      { href: "/marcas", texto: "Marcas", icono: "◈" },
      { href: "/proveedores", texto: "Proveedores", icono: "⌂" },
    ],
  },
];

function activo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ventas") return pathname === "/ventas" || /^\/ventas\/\d+/.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

export function Navegacion({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const todos = secciones.flatMap((s) => s.enlaces);

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 print:!hidden flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">
            {nombre.charAt(0)}
          </span>
          <span className="font-semibold text-zinc-900">{nombre}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {secciones.map((s) => (
            <div key={s.titulo} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {s.titulo}
              </p>
              {s.enlaces.map((e) => {
                const on = activo(pathname, e.href);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                      on ? "bg-teal-50 font-medium text-teal-800" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <span aria-hidden className={`w-4 text-center ${on ? "text-teal-700" : "text-zinc-400"}`}>
                      {e.icono}
                    </span>
                    {e.texto}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Móvil / tablet: barra superior con menú deslizable */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white lg:hidden print:hidden">
        <div className="flex h-12 items-center gap-2 px-4">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-teal-700 text-xs font-bold text-white">
            {nombre.charAt(0)}
          </span>
          <span className="font-semibold text-zinc-900">{nombre}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {todos.map((e) => {
            const on = activo(pathname, e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                  on ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
