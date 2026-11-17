import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "@/components/estilos";
import { Paginacion } from "@/components/Paginacion";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { listarEntradas } from "@/lib/data/entradas";
import { cantidad, dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Entradas" };

type SP = { desde?: string; hasta?: string; pagina?: string };

export default async function EntradasPage({ searchParams }: { searchParams: Promise<SP> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const { entradas, total } = listarEntradas({ desde: sp.desde, hasta: sp.hasta, pagina });

  return (
    <>
      <Encabezado
        titulo="Entradas de mercancía"
        descripcion="Compras y reabastecimientos registrados."
        acciones={
          <Link href="/entradas/nueva" className={btnPrimario}>
            + Nueva entrada
          </Link>
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
        <button className={btnSecundario}>Filtrar</button>
        {(sp.desde || sp.hasta) && (
          <Link href="/entradas" className={btnSecundario}>
            Limpiar
          </Link>
        )}
      </form>
      <Tarjeta className="overflow-hidden">
        {entradas.length === 0 ? (
          <Vacio
            titulo="No hay entradas registradas"
            accion={
              <Link href="/entradas/nueva" className={btnPrimario}>
                Registrar entrada
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
                    <th className={thCls}>Proveedor</th>
                    <th className={thCls}>Factura</th>
                    <th className={`${thCls} text-right`}>Productos</th>
                    <th className={`${thCls} text-right`}>Unidades</th>
                    <th className={`${thCls} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {entradas.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50">
                      <td className={tdCls}>
                        <Link href={`/entradas/${e.id}`} className="font-medium text-teal-700 hover:underline">
                          #{e.id}
                        </Link>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>{fecha(e.creado_en)}</td>
                      <td className={tdCls}>{e.proveedor ?? <span className="text-zinc-400">—</span>}</td>
                      <td className={tdCls}>{e.referencia ?? <span className="text-zinc-400">—</span>}</td>
                      <td className={`${tdCls} tabular text-right`}>{e.renglones}</td>
                      <td className={`${tdCls} tabular text-right`}>{cantidad(e.piezas)}</td>
                      <td className={`${tdCls} tabular text-right font-medium`}>{dinero(e.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion ruta="/entradas" params={{ desde: sp.desde, hasta: sp.hasta }} pagina={pagina} total={total} porPagina={50} />
          </>
        )}
      </Tarjeta>
    </>
  );
}
