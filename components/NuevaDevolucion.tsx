"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registrarDevolucion } from "@/app/actions/devoluciones";
import { MOTIVOS_DEVOLUCION } from "@/lib/config";
import { cantidad, dinero, nombreUnidad } from "@/lib/format";
import { Miniatura } from "./Foto";
import { btnPrimario, btnSecundario, btnChico, inputCls, tdCls, thCls } from "./estilos";
import { Aviso, Campo, Tarjeta } from "./ui";

export type LineaDevolvible = {
  id: number;
  producto: string;
  codigo: string;
  unidad: string;
  imagen: string | null;
  cantidad: number;
  devuelto: number;
  precio_unitario: number;
};

export function NuevaDevolucion({
  ventaId,
  lineas,
  factor,
}: {
  ventaId: number;
  lineas: LineaDevolvible[];
  /** total / subtotal de la venta: reparte el descuento en lo devuelto */
  factor: number;
}) {
  const router = useRouter();
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [danados, setDanados] = useState<Record<number, boolean>>({});
  const [motivo, setMotivo] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const disponible = (l: LineaDevolvible) => Math.round((l.cantidad - l.devuelto) * 1000) / 1000;
  const leer = (id: number) => Number((cantidades[id] ?? "").replace(",", ".")) || 0;
  const total = lineas.reduce((s, l) => s + Math.round(leer(l.id) * l.precio_unitario * factor), 0);

  function devolverTodo() {
    setCantidades(Object.fromEntries(lineas.map((l) => [l.id, String(disponible(l))])));
  }

  function guardar() {
    setError(null);
    if (!motivo) return setError("Elige el motivo de la devolución.");
    const renglones = lineas
      .filter((l) => leer(l.id) > 0)
      .map((l) => ({ ventaDetalleId: l.id, cantidad: leer(l.id), reingresa: !danados[l.id] }));
    if (!renglones.length) return setError("Escribe cuánto se devuelve de al menos un producto.");
    const excedido = lineas.find((l) => leer(l.id) > disponible(l));
    if (excedido) return setError(`De "${excedido.producto}" solo se pueden devolver ${cantidad(disponible(excedido))}.`);
    startTransition(async () => {
      const res = await registrarDevolucion({ ventaId, motivo, nota, renglones });
      if (res.ok) router.push(`/ventas/${ventaId}?devolucion=1`);
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Tarjeta
        className="self-start overflow-hidden"
        titulo="¿Qué devuelve el cliente?"
        acciones={
          <button onClick={devolverTodo} className={`${btnSecundario} ${btnChico}`}>
            Devolver todo
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thCls}>Producto</th>
                <th className={`${thCls} text-right`}>Vendido</th>
                <th className={`${thCls} w-28 text-right`}>Devuelve</th>
                <th className={thCls}>Estado</th>
                <th className={`${thCls} text-right`}>A devolver</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const disp = disponible(l);
                const cant = leer(l.id);
                return (
                  <tr key={l.id} className={disp <= 0 ? "text-zinc-400" : ""}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <Miniatura imagen={l.imagen} alt="" tam={40} />
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900">{l.producto}</p>
                          <p className="text-xs text-zinc-500">
                            <span className="font-mono">{l.codigo}</span> · {dinero(l.precio_unitario)} c/u
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right`}>
                      {cantidad(l.cantidad)} {nombreUnidad(l.cantidad, l.unidad)}
                      {l.devuelto > 0 && <div className="text-xs text-zinc-500">ya devuelto {cantidad(l.devuelto)}</div>}
                    </td>
                    <td className={tdCls}>
                      {disp > 0 ? (
                        <input
                          type="number"
                          min="0"
                          max={disp}
                          step="any"
                          value={cantidades[l.id] ?? ""}
                          placeholder="0"
                          onChange={(e) => setCantidades((c) => ({ ...c, [l.id]: e.target.value }))}
                          className={`${inputCls} tabular min-w-16 text-right`}
                          aria-label={`Cantidad devuelta de ${l.producto}`}
                        />
                      ) : (
                        <span className="block text-right text-xs">Todo devuelto</span>
                      )}
                    </td>
                    <td className={tdCls}>
                      {disp > 0 && (
                        <select
                          value={danados[l.id] ? "danado" : "bueno"}
                          onChange={(e) => setDanados((d) => ({ ...d, [l.id]: e.target.value === "danado" }))}
                          className={`${inputCls} min-w-40 !py-1.5`}
                          aria-label={`Estado de ${l.producto}`}
                        >
                          <option value="bueno">Vuelve al stock</option>
                          <option value="danado">Dañado (no vuelve)</option>
                        </select>
                      )}
                    </td>
                    <td className={`${tdCls} tabular whitespace-nowrap text-right font-medium`}>
                      {cant > 0 ? dinero(Math.round(cant * l.precio_unitario * factor)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {factor < 1 && (
          <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
            La venta tuvo descuento: lo devuelto ya lo descuenta en proporción.
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Datos de la devolución" className="self-start">
        <div className="space-y-4 p-4">
          <Campo label="Motivo" htmlFor="motivo" requerido>
            <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
              <option value="">Elige un motivo…</option>
              {MOTIVOS_DEVOLUCION.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nota" htmlFor="nota" ayuda="Opcional.">
            <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} className={inputCls} />
          </Campo>
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Devolver al cliente</span>
              <span className="tabular">{dinero(total)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Lo marcado como «Vuelve al stock» se suma al inventario. Lo dañado no.
            </p>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <button onClick={guardar} disabled={pendiente} className={`${btnPrimario} w-full !py-2.5`}>
            {pendiente ? "Registrando…" : "Registrar devolución"}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}
