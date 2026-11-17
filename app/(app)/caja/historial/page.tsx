import type { Metadata } from "next";
import Link from "next/link";
import { EtiquetaDiferencia } from "@/components/Caja";
import { Paginacion } from "@/components/Paginacion";
import { tdCls, thCls } from "@/components/estilos";
import { Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth";
import { listarCajas, resumenDeCaja } from "@/lib/caja";
import { dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Historial de caja" };

export default async function HistorialCajaPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  await exigirAdmin();
  const pagina = Math.max(1, Number((await searchParams).pagina) || 1);
  const { cajas, total } = listarCajas(pagina);
  const faltantes = cajas.filter((c) => (c.diferencia ?? 0) < 0).reduce((s, c) => s + (c.diferencia ?? 0), 0);

  return (
    <>
      <Encabezado
        titulo="Historial de cierres"
        descripcion={`${total} ${total === 1 ? "turno" : "turnos"} de caja${faltantes < 0 ? ` · faltantes en esta página: ${dinero(-faltantes)}` : ""}`}
        volver={{ href: "/caja", texto: "Caja" }}
      />
      <Tarjeta className="overflow-hidden">
        {cajas.length === 0 ? (
          <Vacio titulo="Todavía no hay turnos de caja" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Apertura</th>
                    <th className={thCls}>Cierre</th>
                    <th className={`${thCls} text-right`}>Ventas netas</th>
                    <th className={`${thCls} text-right`}>Esperado</th>
                    <th className={`${thCls} text-right`}>Contado</th>
                    <th className={`${thCls} text-right`}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {cajas.map((c) => {
                    const r = resumenDeCaja(c);
                    return (
                      <tr key={c.id} className="hover:bg-tierra-50">
                        <td className={tdCls}>
                          <Link href={c.estado === "abierta" ? "/caja" : `/caja/${c.id}`} className="font-medium text-acento-700 hover:underline">
                            #{c.id}
                          </Link>
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          {fecha(c.abierta_en)}
                          <div className="text-xs text-tierra-500">{c.abierta_por_nombre}</div>
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          {c.estado === "abierta" ? (
                            <Etiqueta tono="verde">Abierta</Etiqueta>
                          ) : (
                            <>
                              {fecha(c.cerrada_en)}
                              <div className="text-xs text-tierra-500">{c.cerrada_por_nombre}</div>
                            </>
                          )}
                        </td>
                        <td className={`${tdCls} tabular text-right`}>{dinero(r.totalVentas - r.totalDevoluciones)}</td>
                        <td className={`${tdCls} tabular text-right text-tierra-600`}>{c.estado === "cerrada" ? dinero(c.efectivo_esperado) : "—"}</td>
                        <td className={`${tdCls} tabular text-right`}>{c.estado === "cerrada" ? dinero(c.efectivo_contado) : "—"}</td>
                        <td className={`${tdCls} whitespace-nowrap text-right`}>
                          {c.estado === "cerrada" ? <EtiquetaDiferencia diferencia={c.diferencia ?? 0} /> : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginacion ruta="/caja/historial" params={{}} pagina={pagina} total={total} porPagina={30} />
          </>
        )}
      </Tarjeta>
    </>
  );
}
