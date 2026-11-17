"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registrarAjuste } from "@/app/actions/ajustes";
import { MOTIVOS_AJUSTE } from "@/lib/config";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { cantidad, dinero, nombreUnidad } from "@/lib/format";
import { BuscadorProductos } from "./BuscadorProductos";
import { Miniatura } from "./Foto";
import { btnFantasma, btnPrimario, inputCls, tdCls, thCls } from "./estilos";
import { Aviso, Campo, Tarjeta, Vacio } from "./ui";

type Modo = "conteo" | "diferencia";
type Renglon = { producto: ProductoBusqueda; valor: string };

/** Convierte lo escrito ("3", "-2", "1,5") en número; null si está vacío o no es válido. */
function leerNumero(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (t === "" || t === "-" || t === "+") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const MODOS: { valor: Modo; titulo: string; texto: string }[] = [
  { valor: "conteo", titulo: "Escribir el stock real", texto: "Contaste los productos y escribes cuántos hay de verdad." },
  { valor: "diferencia", titulo: "Sumar o restar", texto: "Ej.: se rompieron 2 → escribe -2. Aparecieron 3 → escribe 3." },
];

export function NuevoAjuste({ productoInicial }: { productoInicial?: ProductoBusqueda }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("conteo");
  const [renglones, setRenglones] = useState<Renglon[]>(productoInicial ? [{ producto: productoInicial, valor: "" }] : []);
  const [motivo, setMotivo] = useState<string>("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function agregar(p: ProductoBusqueda) {
    setError(null);
    setRenglones((rs) => (rs.some((r) => r.producto.id === p.id) ? rs : [...rs, { producto: p, valor: "" }]));
  }
  const cambiar = (i: number, valor: string) => setRenglones((rs) => rs.map((r, j) => (j === i ? { ...r, valor } : r)));
  const quitar = (i: number) => setRenglones((rs) => rs.filter((_, j) => j !== i));

  function cambiarModo(m: Modo) {
    setModo(m);
    setRenglones((rs) => rs.map((r) => ({ ...r, valor: "" })));
  }

  /** Stock que quedará y diferencia, según el modo. */
  function calcular(r: Renglon) {
    const n = leerNumero(r.valor);
    if (n == null) return null;
    const nuevo = modo === "conteo" ? n : r.producto.stock + n;
    return { nuevo, diferencia: Math.round((nuevo - r.producto.stock) * 1000) / 1000 };
  }

  const calculos = renglones.map(calcular);
  const valorTotal = calculos.reduce(
    (s, c, i) => s + (c ? Math.round(c.diferencia * renglones[i].producto.precio_costo) : 0),
    0,
  );
  const conCambio = calculos.filter((c) => c && c.diferencia !== 0).length;

  function guardar() {
    setError(null);
    if (!motivo) return setError("Elige el motivo del ajuste.");
    if (calculos.some((c) => c == null)) return setError("Escribe una cantidad en todos los productos (o quita los que no vas a ajustar).");
    if (calculos.some((c) => c!.nuevo < 0)) return setError("Ningún producto puede quedar con stock negativo.");
    startTransition(async () => {
      const res = await registrarAjuste({
        motivo,
        nota,
        renglones: renglones.map((r) => ({ productoId: r.producto.id, modo, valor: leerNumero(r.valor)! })),
      });
      if (res.ok) router.push(`/ajustes/${res.id}?nuevo=1`);
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Forma de ajustar">
          {MODOS.map((m) => (
            <label
              key={m.valor}
              className={`cursor-pointer rounded-xl border bg-papel p-3 text-sm ${
                modo === m.valor ? "border-acento-600 ring-2 ring-acento-600/20" : "border-tierra-200 hover:border-tierra-300"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-tierra-900">
                <input
                  type="radio"
                  name="modo"
                  checked={modo === m.valor}
                  onChange={() => cambiarModo(m.valor)}
                  className="accent-acento-700"
                />
                {m.titulo}
              </span>
              <span className="mt-1 block pl-6 text-tierra-500">{m.texto}</span>
            </label>
          ))}
        </div>

        <BuscadorProductos onElegir={agregar} precio="costo" />

        <Tarjeta className="overflow-hidden">
          {renglones.length === 0 ? (
            <Vacio titulo="Agrega los productos que vas a ajustar" texto="Búscalos arriba por nombre, código o modelo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Producto</th>
                    <th className={`${thCls} text-right`}>En sistema</th>
                    <th className={`${thCls} w-32 text-right`}>{modo === "conteo" ? "Stock real" : "Sumar / restar"}</th>
                    <th className={`${thCls} text-right`}>Diferencia</th>
                    <th className={`${thCls} text-right`}>Valor</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((r, i) => {
                    const c = calculos[i];
                    return (
                      <tr key={r.producto.id}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Miniatura imagen={r.producto.imagen} alt="" tam={40} />
                            <div className="min-w-0">
                              <p className="font-medium text-tierra-900">{r.producto.nombre}</p>
                              <p className="font-mono text-xs text-tierra-500">{r.producto.codigo}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`${tdCls} tabular whitespace-nowrap text-right text-tierra-600`}>
                          {cantidad(r.producto.stock)} {nombreUnidad(r.producto.stock, r.producto.unidad)}
                        </td>
                        <td className={tdCls}>
                          <input
                            inputMode="decimal"
                            value={r.valor}
                            onChange={(e) => cambiar(i, e.target.value)}
                            placeholder={modo === "conteo" ? cantidad(r.producto.stock) : "-1"}
                            className={`${inputCls} tabular min-w-20 text-right`}
                            aria-label={`${modo === "conteo" ? "Stock real" : "Cantidad a sumar o restar"} de ${r.producto.nombre}`}
                          />
                          {c && c.nuevo < 0 && <p className="mt-1 text-right text-xs text-red-600">Quedaría negativo</p>}
                        </td>
                        <td
                          className={`${tdCls} tabular whitespace-nowrap text-right font-medium ${
                            !c || c.diferencia === 0 ? "text-tierra-400" : c.diferencia > 0 ? "text-oliva-700" : "text-red-700"
                          }`}
                        >
                          {c ? `${c.diferencia > 0 ? "+" : ""}${cantidad(c.diferencia)}` : "—"}
                          {c && modo === "diferencia" && (
                            <div className="text-xs font-normal text-tierra-500">queda {cantidad(c.nuevo)}</div>
                          )}
                        </td>
                        <td className={`${tdCls} tabular whitespace-nowrap text-right text-tierra-600`}>
                          {c ? dinero(Math.round(c.diferencia * r.producto.precio_costo)) : "—"}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button onClick={() => quitar(i)} className={btnFantasma} aria-label="Quitar">
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Datos del ajuste" className="self-start">
        <div className="space-y-4 p-4">
          <Campo label="Motivo" htmlFor="motivo" requerido>
            <select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}>
              <option value="">Elige un motivo…</option>
              {MOTIVOS_AJUSTE.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nota" htmlFor="nota" ayuda={motivo === "Otro" ? "Obligatoria: explica el motivo." : "Opcional."}>
            <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} className={inputCls} />
          </Campo>

          <div className="border-t border-tierra-100 pt-4">
            <div className="flex justify-between text-sm text-tierra-500">
              <span>Productos con cambio</span>
              <span className="tabular">{conCambio}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold">
              <span>Valor a costo</span>
              <span className={`tabular ${valorTotal < 0 ? "text-red-700" : ""}`}>{dinero(valorTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-tierra-500">Negativo = pérdida. Se calcula con el precio de costo actual.</p>
          </div>

          {error && <Aviso tipo="error">{error}</Aviso>}
          <button onClick={guardar} disabled={pendiente || renglones.length === 0} className={`${btnPrimario} w-full !py-2.5`}>
            {pendiente ? "Guardando…" : "Registrar ajuste"}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}
