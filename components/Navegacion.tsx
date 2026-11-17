"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesionAccion } from "@/app/actions/sesion";

type Enlace = { href: string; texto: string; icono: string; soloAdmin?: boolean };

const secciones: { titulo: string; enlaces: Enlace[] }[] = [
  {
    titulo: "Operación",
    enlaces: [
      { href: "/", texto: "Inicio", icono: "◧" },
      { href: "/ventas/nueva", texto: "Nueva venta", icono: "＋" },
      { href: "/ventas", texto: "Ventas", icono: "▤" },
      { href: "/entradas", texto: "Entradas", icono: "↓", soloAdmin: true },
    ],
  },
  {
    titulo: "Inventario",
    enlaces: [
      { href: "/productos", texto: "Productos", icono: "▦" },
      { href: "/ajustes", texto: "Ajustes", icono: "±", soloAdmin: true },
      { href: "/movimientos", texto: "Movimientos", icono: "⇅" },
      { href: "/etiquetas", texto: "Etiquetas", icono: "▥" },
      { href: "/productos/importar", texto: "Importar / exportar", icono: "⇄", soloAdmin: true },
    ],
  },
  {
    titulo: "Análisis",
    enlaces: [{ href: "/reportes", texto: "Reportes", icono: "◔", soloAdmin: true }],
  },
  {
    titulo: "Catálogos",
    enlaces: [
      { href: "/categorias", texto: "Categorías", icono: "◇", soloAdmin: true },
      { href: "/marcas", texto: "Marcas", icono: "◈", soloAdmin: true },
      { href: "/proveedores", texto: "Proveedores", icono: "⌂", soloAdmin: true },
    ],
  },
  {
    titulo: "Administración",
    enlaces: [
      { href: "/usuarios", texto: "Usuarios", icono: "◉", soloAdmin: true },
      { href: "/configuracion", texto: "Configuración", icono: "⚙", soloAdmin: true },
    ],
  },
];

function activo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ventas") return pathname === "/ventas" || /^\/ventas\/\d+/.test(pathname);
  if (href === "/productos") return pathname === "/productos" || (pathname.startsWith("/productos/") && pathname !== "/productos/importar");
  return pathname === href || pathname.startsWith(href + "/");
}

const ROL_TEXTO = { admin: "Administrador", vendedor: "Vendedor" } as const;

export function Navegacion({
  nombre,
  usuario,
}: {
  nombre: string;
  usuario: { nombre: string; rol: "admin" | "vendedor" };
}) {
  const pathname = usePathname();
  const admin = usuario.rol === "admin";
  const visibles = secciones
    .map((s) => ({ ...s, enlaces: s.enlaces.filter((e) => admin || !e.soloAdmin) }))
    .filter((s) => s.enlaces.length > 0);
  const todos = visibles.flatMap((s) => s.enlaces);

  return (
    <>
      {/* Escritorio: barra lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 print:!hidden flex-col border-r border-zinc-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">
            {nombre.charAt(0)}
          </span>
          <span className="truncate font-semibold text-zinc-900">{nombre}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibles.map((s) => (
            <div key={s.titulo} className="mb-5">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{s.titulo}</p>
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
        <div className="border-t border-zinc-100 p-3">
          <Link href="/cuenta" className="block rounded-lg px-2 py-1.5 hover:bg-zinc-50">
            <span className="block truncate text-sm font-medium text-zinc-900">{usuario.nombre}</span>
            <span className="block text-xs text-zinc-500">{ROL_TEXTO[usuario.rol]} · Mi cuenta</span>
          </Link>
          <form action={cerrarSesionAccion}>
            <button className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900">
              ⎋ Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Móvil / tablet: barra superior con menú deslizable */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white lg:hidden print:hidden">
        <div className="flex h-12 items-center gap-2 px-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-700 text-xs font-bold text-white">
            {nombre.charAt(0)}
          </span>
          <span className="truncate font-semibold text-zinc-900">{nombre}</span>
          <Link href="/cuenta" className="ml-auto truncate text-sm text-zinc-600">
            {usuario.nombre}
          </Link>
          <form action={cerrarSesionAccion}>
            <button className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100" aria-label="Cerrar sesión">
              Salir
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {todos.map((e) => {
            const on = activo(pathname, e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${on ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"}`}
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
