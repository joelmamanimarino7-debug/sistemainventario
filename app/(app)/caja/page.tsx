import type { Metadata } from "next";
import Link from "next/link";
import { FormAbrirCaja, FormCerrarCaja, FormMovimientoCaja } from "@/components/Caja";
import { CuentaEfectivo, TablaMovimientosCaja, TablaPorMetodo } from "@/components/ResumenCaja";
import { btnSecundario } from "@/components/estilos";
import { Encabezado, Tarjeta } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { cajaAbierta, calcularResumen, movimientosDeCaja, ultimoCierre } from "@/lib/caja";
import { dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Caja" };

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <Tarjeta className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500">{titulo}</p>
      <p className="tabular mt-1 font-display text-2xl font-semibold text-gris-900">{valor}</p>
      {detalle && <p className="tabular mt-0.5 text-xs text-gris-500">{detalle}</p>}
    </Tarjeta>
  );
}

export default async function CajaPage() {
  const yo = await exigirUsuario();
  const admin = yo.rol === "admin";
  const caja = cajaAbierta();
  const historial = admin ? (
    <Link href="/caja/historial" className={btnSecundario}>
      Historial de cierres
    </Link>
  ) : null;

  if (!caja) {
    const ultimo = ultimoCierre();
    return (
      <>
        <Encabezado titulo="Caja" descripcion="La caja está cerrada. Ábrela para empezar a vender." acciones={historial} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Tarjeta titulo="Abrir caja" className="self-start">
            <div className="p-4">
              <FormAbrirCaja />
            </div>
          </Tarjeta>
          {ultimo && (
            <Tarjeta titulo="Último cierre" className="self-start">
              <div className="space-y-1 p-4 text-sm text-gris-700">
                <p>
                  {fecha(ultimo.cerrada_en)} · cerró {ultimo.cerrada_por_nombre ?? "—"}
                </p>
                <p>
                  Efectivo contado: <span className="tabular font-medium">{dinero(ultimo.efectivo_contado)}</span>
                </p>
                <Link href={`/caja/${ultimo.id}`} className="inline-block pt-1 text-acento-700 hover:underline">
                  Ver el cierre →
                </Link>
              </div>
            </Tarjeta>
          )}
        </div>
      </>
    );
  }

  const r = calcularResumen(caja.id, caja.monto_inicial);
  const movimientos = movimientosDeCaja(caja.id);
  const neto = r.totalVentas - r.totalDevoluciones;

  return (
    <>
      <Encabezado
        titulo="Caja abierta"
        descripcion={`Desde el ${fecha(caja.abierta_en)} · abrió ${caja.abierta_por_nombre ?? "—"} con ${dinero(caja.monto_inicial)}`}
        acciones={historial}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador titulo="Ventas del turno" valor={dinero(neto)} detalle={`${r.numVentas} ${r.numVentas === 1 ? "venta" : "ventas"}`} />
        <Indicador
          titulo="Cobrado por QR"
          valor={dinero(
            (r.ventas.find((v) => v.metodo === "transferencia")?.total ?? 0) -
              (r.devoluciones.find((v) => v.metodo === "transferencia")?.total ?? 0),
          )}
          detalle="Revísalo en la app del banco"
        />
        <Indicador titulo="Salidas de efectivo" valor={dinero(r.retiros)} detalle={r.ingresos ? `Entradas: ${dinero(r.ingresos)}` : undefined} />
        {admin ? (
          <Indicador titulo="Efectivo en caja" valor={dinero(r.efectivoEsperado)} detalle="Lo que debería haber" />
        ) : (
          <Indicador titulo="Devoluciones" valor={dinero(r.totalDevoluciones)} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Tarjeta titulo="Por método de pago" className="overflow-hidden">
            <TablaPorMetodo r={r} />
          </Tarjeta>
          <Tarjeta titulo="Entradas y salidas de efectivo" className="overflow-hidden">
            {movimientos.length > 0 && <TablaMovimientosCaja movimientos={movimientos} />}
            <FormMovimientoCaja />
          </Tarjeta>
        </div>
        <div className="space-y-6">
          {admin && (
            <Tarjeta titulo="Efectivo que debería haber">
              <CuentaEfectivo r={r} />
            </Tarjeta>
          )}
          <Tarjeta titulo="Cerrar caja">
            <FormCerrarCaja cajaId={caja.id} esperado={admin ? r.efectivoEsperado : null} />
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
