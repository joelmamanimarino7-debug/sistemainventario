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
      { href: "/caja", texto: "Caja", icono: "▣" },
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
      { href: "/respaldos", texto: "Respaldos", icono: "⛁", soloAdmin: true },
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
      {/* Escritorio: barra lateral café */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 print:!hidden flex-col bg-tierra-900 text-tierra-200 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-5">
          <Marca letra={nombre.charAt(0)} />
          <span className="truncate font-display text-[17px] font-semibold text-tierra-50">{nombre}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibles.map((s) => (
            <div key={s.titulo} className="mb-5">
              <p className="mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-tierra-500">{s.titulo}</p>
              {s.enlaces.map((e) => {
                const on = activo(pathname, e.href);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                      on ? "bg-white/[0.07] font-medium text-white" : "text-tierra-300 hover:bg-white/[0.04] hover:text-tierra-50"
                    }`}
                  >
                    {on && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-acento-400" />}
                    <span aria-hidden className={`w-4 text-center ${on ? "text-acento-400" : "text-tierra-500"}`}>
                      {e.icono}
                    </span>
                    {e.texto}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <Link href="/cuenta" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.05]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tierra-700 text-xs font-semibold text-tierra-100">
              {iniciales(usuario.nombre)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-tierra-50">{usuario.nombre}</span>
              <span className="block text-xs text-tierra-400">{ROL_TEXTO[usuario.rol]} · Mi cuenta</span>
            </span>
          </Link>
          <form action={cerrarSesionAccion}>
            <button className="mt-1 w-full rounded-lg px-2 py-1.5 text-left text-sm text-tierra-400 hover:bg-white/[0.05] hover:text-tierra-50">
              ⎋ Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Móvil / tablet: barra superior café con menú deslizable */}
      <header className="sticky top-0 z-20 bg-tierra-900 text-tierra-100 shadow-md shadow-tierra-950/20 lg:hidden print:hidden">
        <div className="flex h-12 items-center gap-2 px-4">
          <Marca letra={nombre.charAt(0)} chica />
          <span className="truncate font-display font-semibold text-tierra-50">{nombre}</span>
          <Link href="/cuenta" className="ml-auto truncate text-sm text-tierra-300">
            {usuario.nombre}
          </Link>
          <form action={cerrarSesionAccion}>
            <button className="rounded-md px-2 py-1 text-sm text-tierra-300 hover:bg-white/10" aria-label="Cerrar sesión">
              Salir
            </button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {todos.map((e) => {
            const on = activo(pathname, e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={on ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-sm ${
                  on ? "bg-acento-500 font-medium text-white" : "bg-white/[0.07] text-tierra-200"
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

/** Logo del negocio: la inicial sobre un sello naranja. */
export function Marca({ letra, chica }: { letra: string; chica?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-acento-400 to-acento-600 font-display font-bold text-white shadow-sm shadow-acento-900/30 ${
        chica ? "h-7 w-7 text-sm" : "h-8 w-8 text-base"
      }`}
    >
      {letra}
    </span>
  );
}

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
