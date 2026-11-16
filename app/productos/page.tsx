import type { Metadata } from "next";
import Link from "next/link";
import { EstadoStock } from "@/components/EstadoStock";
import { Miniatura } from "@/components/Foto";
import { btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "@/components/estilos";
import { Paginacion } from "@/components/Paginacion";
import { Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { listarCatalogo } from "@/lib/data/catalogos";
import { buscarProductos, type FiltrosProductos, POR_PAGINA } from "@/lib/data/productos";
import { cantidad, dinero, medidas, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Productos" };

type SP = { q?: string; categoria?: string; marca?: string; estado?: string; pagina?: string };

const ESTADOS = [
  { valor: "activos", texto: "Activos" },
  { valor: "bajo", texto: "Stock bajo" },
  { valor: "agotados", texto: "Agotados" },
  { valor: "inactivos", texto: "Inactivos" },
  { valor: "todos", texto: "Todos" },
];

export default async function ProductosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const estado = (ESTADOS.some((e) => e.valor === sp.estado) ? sp.estado : "activos") as FiltrosProductos["estado"];
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const filtros: FiltrosProductos = {
    q: sp.q,
    categoria: Number(sp.categoria) || undefined,
    marca: Number(sp.marca) || undefined,
    estado,
    pagina,
  };
  const { productos, total } = buscarProductos(filtros);
  const categorias = listarCatalogo("categorias");
  const marcas = listarCatalogo("marcas");
  const hayFiltros = !!(sp.q || sp.categoria || sp.marca || (sp.estado && sp.estado !== "activos"));

  return (
    <>
      <Encabezado
        titulo="Productos"
        descripcion={`${total} ${total === 1 ? "producto" : "productos"}`}
        acciones={
          <Link href="/productos/nuevo" className={btnPrimario}>
            + Nuevo producto
          </Link>
        }
      />

      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_160px_auto]">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Buscar por nombre, código, modelo, marca…"
          className={`${inputCls} sm:col-span-2 xl:col-span-1`}
          type="search"
        />
        <select name="categoria" defaultValue={sp.categoria ?? ""} className={inputCls} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select name="marca" defaultValue={sp.marca ?? ""} className={inputCls} aria-label="Marca">
          <option value="">Todas las marcas</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={estado} className={inputCls} aria-label="Estado">
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.texto}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button className={btnSecundario}>Filtrar</button>
          {hayFiltros && (
            <Link href="/productos" className={btnSecundario}>
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <Tarjeta className="overflow-hidden">
        {productos.length === 0 ? (
          hayFiltros ? (
            <Vacio titulo="No hay productos con esos filtros" texto="Prueba con otra búsqueda." />
          ) : (
            <Vacio
              titulo="Aún no hay productos"
              texto="Registra tu primer producto para empezar a controlar el inventario."
              accion={
                <Link href="/productos/nuevo" className={btnPrimario}>
                  Registrar producto
                </Link>
              }
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Código</th>
                    <th className={thCls}>Producto</th>
                    <th className={thCls}>Categoría</th>
                    <th className={thCls}>Medidas</th>
                    <th className={`${thCls} text-right`}>Precio</th>
                    <th className={`${thCls} text-right`}>Stock</th>
                    <th className={thCls}>Ubicación</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id} className={p.activo ? "hover:bg-zinc-50" : "bg-zinc-50/60 text-zinc-500"}>
                      <td className={`${tdCls} whitespace-nowrap font-mono text-xs text-zinc-600`}>{p.codigo}</td>
                      <td className={tdCls}>
                        <Link href={`/productos/${p.id}`} className="group flex items-center gap-3">
                          <Miniatura imagen={p.imagen} alt={p.nombre} tam={48} />
                          <span className="min-w-0">
                            <span className="block font-medium text-zinc-900 group-hover:text-teal-700">{p.nombre}</span>
                            <span className="block text-xs text-zinc-500">
                              {[p.marca, p.modelo].filter(Boolean).join(" · ")}
                              {!p.activo && (
                                <span className="ml-1">
                                  <Etiqueta>Inactivo</Etiqueta>
                                </span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={tdCls}>{p.categoria ?? <span className="text-zinc-400">—</span>}</td>
                      <td className={`${tdCls} whitespace-nowrap text-zinc-600`}>{medidas(p) || <span className="text-zinc-400">—</span>}</td>
                      <td className={`${tdCls} tabular whitespace-nowrap text-right`}>{dinero(p.precio_venta)}</td>
                      <td className={`${tdCls} whitespace-nowrap text-right`}>
                        <div className="tabular font-medium">
                          {cantidad(p.stock)} <span className="text-xs font-normal text-zinc-500">{nombreUnidad(p.stock, p.unidad)}</span>
                        </div>
                        <EstadoStock stock={p.stock} minimo={p.stock_minimo} />
                      </td>
                      <td className={tdCls}>{p.ubicacion ?? <span className="text-zinc-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              ruta="/productos"
              params={{ q: sp.q, categoria: sp.categoria, marca: sp.marca, estado: sp.estado }}
              pagina={pagina}
              total={total}
              porPagina={POR_PAGINA}
            />
          </>
        )}
      </Tarjeta>
    </>
  );
}
