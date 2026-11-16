import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Miniatura } from "@/components/Foto";
import { BotonImprimir } from "@/components/BotonImprimir";
import { btnPrimario, tdCls, thCls } from "@/components/estilos";
import { Dato, Encabezado, Etiqueta, Tarjeta } from "@/components/ui";
import { CONFIG, etiquetaMetodo } from "@/lib/config";
import { obtenerVenta } from "@/lib/data/ventas";
import { cantidad, dinero, fecha, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Venta" };

export default async function VentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = obtenerVenta(Number(id));
  if (!datos) notFound();
  const { venta: v, detalle } = datos;
  const ganancia = v.total - v.costo;

  return (
    <>
      <div className="print:hidden">
        <Encabezado
          titulo={
            <span className="flex items-center gap-2">
              Venta #{v.id}
              {v.estado === "cancelada" && <Etiqueta tono="rojo">Cancelada</Etiqueta>}
            </span>
          }
          descripcion={fecha(v.creado_en)}
          volver={{ href: "/ventas", texto: "Ventas" }}
          acciones={
            <>
              <BotonImprimir />
              <Link href="/ventas/nueva" className={btnPrimario}>
                + Nueva venta
              </Link>
            </>
          }
        />
      </div>

      {/* Encabezado que solo aparece al imprimir */}
      <div className="mb-4 hidden text-center print:block">
        <p className="text-lg font-semibold">{CONFIG.nombreNegocio}</p>
        <p className="text-sm">
          Venta #{v.id} · {fecha(v.creado_en)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] print:block">
        <Tarjeta className="overflow-hidden print:border-0 print:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Cant.</th>
                  <th className={`${thCls} text-right`}>Precio</th>
                  <th className={`${thCls} text-right`}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => (
                  <tr key={d.id}>
                    <td className={tdCls}>
                      <Link href={`/productos/${d.producto_id}`} className="group flex items-center gap-3">
                        <Miniatura imagen={d.imagen} alt="" tam={40} className="print:hidden" />
                        <span>
                          <span className="block font-medium text-zinc-900 group-hover:text-teal-700">{d.producto}</span>
                          <span className="block font-mono text-xs text-zinc-500">{d.codigo}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(d.cantidad)} {nombreUnidad(d.cantidad, d.unidad)}
                    </td>
                    <td className={`${tdCls} tabular text-right`}>{dinero(d.precio_unitario)}</td>
                    <td className={`${tdCls} tabular text-right font-medium`}>{dinero(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-sm">
                {v.descuento > 0 && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-4 pt-3 text-right text-zinc-600">
                        Subtotal
                      </td>
                      <td className="tabular px-4 pt-3 text-right">{dinero(v.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 text-right text-zinc-600">
                        Descuento
                      </td>
                      <td className="tabular px-4 text-right">−{dinero(v.descuento)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right text-base font-semibold">{dinero(v.total)}</td>
                </tr>
                {v.pago_con != null && (
                  <>
                    <tr>
                      <td colSpan={3} className="px-4 text-right text-zinc-600">
                        Pagó con
                      </td>
                      <td className="tabular px-4 text-right">{dinero(v.pago_con)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 pb-3 text-right text-zinc-600">
                        Cambio
                      </td>
                      <td className="tabular px-4 pb-3 text-right">{dinero(v.pago_con - v.total)}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Datos" className="self-start print:hidden">
          <dl className="space-y-3 p-4">
            <Dato etiqueta="Método de pago">{etiquetaMetodo(v.metodo_pago)}</Dato>
            <Dato etiqueta="Cliente">{v.cliente}</Dato>
            <Dato etiqueta="Nota">{v.nota}</Dato>
            <Dato etiqueta="Ganancia de la venta">
              <span className={`tabular ${ganancia < 0 ? "text-red-600" : ""}`}>{dinero(ganancia)}</span>
            </Dato>
          </dl>
        </Tarjeta>
      </div>
      <p className="mt-6 hidden text-center text-sm print:block">¡Gracias por su compra!</p>
    </>
  );
}
