import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Miniatura } from "@/components/Foto";
import { btnPrimario, tdCls, thCls } from "@/components/estilos";
import { Aviso, Dato, Encabezado, Tarjeta } from "@/components/ui";
import { obtenerAjuste } from "@/lib/data/ajustes";
import { cantidad, dinero, fecha, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Ajuste" };

export default async function AjustePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  await exigirAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const datos = obtenerAjuste(Number(id));
  if (!datos) notFound();
  const { ajuste: a, detalle } = datos;

  return (
    <>
      <Encabezado
        titulo={`Ajuste #${a.id}`}
        descripcion={fecha(a.creado_en)}
        volver={{ href: "/ajustes", texto: "Ajustes" }}
        acciones={
          <Link href="/ajustes/nuevo" className={btnPrimario}>
            + Nuevo ajuste
          </Link>
        }
      />
      {sp.nuevo && (
        <div className="mb-4">
          <Aviso tipo="ok">Ajuste registrado. El stock de los productos ya se corrigió.</Aviso>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Tarjeta className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Antes</th>
                  <th className={`${thCls} text-right`}>Después</th>
                  <th className={`${thCls} text-right`}>Diferencia</th>
                  <th className={`${thCls} text-right`}>Valor a costo</th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((d) => (
                  <tr key={d.id}>
                    <td className={tdCls}>
                      <Link href={`/productos/${d.producto_id}`} className="group flex items-center gap-3">
                        <Miniatura imagen={d.imagen} alt="" tam={40} />
                        <span>
                          <span className="block font-medium text-gris-900 group-hover:text-acento-700">{d.producto}</span>
                          <span className="block font-mono text-xs text-gris-500">{d.codigo}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${tdCls} tabular text-right text-gris-600`}>{cantidad(d.stock_anterior)}</td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(d.stock_nuevo)} <span className="text-xs text-gris-500">{nombreUnidad(d.stock_nuevo, d.unidad)}</span>
                    </td>
                    <td
                      className={`${tdCls} tabular text-right font-medium ${d.diferencia > 0 ? "text-oliva-700" : "text-red-700"}`}
                    >
                      {d.diferencia > 0 ? "+" : ""}
                      {cantidad(d.diferencia)}
                    </td>
                    <td className={`${tdCls} tabular text-right`}>{dinero(Math.round(d.diferencia * d.costo_unitario))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className={`tabular px-4 py-3 text-right text-base font-semibold ${a.valor < 0 ? "text-red-700" : ""}`}>
                    {dinero(a.valor)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Tarjeta>
        <Tarjeta titulo="Datos" className="self-start">
          <dl className="space-y-3 p-4">
            <Dato etiqueta="Motivo">{a.motivo}</Dato>
            <Dato etiqueta="Nota">{a.nota && <span className="whitespace-pre-line">{a.nota}</span>}</Dato>
            <Dato etiqueta="Registró">{a.usuario}</Dato>
          </dl>
        </Tarjeta>
      </div>
    </>
  );
}
