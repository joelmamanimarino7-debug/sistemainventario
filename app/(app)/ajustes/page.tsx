import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "@/components/estilos";
import { Paginacion } from "@/components/Paginacion";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import { listarAjustes } from "@/lib/data/ajustes";
import { dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Ajustes" };

type SP = { desde?: string; hasta?: string; pagina?: string };

export default async function AjustesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const { ajustes, total } = listarAjustes({ desde: sp.desde, hasta: sp.hasta, pagina });
  const hayFiltros = !!(sp.desde || sp.hasta);

  return (
    <>
      <Encabezado
        titulo="Ajustes de inventario"
        descripcion="Correcciones de stock por conteo físico, roturas, pérdidas, uso interno, etc."
        acciones={
          <Link href="/ajustes/nuevo" className={btnPrimario}>
            + Nuevo ajuste
          </Link>
        }
      />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm text-tierra-600">
          Desde
          <input type="date" name="desde" defaultValue={sp.desde} className={`${inputCls} mt-1`} />
        </label>
        <label className="text-sm text-tierra-600">
          Hasta
          <input type="date" name="hasta" defaultValue={sp.hasta} className={`${inputCls} mt-1`} />
        </label>
        <button className={btnSecundario}>Filtrar</button>
        {hayFiltros && (
          <Link href="/ajustes" className={btnSecundario}>
            Limpiar
          </Link>
        )}
      </form>
      <Tarjeta className="overflow-hidden">
        {ajustes.length === 0 ? (
          <Vacio
            titulo={hayFiltros ? "No hay ajustes en ese periodo" : "Aún no hay ajustes"}
            texto="Usa un ajuste cuando el stock del sistema no coincide con lo que hay en el local."
            accion={
              <Link href="/ajustes/nuevo" className={btnPrimario}>
                Registrar ajuste
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
                    <th className={thCls}>Motivo</th>
                    <th className={`${thCls} text-right`}>Productos</th>
                    <th className={`${thCls} text-right`}>Valor a costo</th>
                  </tr>
                </thead>
                <tbody>
                  {ajustes.map((a) => (
                    <tr key={a.id} className="hover:bg-tierra-50">
                      <td className={tdCls}>
                        <Link href={`/ajustes/${a.id}`} className="font-medium text-acento-700 hover:underline">
                          #{a.id}
                        </Link>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>{fecha(a.creado_en)}</td>
                      <td className={tdCls}>
                        {a.motivo}
                        {a.nota && <div className="text-xs text-tierra-500">{a.nota}</div>}
                      </td>
                      <td className={`${tdCls} tabular text-right`}>{a.productos}</td>
                      <td className={`${tdCls} tabular text-right font-medium ${a.valor < 0 ? "text-red-700" : ""}`}>
                        {dinero(a.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion ruta="/ajustes" params={{ desde: sp.desde, hasta: sp.hasta }} pagina={pagina} total={total} porPagina={50} />
          </>
        )}
      </Tarjeta>
    </>
  );
}
