import Link from "next/link";
import { btnPrimario, btnSecundario, tdCls, thCls } from "@/components/estilos";
import { EstadoStock } from "@/components/EstadoStock";
import { Miniatura } from "@/components/Foto";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { CONFIG } from "@/lib/config";
import { resumenInicio } from "@/lib/data/dashboard";
import { cantidad, dinero, nombreUnidad } from "@/lib/format";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function Indicador({ titulo, valor, detalle, href }: { titulo: string; valor: string; detalle?: string; href?: string }) {
  const contenido = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{titulo}</p>
      <p className="tabular mt-1 text-2xl font-semibold text-zinc-900">{valor}</p>
      {detalle && <p className="tabular mt-0.5 text-xs text-zinc-500">{detalle}</p>}
    </>
  );
  return (
    <Tarjeta className="p-4">
      {href ? (
        <Link href={href} className="block">
          {contenido}
        </Link>
      ) : (
        contenido
      )}
    </Tarjeta>
  );
}

export default function InicioPage() {
  const r = resumenInicio();
  const maxDia = Math.max(1, ...r.dias.map((d) => d.total));

  return (
    <>
      <Encabezado
        titulo="Inicio"
        descripcion={CONFIG.nombreNegocio}
        acciones={
          <>
            <Link href="/entradas/nueva" className={btnSecundario}>
              ↓ Registrar entrada
            </Link>
            <Link href="/ventas/nueva" className={btnPrimario}>
              + Nueva venta
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador
          titulo="Ventas de hoy"
          valor={dinero(r.hoy.netas)}
          detalle={`${r.hoy.ventas} ${r.hoy.ventas === 1 ? "venta" : "ventas"} · ganancia ${dinero(r.hoy.ganancia)}`}
          href="/ventas"
        />
        <Indicador
          titulo="Ventas del mes"
          valor={dinero(r.mes.netas)}
          detalle={`${r.mes.ventas} ventas · ganancia ${dinero(r.mes.ganancia)}`}
          href="/reportes"
        />
        <Indicador
          titulo="Valor del inventario"
          valor={dinero(r.inventario.valor_costo)}
          detalle={`A precio de venta: ${dinero(r.inventario.valor_venta)}`}
        />
        <Indicador
          titulo="Productos activos"
          valor={String(r.inventario.productos)}
          detalle={`${r.inventario.bajos} con stock bajo · ${r.inventario.agotados} agotados`}
          href="/productos"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Tarjeta
          titulo={
            <span className="flex items-center gap-2">
              Productos por reabastecer
              {r.inventario.bajos > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {r.inventario.bajos}
                </span>
              )}
            </span>
          }
          acciones={
            r.inventario.bajos > r.stockBajo.length ? (
              <Link href="/productos?estado=bajo" className="text-sm text-teal-700 hover:underline">
                Ver todos
              </Link>
            ) : null
          }
          className="self-start overflow-hidden"
        >
          {r.stockBajo.length === 0 ? (
            <Vacio titulo="Todo en orden" texto="Ningún producto está por debajo de su stock mínimo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Producto</th>
                    <th className={`${thCls} text-right`}>Stock</th>
                    <th className={`${thCls} text-right`}>Mínimo</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {r.stockBajo.map((p) => (
                    <tr key={p.id}>
                      <td className={tdCls}>
                        <Link href={`/productos/${p.id}`} className="group flex items-center gap-3">
                          <Miniatura imagen={p.imagen} alt="" tam={40} />
                          <span className="min-w-0">
                            <span className="block font-medium text-zinc-900 group-hover:text-teal-700">{p.nombre}</span>
                            <span className="block text-xs text-zinc-500">
                              <span className="font-mono">{p.codigo}</span>
                              {p.proveedor && ` · ${p.proveedor}`}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                        <span className="font-medium">{cantidad(p.stock)}</span>{" "}
                        <span className="text-xs text-zinc-500">{nombreUnidad(p.stock, p.unidad)}</span>
                        <div>
                          <EstadoStock stock={p.stock} minimo={p.stock_minimo} />
                        </div>
                      </td>
                      <td className={`${tdCls} tabular text-right text-zinc-600`}>{cantidad(p.stock_minimo)}</td>
                      <td className={`${tdCls} text-right`}>
                        <Link href={`/entradas/nueva?producto=${p.id}`} className="whitespace-nowrap text-sm text-teal-700 hover:underline">
                          Reabastecer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <div className="space-y-6">
          <Tarjeta titulo="Ventas de los últimos 7 días">
            <div className="flex h-44 items-end gap-2 px-4 pb-3 pt-6">
              {r.dias.map((d) => {
                const alto = d.total > 0 ? Math.max(4, Math.round((d.total / maxDia) * 100)) : 0;
                const [y, m, dd] = d.dia.split("-").map(Number);
                const nombreDia = DIAS[new Date(y, m - 1, dd).getDay()];
                return (
                  <div key={d.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="group relative w-full max-w-10 rounded-t bg-teal-600"
                      style={{ height: `${alto}%`, minHeight: d.total > 0 ? 4 : 0 }}
                      title={`${dd}/${m}: ${dinero(d.total)} (${d.ventas} ventas)`}
                    />
                    {d.total === 0 && <div className="h-0.5 w-full max-w-10 rounded bg-zinc-200" />}
                    <span className="text-[11px] text-zinc-500">{nombreDia}</span>
                  </div>
                );
              })}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Más vendidos (30 días)">
            {r.masVendidos.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">Aún no hay ventas en este periodo.</p>
            ) : (
              <ol className="divide-y divide-zinc-100">
                {r.masVendidos.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-4 text-xs text-zinc-400">{i + 1}</span>
                      <Miniatura imagen={p.imagen} alt="" tam={32} />
                      <Link href={`/productos/${p.id}`} className="truncate font-medium text-zinc-900 hover:text-teal-700">
                        {p.nombre}
                      </Link>
                    </span>
                    <span className="tabular shrink-0 text-zinc-600">
                      {cantidad(p.cantidad)} {nombreUnidad(p.cantidad, p.unidad)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
