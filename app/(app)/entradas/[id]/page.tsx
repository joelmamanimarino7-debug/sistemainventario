import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Miniatura } from "@/components/Foto";
import { btnPrimario, btnSecundario, tdCls, thCls } from "@/components/estilos";
import { Aviso, Dato, Encabezado, Tarjeta } from "@/components/ui";
import { obtenerEntrada } from "@/lib/data/entradas";
import { cantidad, dinero, fecha, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Entrada" };

export default async function EntradaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nueva?: string }>;
}) {
  await exigirAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const datos = obtenerEntrada(Number(id));
  if (!datos) notFound();
  const { entrada: e, detalle } = datos;

  return (
    <>
      <Encabezado
        titulo={`Entrada #${e.id}`}
        descripcion={fecha(e.creado_en)}
        volver={{ href: "/entradas", texto: "Entradas" }}
        acciones={
          <>
            <Link href={`/etiquetas?entrada=${e.id}`} className={btnSecundario}>
              ▥ Imprimir etiquetas
            </Link>
            <Link href="/entradas/nueva" className={btnPrimario}>
              + Nueva entrada
            </Link>
          </>
        }
      />
      {sp.nueva && (
        <div className="mb-4">
          <Aviso tipo="ok">Entrada registrada. El stock de los productos ya se actualizó.</Aviso>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Tarjeta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Cantidad</th>
                  <th className={`${thCls} text-right`}>Costo unit.</th>
                  <th className={`${thCls} text-right`}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => (
                  <tr key={d.id}>
                    <td className={tdCls}>
                      <Link href={`/productos/${d.producto_id}`} className="group flex items-center gap-3">
                        <Miniatura imagen={d.imagen} alt="" tam={40} className="print:hidden" />
                        <span>
                          <span className="block font-medium text-gris-900 group-hover:text-acento-700">{d.producto}</span>
                          <span className="block font-mono text-xs text-gris-500">{d.codigo}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(d.cantidad)} {nombreUnidad(d.cantidad, d.unidad)}
                    </td>
                    <td className={`${tdCls} tabular text-right`}>{dinero(d.costo_unitario)}</td>
                    <td className={`${tdCls} tabular text-right font-medium`}>{dinero(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right text-base font-semibold">{dinero(e.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Tarjeta>
        <Tarjeta titulo="Datos" className="self-start">
          <dl className="space-y-3 p-4">
            <Dato etiqueta="Proveedor">{e.proveedor}</Dato>
            <Dato etiqueta="Factura / remisión">{e.referencia}</Dato>
            <Dato etiqueta="Nota">{e.nota}</Dato>
            <Dato etiqueta="Registró">{e.usuario}</Dato>
          </dl>
        </Tarjeta>
      </div>
    </>
  );
}
