import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "@/components/estilos";
import { Paginacion } from "@/components/Paginacion";
import { Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { etiquetaMetodo, METODOS_PAGO } from "@/lib/config";
import { listarVentas } from "@/lib/data/ventas";
import { cantidad, dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Ventas" };

type SP = { desde?: string; hasta?: string; metodo?: string; pagina?: string };

export default async function VentasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const metodo = METODOS_PAGO.some((m) => m.valor === sp.metodo) ? sp.metodo : undefined;
  const { ventas, total, importe } = listarVentas({ desde: sp.desde, hasta: sp.hasta, metodo, pagina });
  const hayFiltros = !!(sp.desde || sp.hasta || metodo);

  return (
    <>
      <Encabezado
        titulo="Ventas"
        descripcion={`${total} ${total === 1 ? "venta" : "ventas"} · ${dinero(importe)}${hayFiltros ? " en el periodo filtrado" : " en total"}`}
        acciones={
          <>
            <a
              href={`/api/exportar/ventas?${new URLSearchParams(
                Object.entries({ desde: sp.desde ?? "", hasta: sp.hasta ?? "" }).filter(([, v]) => v),
              )}`}
              download
              className={btnSecundario}
            >
              ⇩ Excel
            </a>
            <Link href="/ventas/nueva" className={btnPrimario}>
              + Nueva venta
            </Link>
          </>
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm text-zinc-600">
          Desde
          <input type="date" name="desde" defaultValue={sp.desde} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm text-zinc-600">
          Hasta
          <input type="date" name="hasta" defaultValue={sp.hasta} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm text-zinc-600">
          Método
          <select name="metodo" defaultValue={metodo ?? ""} className={`${inputCls} mt-1`}>
            <option value="">Todos</option>
            {METODOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <button className={btnSecundario}>Filtrar</button>
        {hayFiltros && (
          <Link href="/ventas" className={btnSecundario}>
            Limpiar
          </Link>
        )}
      </form>
      <Tarjeta className="overflow-hidden">
        {ventas.length === 0 ? (
          <Vacio
            titulo={hayFiltros ? "No hay ventas en ese periodo" : "Aún no hay ventas"}
            accion={
              <Link href="/ventas/nueva" className={btnPrimario}>
                Registrar venta
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Folio</th>
                    <th className={thCls}>Fecha</th>
                    <th className={thCls}>Cliente</th>
                    <th className={thCls}>Pago</th>
                    <th className={`${thCls} text-right`}>Artículos</th>
                    <th className={`${thCls} text-right`}>Total</th>
                    <th className={`${thCls} text-right`}>Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50">
                      <td className={tdCls}>
                        <Link href={`/ventas/${v.id}`} className="font-medium text-teal-700 hover:underline">
                          #{v.id}
                        </Link>
                        {v.estado === "cancelada" && (
                          <span className="ml-2">
                            <Etiqueta tono="rojo">Anulada</Etiqueta>
                          </span>
                        )}
                        {v.devuelto > 0 && (
                          <span className="ml-2">
                            <Etiqueta tono="teal">Devolución {dinero(v.devuelto)}</Etiqueta>
                          </span>
                        )}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>{fecha(v.creado_en)}</td>
                      <td className={tdCls}>{v.cliente ?? <span className="text-zinc-400">—</span>}</td>
                      <td className={tdCls}>{etiquetaMetodo(v.metodo_pago)}</td>
                      <td className={`${tdCls} tabular text-right`}>{cantidad(v.unidades)}</td>
                      <td className={`${tdCls} tabular text-right font-medium`}>{dinero(v.total)}</td>
                      <td className={`${tdCls} tabular text-right text-zinc-600`}>
                        {v.estado === "cancelada" ? "—" : dinero(v.total - v.costo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion ruta="/ventas" params={{ desde: sp.desde, hasta: sp.hasta, metodo }} pagina={pagina} total={total} porPagina={50} />
          </>
        )}
      </Tarjeta>
    </>
  );
}
