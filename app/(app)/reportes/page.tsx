import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { btnSecundario, inputCls, tdCls, thCls } from "@/components/estilos";
import { Miniatura } from "@/components/Foto";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { etiquetaMetodo } from "@/lib/config";
import {
  inventarioPorCategoria,
  productosSinVentas,
  resumenPeriodo,
  seriePeriodo,
  ventasPorCategoria,
  ventasPorMetodo,
  ventasPorProducto,
  ventasPorVendedor,
} from "@/lib/data/reportes";
import { cantidad, dinero, fecha, nombreUnidad } from "@/lib/format";
import { PERIODOS, resolverPeriodo } from "@/lib/periodos";

export const metadata: Metadata = { title: "Reportes" };

type SP = { periodo?: string; desde?: string; hasta?: string };

function Indicador({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: "rojo" }) {
  return (
    <Tarjeta className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{titulo}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${tono === "rojo" ? "text-red-700" : "text-zinc-900"}`}>{valor}</p>
      {detalle && <p className="tabular mt-0.5 text-xs text-zinc-500">{detalle}</p>}
    </Tarjeta>
  );
}

/** Barra horizontal proporcional, para tablas pequeñas. */
function Barra({ valor, max }: { valor: number; max: number }) {
  const ancho = max > 0 ? Math.max(0, Math.round((valor / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-100">
      <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${ancho}%` }} />
    </div>
  );
}

export default async function ReportesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const r = resumenPeriodo(periodo);
  const serie = seriePeriodo(periodo);
  const metodos = ventasPorMetodo(periodo);
  const vendedores = ventasPorVendedor(periodo);
  const maxVendedor = Math.max(1, ...vendedores.map((x) => x.total));
  const productos = ventasPorProducto(periodo);
  const categorias = ventasPorCategoria(productos);
  const sinVentas = productosSinVentas(periodo);
  const inventario = inventarioPorCategoria();

  const maxSerie = Math.max(1, ...serie.puntos.map((p) => p.netas));
  const cadaCuanto = Math.ceil(serie.puntos.length / 12); // cuántas etiquetas del eje se muestran
  const totalMetodos = metodos.reduce((s, m) => s + m.total, 0);
  const maxCategoria = Math.max(1, ...categorias.map((c) => c.importe));
  const valorQuieto = sinVentas.reduce((s, p) => s + p.valor, 0);
  const inv = inventario.reduce(
    (s, c) => ({ costo: s.costo + c.valor_costo, venta: s.venta + c.valor_venta }),
    { costo: 0, venta: 0 },
  );
  const exportar = `/api/exportar/reporte?desde=${periodo.desde}&hasta=${periodo.hasta}`;

  return (
    <>
      <Encabezado
        titulo="Reportes"
        descripcion={periodo.texto}
        acciones={
          <a href={exportar} className={btnSecundario} download>
            ⇩ Exportar a Excel
          </a>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Periodo">
          {PERIODOS.filter((p) => p.valor !== "personalizado").map((p) => (
            <Link
              key={p.valor}
              href={`/reportes?periodo=${p.valor}`}
              className={`rounded-full px-3 py-1.5 text-sm ${
                periodo.clave === p.valor ? "bg-teal-700 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {p.texto}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex flex-wrap items-end gap-2 sm:ml-auto">
          <label className="text-sm text-zinc-600">
            Desde
            <input type="date" name="desde" defaultValue={periodo.desde} className={`${inputCls} mt-1`} />
          </label>
          <label className="text-sm text-zinc-600">
            Hasta
            <input type="date" name="hasta" defaultValue={periodo.hasta} className={`${inputCls} mt-1`} />
          </label>
          <button className={btnSecundario}>Ver</button>
        </form>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador
          titulo="Ventas netas"
          valor={dinero(r.netas)}
          detalle={`${r.ventas} ${r.ventas === 1 ? "venta" : "ventas"} · promedio ${dinero(r.ticketPromedio)}`}
        />
        <Indicador
          titulo="Ganancia"
          valor={dinero(r.ganancia)}
          detalle={`Margen ${cantidad(r.margen)}% · costo ${dinero(r.costo)}`}
          tono={r.ganancia < 0 ? "rojo" : undefined}
        />
        <Indicador
          titulo="Devoluciones"
          valor={dinero(r.devuelto)}
          detalle={`${r.devoluciones} ${r.devoluciones === 1 ? "devolución" : "devoluciones"} · descuentos ${dinero(r.descuentos)}`}
        />
        <Indicador
          titulo="Pérdidas por ajustes"
          valor={dinero(r.ajustesFaltante)}
          detalle={`Sobrantes ${dinero(r.ajustesSobrante)} · compras ${dinero(r.comprasTotal)}`}
          tono={r.ajustesFaltante < 0 ? "rojo" : undefined}
        />
      </div>

      <Tarjeta titulo={serie.porMes ? "Ventas netas por mes" : "Ventas netas por día"} className="mb-6">
        {r.ventas === 0 && r.devoluciones === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">No hubo ventas en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex h-52 min-w-full items-end gap-1 px-4 pb-3 pt-6" style={{ minWidth: serie.puntos.length * 14 }}>
              {serie.puntos.map((p, i) => {
                const alto = p.netas > 0 ? Math.max(3, Math.round((p.netas / maxSerie) * 100)) : 0;
                return (
                  <div key={p.clave} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full max-w-10 rounded-t bg-teal-600"
                      style={{ height: `${alto}%` }}
                      title={`${p.etiqueta}: ${dinero(p.netas)} · ${p.ventas} ventas · ganancia ${dinero(p.ganancia)}`}
                    />
                    {p.netas <= 0 && <div className="h-0.5 w-full max-w-10 rounded bg-zinc-200" />}
                    <span className="h-4 whitespace-nowrap text-[10px] text-zinc-500">
                      {i % cadaCuanto === 0 ? p.etiqueta : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Tarjeta>

      <div className="mb-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Tarjeta titulo="Por método de pago" className="self-start">
          {metodos.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Sin ventas.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {metodos.map((m) => (
                <li key={m.metodo} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-zinc-800">{etiquetaMetodo(m.metodo)}</span>
                    <span className="tabular text-zinc-600">
                      {dinero(m.total)} · {totalMetodos > 0 ? Math.round((m.total / totalMetodos) * 100) : 0}%
                    </span>
                  </div>
                  <Barra valor={m.total} max={totalMetodos} />
                  <p className="text-xs text-zinc-500">
                    {m.ventas} {m.ventas === 1 ? "venta" : "ventas"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Por vendedor" className="self-start">
          {vendedores.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Sin ventas.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {vendedores.map((x) => (
                <li key={x.vendedor} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-zinc-800">{x.vendedor}</span>
                    <span className="tabular text-zinc-600">{dinero(x.total)}</span>
                  </div>
                  <Barra valor={x.total} max={maxVendedor} />
                  <p className="tabular text-xs text-zinc-500">
                    {x.ventas} {x.ventas === 1 ? "venta" : "ventas"} · ganancia {dinero(x.ganancia)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Por categoría" className="self-start">
          {categorias.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Sin ventas.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {categorias.map((c) => (
                <li key={c.categoria} className="space-y-1.5 px-4 py-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-zinc-800">{c.categoria}</span>
                    <span className="tabular text-zinc-600">{dinero(c.importe)}</span>
                  </div>
                  <Barra valor={c.importe} max={maxCategoria} />
                  <p className="tabular text-xs text-zinc-500">
                    {cantidad(c.vendidos)} vendidos · ganancia {dinero(c.ganancia)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo={`Productos vendidos (${productos.length})`} className="mb-6 overflow-hidden">
        {productos.length === 0 ? (
          <Vacio titulo="No se vendió nada en este periodo" />
        ) : (
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0">
                <tr>
                  <th className={thCls}>#</th>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Vendidos</th>
                  <th className={`${thCls} text-right`}>Devueltos</th>
                  <th className={`${thCls} text-right`}>Ventas netas</th>
                  <th className={`${thCls} text-right`}>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p, i) => (
                  <tr key={p.id}>
                    <td className={`${tdCls} text-xs text-zinc-400`}>{i + 1}</td>
                    <td className={tdCls}>
                      <Link href={`/productos/${p.id}`} className="group flex items-center gap-3">
                        <Miniatura imagen={p.imagen} alt="" tam={36} />
                        <span className="min-w-0">
                          <span className="block font-medium text-zinc-900 group-hover:text-teal-700">{p.nombre}</span>
                          <span className="block text-xs text-zinc-500">
                            <span className="font-mono">{p.codigo}</span>
                            {p.categoria && ` · ${p.categoria}`}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(p.vendidos)} {nombreUnidad(p.vendidos, p.unidad)}
                    </td>
                    <td className={`${tdCls} tabular text-right text-zinc-600`}>{p.devueltos > 0 ? cantidad(p.devueltos) : "—"}</td>
                    <td className={`${tdCls} tabular text-right font-medium`}>{dinero(p.importe)}</td>
                    <td className={`${tdCls} tabular text-right ${p.ganancia < 0 ? "text-red-700" : "text-zinc-600"}`}>
                      {dinero(p.ganancia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta
          titulo={`Sin ventas en el periodo (${sinVentas.length})`}
          acciones={sinVentas.length > 0 && <span className="tabular text-xs text-zinc-500">{dinero(valorQuieto)} a costo</span>}
          className="self-start overflow-hidden"
        >
          {sinVentas.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Todos los productos con stock tuvieron ventas.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0">
                  <tr>
                    <th className={thCls}>Producto</th>
                    <th className={`${thCls} text-right`}>Stock</th>
                    <th className={`${thCls} text-right`}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {sinVentas.map((p) => (
                    <tr key={p.id}>
                      <td className={tdCls}>
                        <Link href={`/productos/${p.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                          {p.nombre}
                        </Link>
                        <div className="text-xs text-zinc-500">
                          {p.ultima_venta ? `Última venta: ${fecha(p.ultima_venta, false)}` : "Nunca se vendió"}
                        </div>
                      </td>
                      <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                        {cantidad(p.stock)} {nombreUnidad(p.stock, p.unidad)}
                      </td>
                      <td className={`${tdCls} tabular text-right text-zinc-600`}>{dinero(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Inventario actual por categoría"
          acciones={<span className="tabular text-xs text-zinc-500">{dinero(inv.costo)} a costo</span>}
          className="self-start overflow-hidden"
        >
          {inventario.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Aún no hay productos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Categoría</th>
                    <th className={`${thCls} text-right`}>Productos</th>
                    <th className={`${thCls} text-right`}>A costo</th>
                    <th className={`${thCls} text-right`}>A precio de venta</th>
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((c) => (
                    <tr key={c.categoria}>
                      <td className={tdCls}>{c.categoria}</td>
                      <td className={`${tdCls} tabular text-right`}>{c.productos}</td>
                      <td className={`${tdCls} tabular text-right font-medium`}>{dinero(c.valor_costo)}</td>
                      <td className={`${tdCls} tabular text-right text-zinc-600`}>{dinero(c.valor_venta)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                      Total
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{dinero(inv.costo)}</td>
                    <td className="tabular px-4 py-3 text-right text-zinc-600">{dinero(inv.venta)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Las ventas netas descuentan las devoluciones y no incluyen ventas anuladas. La ganancia usa el costo que tenía cada
        producto al momento de venderse.{" "}
        <Link href="/ajustes" className="text-teal-700 hover:underline">
          Ver ajustes
        </Link>{" "}
        ·{" "}
        <Link href="/ventas" className="text-teal-700 hover:underline">
          Ver ventas
        </Link>
      </p>
    </>
  );
}
