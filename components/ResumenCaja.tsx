import type { MovimientoCaja, ResumenCaja } from "@/lib/caja";
import { dinero, fecha } from "@/lib/format";
import { tdCls, thCls } from "./estilos";
import { Etiqueta } from "./ui";

/** Tabla de ventas y devoluciones por método de pago. */
export function TablaPorMetodo({ r }: { r: ResumenCaja }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className={thCls}>Método</th>
            <th className={`${thCls} text-right`}>Ventas</th>
            <th className={`${thCls} text-right`}>Devoluciones</th>
            <th className={`${thCls} text-right`}>Neto</th>
          </tr>
        </thead>
        <tbody>
          {r.ventas.map((v, i) => {
            const d = r.devoluciones[i];
            return (
              <tr key={v.metodo}>
                <td className={tdCls}>{v.etiqueta}</td>
                <td className={`${tdCls} tabular text-right`}>
                  {dinero(v.total)} <span className="text-xs text-tierra-500">({v.cantidad})</span>
                </td>
                <td className={`${tdCls} tabular text-right text-tierra-600`}>{d.total ? `−${dinero(d.total)}` : "—"}</td>
                <td className={`${tdCls} tabular text-right font-medium`}>{dinero(v.total - d.total)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-4 py-3 font-semibold">Total</td>
            <td className="tabular px-4 py-3 text-right">{dinero(r.totalVentas)}</td>
            <td className="tabular px-4 py-3 text-right text-tierra-600">{r.totalDevoluciones ? `−${dinero(r.totalDevoluciones)}` : "—"}</td>
            <td className="tabular px-4 py-3 text-right font-semibold">{dinero(r.totalVentas - r.totalDevoluciones)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** De dónde sale el efectivo que debería haber en la caja. */
export function CuentaEfectivo({ r }: { r: ResumenCaja }) {
  const ventasEf = r.ventas.find((v) => v.metodo === "efectivo")?.total ?? 0;
  const devEf = r.devoluciones.find((v) => v.metodo === "efectivo")?.total ?? 0;
  const filas: [string, number][] = [
    ["Efectivo inicial", r.montoInicial],
    ["+ Ventas en efectivo", ventasEf],
    ["− Devoluciones en efectivo", -devEf],
    ["+ Entradas de efectivo", r.ingresos],
    ["− Salidas de efectivo", -r.retiros],
  ];
  return (
    <dl className="space-y-1.5 p-4 text-sm">
      {filas.map(([t, v]) => (
        <div key={t} className="flex justify-between gap-3">
          <dt className="text-tierra-600">{t}</dt>
          <dd className="tabular">{dinero(Math.abs(v))}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-tierra-200 pt-2 font-semibold">
        <dt>Debería haber</dt>
        <dd className="tabular">{dinero(r.efectivoEsperado)}</dd>
      </div>
    </dl>
  );
}

export function TablaMovimientosCaja({ movimientos }: { movimientos: MovimientoCaja[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className={thCls}>Hora</th>
            <th className={thCls}>Tipo</th>
            <th className={thCls}>Motivo</th>
            <th className={`${thCls} text-right`}>Monto</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className={`${tdCls} whitespace-nowrap text-tierra-600`}>{fecha(m.creado_en).slice(-5)}</td>
              <td className={tdCls}>
                {m.tipo === "ingreso" ? <Etiqueta tono="verde">Entra</Etiqueta> : <Etiqueta tono="ambar">Sale</Etiqueta>}
              </td>
              <td className={tdCls}>
                {m.motivo}
                {m.usuario && <div className="text-xs text-tierra-500">por {m.usuario}</div>}
              </td>
              <td className={`${tdCls} tabular whitespace-nowrap text-right font-medium`}>
                {m.tipo === "ingreso" ? "+" : "−"}
                {dinero(m.monto)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
