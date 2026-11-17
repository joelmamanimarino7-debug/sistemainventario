import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotonImprimir } from "@/components/BotonImprimir";
import { EtiquetaDiferencia } from "@/components/Caja";
import { CuentaEfectivo, TablaMovimientosCaja, TablaPorMetodo } from "@/components/ResumenCaja";
import { tdCls, thCls } from "@/components/estilos";
import { Aviso, Dato, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { movimientosDeCaja, obtenerCaja, resumenDeCaja, ventasDeCaja } from "@/lib/caja";
import { etiquetaMetodo } from "@/lib/config";
import { dinero, fecha } from "@/lib/format";
import { obtenerNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Cierre de caja" };

export default async function CierrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cerrada?: string }>;
}) {
  const yo = await exigirUsuario();
  const { id } = await params;
  const sp = await searchParams;
  const c = obtenerCaja(Number(id));
  if (!c) notFound();
  if (c.estado === "abierta") redirect("/caja");
  // El vendedor solo ve los turnos que abrió o cerró él.
  if (yo.rol !== "admin" && c.abierta_por !== yo.id && c.cerrada_por !== yo.id) redirect("/sin-permiso");

  const r = resumenDeCaja(c);
  const movimientos = movimientosDeCaja(c.id);
  const ventas = ventasDeCaja(c.id);
  const negocio = obtenerNegocio();

  return (
    <>
      <div className="print:hidden">
        <Encabezado
          titulo={`Cierre de caja #${c.id}`}
          descripcion={`${fecha(c.abierta_en)} → ${fecha(c.cerrada_en)}`}
          volver={yo.rol === "admin" ? { href: "/caja/historial", texto: "Historial de cierres" } : { href: "/caja", texto: "Caja" }}
          acciones={<BotonImprimir />}
        />
        {sp.cerrada && (
          <div className="mb-4">
            <Aviso tipo="ok">Caja cerrada. Se está guardando un respaldo de los datos.</Aviso>
          </div>
        )}
      </div>

      <div className="mb-4 hidden text-center print:block">
        <p className="font-display text-lg font-semibold">{negocio.nombre}</p>
        <p className="text-sm">
          Cierre de caja #{c.id} · {fecha(c.abierta_en)} → {fecha(c.cerrada_en)}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3 print:grid-cols-3">
        <Tarjeta className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500">Efectivo contado</p>
          <p className="tabular mt-1 font-display text-2xl font-semibold">{dinero(c.efectivo_contado)}</p>
          <p className="tabular mt-0.5 text-xs text-gris-500">Debería haber {dinero(c.efectivo_esperado)}</p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500">Resultado</p>
          <p className="mt-2 text-lg">
            <EtiquetaDiferencia diferencia={c.diferencia ?? 0} />
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500">Ventas netas del turno</p>
          <p className="tabular mt-1 font-display text-2xl font-semibold">{dinero(r.totalVentas - r.totalDevoluciones)}</p>
          <p className="tabular mt-0.5 text-xs text-gris-500">{r.numVentas} ventas</p>
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] print:block print:space-y-4">
        <div className="space-y-6">
          <Tarjeta titulo="Por método de pago" className="overflow-hidden">
            <TablaPorMetodo r={r} />
          </Tarjeta>
          {movimientos.length > 0 && (
            <Tarjeta titulo="Entradas y salidas de efectivo" className="overflow-hidden">
              <TablaMovimientosCaja movimientos={movimientos} />
            </Tarjeta>
          )}
          <Tarjeta titulo="Ventas del turno" className="overflow-hidden print:hidden">
            {ventas.length === 0 ? (
              <Vacio titulo="No hubo ventas en este turno" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className={thCls}>Folio</th>
                      <th className={thCls}>Hora</th>
                      <th className={thCls}>Pago</th>
                      <th className={thCls}>Vendedor</th>
                      <th className={`${thCls} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => (
                      <tr key={v.id}>
                        <td className={tdCls}>
                          <Link href={`/ventas/${v.id}`} className="font-medium text-acento-700 hover:underline">
                            #{v.id}
                          </Link>
                          {v.estado !== "completada" && (
                            <span className="ml-2">
                              <Etiqueta tono="rojo">Anulada</Etiqueta>
                            </span>
                          )}
                          {v.devuelto > 0 && (
                            <span className="ml-2">
                              <Etiqueta tono="ambar">Devolución</Etiqueta>
                            </span>
                          )}
                        </td>
                        <td className={`${tdCls} text-gris-600`}>{fecha(v.creado_en).slice(-5)}</td>
                        <td className={tdCls}>{etiquetaMetodo(v.metodo_pago)}</td>
                        <td className={tdCls}>{v.vendedor ?? "—"}</td>
                        <td className={`${tdCls} tabular text-right font-medium`}>{dinero(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
        </div>
        <div className="space-y-6">
          <Tarjeta titulo="Efectivo">
            <CuentaEfectivo r={r} />
            <div className="flex justify-between gap-3 border-t border-gris-100 px-4 py-3 text-sm">
              <span className="font-semibold">Contado</span>
              <span className="tabular font-semibold">{dinero(c.efectivo_contado)}</span>
            </div>
          </Tarjeta>
          <Tarjeta titulo="Datos del turno">
            <dl className="grid grid-cols-2 gap-4 p-4">
              <Dato etiqueta="Abrió">{c.abierta_por_nombre}</Dato>
              <Dato etiqueta="Cerró">{c.cerrada_por_nombre}</Dato>
              <Dato etiqueta="Apertura">{fecha(c.abierta_en)}</Dato>
              <Dato etiqueta="Cierre">{fecha(c.cerrada_en)}</Dato>
              <div className="col-span-2">
                <Dato etiqueta="Nota">{c.nota_cierre}</Dato>
              </div>
            </dl>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
