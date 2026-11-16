import Link from "next/link";
import type { Movimiento } from "@/lib/data/movimientos";
import { cantidad, fecha } from "@/lib/format";
import { tdCls, thCls } from "./estilos";
import { Etiqueta } from "./ui";

const TIPOS = {
  entrada: { texto: "Entrada", tono: "verde" },
  venta: { texto: "Venta", tono: "azul" },
  ajuste: { texto: "Ajuste", tono: "ambar" },
  devolucion: { texto: "Devolución", tono: "teal" },
} as const;

export function EtiquetaTipo({ tipo }: { tipo: Movimiento["tipo"] }) {
  const t = TIPOS[tipo];
  return <Etiqueta tono={t.tono}>{t.texto}</Etiqueta>;
}

function Referencia({ m }: { m: Movimiento }) {
  if (m.devolucion_id)
    return (
      <Link href={`/ventas/${m.venta_id}`} className="text-teal-700 hover:underline">
        Devolución #{m.devolucion_id} (venta #{m.venta_id})
      </Link>
    );
  if (m.ajuste_id)
    return (
      <Link href={`/ajustes/${m.ajuste_id}`} className="text-teal-700 hover:underline">
        Ajuste #{m.ajuste_id}
      </Link>
    );
  if (m.venta_id)
    return (
      <Link href={`/ventas/${m.venta_id}`} className="text-teal-700 hover:underline">
        Venta #{m.venta_id}
      </Link>
    );
  if (m.entrada_id)
    return (
      <Link href={`/entradas/${m.entrada_id}`} className="text-teal-700 hover:underline">
        Entrada #{m.entrada_id}
      </Link>
    );
  return null;
}

export function TablaMovimientos({ movimientos, conProducto = true }: { movimientos: Movimiento[]; conProducto?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className={thCls}>Fecha</th>
            {conProducto && <th className={thCls}>Producto</th>}
            <th className={thCls}>Tipo</th>
            <th className={`${thCls} text-right`}>Cantidad</th>
            <th className={`${thCls} text-right`}>Stock</th>
            <th className={thCls}>Referencia / nota</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className={`${tdCls} whitespace-nowrap text-zinc-600`}>{fecha(m.creado_en)}</td>
              {conProducto && (
                <td className={tdCls}>
                  <Link href={`/productos/${m.producto_id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                    {m.producto}
                  </Link>
                  <div className="text-xs text-zinc-500">{m.codigo}</div>
                </td>
              )}
              <td className={tdCls}>
                <EtiquetaTipo tipo={m.tipo} />
              </td>
              <td
                className={`${tdCls} tabular whitespace-nowrap text-right font-medium ${
                  m.cantidad >= 0 ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {m.cantidad > 0 ? "+" : ""}
                {cantidad(m.cantidad)}
              </td>
              <td className={`${tdCls} tabular whitespace-nowrap text-right text-zinc-600`}>
                {cantidad(m.stock_anterior)} → <span className="font-medium text-zinc-900">{cantidad(m.stock_resultante)}</span>
              </td>
              <td className={tdCls}>
                <Referencia m={m} />
                {m.nota && <div className="text-xs text-zinc-500">{m.nota}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
