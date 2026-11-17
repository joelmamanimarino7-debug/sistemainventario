import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { anularVenta } from "@/app/actions/devoluciones";
import { BotonConfirmar } from "@/components/botones";
import { Miniatura } from "@/components/Foto";
import { btnPeligro, btnPrimario, btnSecundario, tdCls, thCls } from "@/components/estilos";
import { Aviso, Dato, Encabezado, Etiqueta, Tarjeta } from "@/components/ui";
import { etiquetaMetodo } from "@/lib/config";
import { obtenerNegocio } from "@/lib/negocio";
import { obtenerVenta } from "@/lib/data/ventas";
import { cantidad, dinero, fecha, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Venta" };

export default async function VentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ devolucion?: string }>;
}) {
  const yo = await exigirUsuario();
  const admin = yo.rol === "admin";
  const negocio = obtenerNegocio();
  const { id } = await params;
  const sp = await searchParams;
  const datos = obtenerVenta(Number(id));
  if (!datos) notFound();
  const { venta: v, detalle, devoluciones } = datos;
  // Lo devuelto resta ingreso; si el producto volvió al stock, su costo se recupera.
  const perdidaDevoluciones = devoluciones
    .flatMap((dv) => dv.renglones)
    .reduce((s, r) => s + r.importe - (r.reingresa ? Math.round(r.cantidad * r.costo_unitario) : 0), 0);
  const ganancia = v.total - v.costo - perdidaDevoluciones;
  const completada = v.estado === "completada";
  const quedaPorDevolver = detalle.some((d) => d.devuelto < d.cantidad);

  return (
    <>
      <div className="print:hidden">
        <Encabezado
          titulo={
            <span className="flex items-center gap-2">
              Venta #{v.id}
              {v.estado === "cancelada" && <Etiqueta tono="rojo">Anulada</Etiqueta>}
              {devoluciones.length > 0 && <Etiqueta tono="acento">Con devolución</Etiqueta>}
            </span>
          }
          descripcion={fecha(v.creado_en)}
          volver={{ href: "/ventas", texto: "Ventas" }}
          acciones={
            <>
              <a href={`/ticket/${v.id}?imprimir=1`} target="_blank" rel="noopener" className={btnSecundario}>
                🖨 Imprimir ticket
              </a>
              {completada && quedaPorDevolver && (
                <Link href={`/ventas/${v.id}/devolucion`} className={btnSecundario}>
                  ↩ Registrar devolución
                </Link>
              )}
              {admin && completada && devoluciones.length === 0 && (
                <form action={anularVenta}>
                  <input type="hidden" name="id" value={v.id} />
                  <BotonConfirmar
                    className={btnPeligro}
                    mensaje={`¿Anular la venta #${v.id}?\n\nÚsalo solo si la venta se registró por error: todos los productos vuelven al stock y la venta deja de contar en los totales. No se puede deshacer.`}
                  >
                    Anular venta
                  </BotonConfirmar>
                </form>
              )}
              <Link href="/ventas/nueva" className={btnPrimario}>
                + Nueva venta
              </Link>
            </>
          }
        />
      </div>

      {sp.devolucion && (
        <div className="mb-4 print:hidden">
          <Aviso tipo="ok">Devolución registrada. Lo que volvió en buen estado ya se sumó al stock.</Aviso>
        </div>
      )}
      {v.estado === "cancelada" && (
        <div className="mb-4 print:hidden">
          <Aviso tipo="error">Esta venta fue anulada: sus productos volvieron al stock y no cuenta en los totales.</Aviso>
        </div>
      )}

      {/* Encabezado que solo aparece al imprimir */}
      <div className="mb-4 hidden text-center print:block">
        <p className="text-lg font-semibold">{negocio.nombre}</p>
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
                          <span className="block font-medium text-tierra-900 group-hover:text-acento-700">{d.producto}</span>
                          <span className="block font-mono text-xs text-tierra-500">{d.codigo}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(d.cantidad)} {nombreUnidad(d.cantidad, d.unidad)}
                      {d.devuelto > 0 && (
                        <div className="text-xs text-acento-700 print:hidden">devuelto {cantidad(d.devuelto)}</div>
                      )}
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
                      <td colSpan={3} className="px-4 pt-3 text-right text-tierra-600">
                        Subtotal
                      </td>
                      <td className="tabular px-4 pt-3 text-right">{dinero(v.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 text-right text-tierra-600">
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
                      <td colSpan={3} className="px-4 text-right text-tierra-600">
                        Pagó con
                      </td>
                      <td className="tabular px-4 text-right">{dinero(v.pago_con)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 pb-3 text-right text-tierra-600">
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

        <div className="space-y-6 self-start print:hidden">
          <Tarjeta titulo="Datos">
            <dl className="space-y-3 p-4">
              <Dato etiqueta="Método de pago">{etiquetaMetodo(v.metodo_pago)}</Dato>
              <Dato etiqueta="Cliente">{v.cliente}</Dato>
              <Dato etiqueta="Nota">{v.nota}</Dato>
              {v.devuelto > 0 && (
                <Dato etiqueta="Devuelto al cliente">
                  <span className="tabular">{dinero(v.devuelto)}</span>
                </Dato>
              )}
              <Dato etiqueta="Vendedor">{v.vendedor}</Dato>
              {admin && completada && (
                <Dato etiqueta={devoluciones.length ? "Ganancia (descontando devoluciones)" : "Ganancia de la venta"}>
                  <span className={`tabular ${ganancia < 0 ? "text-red-600" : ""}`}>{dinero(ganancia)}</span>
                </Dato>
              )}
            </dl>
          </Tarjeta>

          {devoluciones.map((dv) => (
            <Tarjeta key={dv.id} titulo={`Devolución #${dv.id}`} acciones={<span className="text-xs text-tierra-500">{fecha(dv.creado_en)}</span>}>
              <div className="space-y-2 p-4 text-sm">
                <p className="text-tierra-700">
                  {dv.motivo}
                  {dv.usuario && <span className="block text-xs text-tierra-500">Registró: {dv.usuario}</span>}
                  {dv.nota && <span className="block text-xs text-tierra-500">{dv.nota}</span>}
                </p>
                <ul className="space-y-1">
                  {dv.renglones.map((r, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {cantidad(r.cantidad)} × {r.producto}
                        {!r.reingresa && <span className="ml-1 text-xs text-red-600">(dañado)</span>}
                      </span>
                      <span className="tabular text-tierra-600">{dinero(r.importe)}</span>
                    </li>
                  ))}
                </ul>
                <p className="flex justify-between border-t border-tierra-100 pt-2 font-medium">
                  <span>Devuelto</span>
                  <span className="tabular">{dinero(dv.total)}</span>
                </p>
              </div>
            </Tarjeta>
          ))}
        </div>
      </div>
      <p className="mt-6 hidden text-center text-sm print:block">{negocio.mensajeTicket}</p>
    </>
  );
}
