"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { registrarVenta } from "@/app/actions/ventas";
import { METODOS_PAGO } from "@/lib/config";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { aCentavos, cantidad, centavosAInput, dinero, nombreUnidad } from "@/lib/format";
import { BuscadorProductos, type BuscadorRef } from "./BuscadorProductos";
import { Miniatura } from "./Foto";
import { btnFantasma, btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "./estilos";
import { Aviso, Campo, Tarjeta, Vacio } from "./ui";

type Renglon = { producto: ProductoBusqueda; cantidad: string; precio: string };

const CLAVE_AUTO = "inventario:imprimir-ticket";

export function NuevaVenta({ puedeCambiarPrecio }: { puedeCambiarPrecio: boolean }) {
  const buscador = useRef<BuscadorRef>(null);
  // Preferencia guardada en este navegador: abrir el ticket al cobrar.
  const [imprimirAuto, setImprimirAuto] = useState(false);
  useEffect(() => {
    try {
      setImprimirAuto(localStorage.getItem(CLAVE_AUTO) === "1");
    } catch {
      /* sin almacenamiento: queda desactivado */
    }
  }, []);
  function cambiarImprimirAuto(v: boolean) {
    setImprimirAuto(v);
    try {
      localStorage.setItem(CLAVE_AUTO, v ? "1" : "0");
    } catch {
      /* no pasa nada */
    }
  }
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [metodo, setMetodo] = useState<string>("efectivo");
  const [descuento, setDescuento] = useState("");
  const [pagoCon, setPagoCon] = useState("");
  const [cliente, setCliente] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ id: number; total: number; cambio: number | null } | null>(null);
  const [pendiente, startTransition] = useTransition();

  function agregar(p: ProductoBusqueda) {
    setError(null);
    setExito(null);
    setRenglones((rs) => {
      const i = rs.findIndex((r) => r.producto.id === p.id);
      if (i >= 0) {
        const copia = [...rs];
        copia[i] = { ...copia[i], cantidad: String((Number(copia[i].cantidad) || 0) + 1) };
        return copia;
      }
      return [...rs, { producto: p, cantidad: "1", precio: centavosAInput(p.precio_venta) }];
    });
  }

  const cambiar = (i: number, campo: "cantidad" | "precio", valor: string) =>
    setRenglones((rs) => rs.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  const sumar = (i: number, delta: number) =>
    setRenglones((rs) =>
      rs.map((r, j) => (j === i ? { ...r, cantidad: String(Math.max(1, (Number(r.cantidad) || 0) + delta)) } : r)),
    );
  const quitar = (i: number) => setRenglones((rs) => rs.filter((_, j) => j !== i));

  const subtotal = renglones.reduce(
    (s, r) => s + Math.round((Number(r.cantidad) || 0) * (aCentavos(r.precio) ?? 0)),
    0,
  );
  const desc = Math.max(0, aCentavos(descuento) ?? 0);
  const total = Math.max(0, subtotal - desc);
  const recibido = aCentavos(pagoCon);
  const cambio = metodo === "efectivo" && recibido != null ? recibido - total : null;
  const sinStock = renglones.filter((r) => (Number(r.cantidad) || 0) > r.producto.stock);

  function limpiar() {
    setRenglones([]);
    setDescuento("");
    setPagoCon("");
    setCliente("");
    setNota("");
    setMetodo("efectivo");
  }

  function cobrar() {
    setError(null);
    if (sinStock.length) {
      setError(`No hay stock suficiente de: ${sinStock.map((r) => r.producto.nombre).join(", ")}.`);
      return;
    }
    if (desc > subtotal) {
      setError("El descuento no puede ser mayor que el subtotal.");
      return;
    }
    if (cambio != null && cambio < 0) {
      setError("El efectivo recibido es menor que el total.");
      return;
    }
    const datos = renglones.map((r) => ({
      productoId: r.producto.id,
      cantidad: Number(r.cantidad),
      precioUnitario: aCentavos(r.precio) ?? 0,
    }));
    if (datos.some((d) => !(d.cantidad > 0))) {
      setError("Revisa las cantidades: todas deben ser mayores a 0.");
      return;
    }
    startTransition(async () => {
      const res = await registrarVenta({
        cliente,
        metodoPago: metodo,
        descuento: desc,
        pagoCon: metodo === "efectivo" ? recibido : null,
        nota,
        renglones: datos,
      });
      if (res.ok) {
        setExito({ id: res.id, total, cambio });
        if (imprimirAuto) window.open(`/ticket/${res.id}?imprimir=1`, "_blank", "noopener");
        limpiar();
        buscador.current?.enfocar();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {exito && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-oliva-600/25 bg-oliva-50 px-4 py-3">
            <div>
              <p className="font-medium text-oliva-700">
                Venta #{exito.id} registrada por {dinero(exito.total)}
              </p>
              {exito.cambio != null && exito.cambio > 0 && (
                <p className="text-sm text-oliva-700">
                  Cambio a entregar: <span className="tabular font-semibold">{dinero(exito.cambio)}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/ticket/${exito.id}?imprimir=1`} target="_blank" rel="noopener" className={btnSecundario}>
                🖨 Imprimir ticket
              </a>
              <Link href={`/ventas/${exito.id}`} className={btnSecundario}>
                Ver venta
              </Link>
            </div>
          </div>
        )}

        <BuscadorProductos ref={buscador} onElegir={agregar} precio="venta" />

        <Tarjeta className="overflow-hidden">
          {renglones.length === 0 ? (
            <Vacio titulo="Carrito vacío" texto="Busca productos arriba o escanea su código de barras para agregarlos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Producto</th>
                    <th className={`${thCls} w-32 text-right`}>Precio</th>
                    <th className={`${thCls} w-40 text-center`}>Cantidad</th>
                    <th className={`${thCls} text-right`}>Importe</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((r, i) => {
                    const cant = Number(r.cantidad) || 0;
                    const importe = Math.round(cant * (aCentavos(r.precio) ?? 0));
                    const falta = cant > r.producto.stock;
                    return (
                      <tr key={r.producto.id} className={falta ? "bg-red-50/50" : ""}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Miniatura imagen={r.producto.imagen} alt="" tam={44} />
                            <div className="min-w-0">
                              <p className="font-medium text-tierra-900">{r.producto.nombre}</p>
                          <p className={`text-xs ${falta ? "font-medium text-red-600" : "text-tierra-500"}`}>
                            <span className="font-mono">{r.producto.codigo}</span> · Disponible {cantidad(r.producto.stock)}{" "}
                            {nombreUnidad(r.producto.stock, r.producto.unidad)}
                          </p>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <input
                            inputMode="decimal"
                            value={r.precio}
                            onChange={(e) => cambiar(i, "precio", e.target.value)}
                            readOnly={!puedeCambiarPrecio}
                            title={puedeCambiarPrecio ? undefined : "Solo un administrador puede cambiar el precio"}
                            className={`${inputCls} tabular min-w-20 text-right ${puedeCambiarPrecio ? "" : "!border-transparent !bg-transparent !shadow-none"}`}
                            aria-label={`Precio de ${r.producto.nombre}`}
                          />
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => sumar(i, -1)} className={`${btnSecundario} !px-2.5`} aria-label="Restar uno">
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={r.cantidad}
                              onChange={(e) => cambiar(i, "cantidad", e.target.value)}
                              className={`${inputCls} tabular !w-16 min-w-14 text-center`}
                              aria-label={`Cantidad de ${r.producto.nombre}`}
                            />
                            <button onClick={() => sumar(i, 1)} className={`${btnSecundario} !px-2.5`} aria-label="Sumar uno">
                              +
                            </button>
                          </div>
                        </td>
                        <td className={`${tdCls} tabular whitespace-nowrap text-right font-medium`}>{dinero(importe)}</td>
                        <td className={`${tdCls} text-right`}>
                          <button onClick={() => quitar(i)} className={btnFantasma} aria-label={`Quitar ${r.producto.nombre}`}>
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

      <Tarjeta titulo="Cobro" className="self-start xl:sticky xl:top-6">
        <div className="space-y-4 p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-tierra-600">
              <span>Subtotal</span>
              <span className="tabular">{dinero(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-tierra-600">
              <label htmlFor="descuento">Descuento</label>
              <input
                id="descuento"
                inputMode="decimal"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="0,00"
                className={`${inputCls} tabular !w-28 !py-1 text-right`}
              />
            </div>
            <div className="flex items-baseline justify-between border-t border-tierra-100 pt-3">
              <span className="font-semibold">Total</span>
              <span className="tabular font-display text-3xl font-semibold text-tierra-900">{dinero(total)}</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-tierra-700">Método de pago</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  onClick={() => setMetodo(m.valor)}
                  aria-pressed={metodo === m.valor}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    metodo === m.valor
                      ? "border-acento-700 bg-acento-50 text-acento-800"
                      : "border-tierra-200 text-tierra-600 hover:bg-tierra-50"
                  }`}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </fieldset>

          {metodo === "efectivo" && (
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Paga con" htmlFor="pago_con">
                <input
                  id="pago_con"
                  inputMode="decimal"
                  value={pagoCon}
                  onChange={(e) => setPagoCon(e.target.value)}
                  placeholder="0,00"
                  className={`${inputCls} tabular text-right`}
                />
              </Campo>
              <div>
                <p className="mb-1 text-sm font-medium text-tierra-700">Cambio</p>
                <p
                  className={`tabular rounded-lg bg-tierra-50 px-3 py-2 text-right text-sm font-semibold ${
                    cambio != null && cambio < 0 ? "text-red-600" : "text-tierra-900"
                  }`}
                >
                  {cambio == null ? "—" : dinero(cambio)}
                </p>
              </div>
            </div>
          )}

          <Campo label="Cliente" htmlFor="cliente" ayuda="Opcional.">
            <input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Nota" htmlFor="nota_venta">
            <input id="nota_venta" value={nota} onChange={(e) => setNota(e.target.value)} className={inputCls} />
          </Campo>

          <label className="flex items-center gap-2 text-sm text-tierra-600">
            <input
              type="checkbox"
              checked={imprimirAuto}
              onChange={(e) => cambiarImprimirAuto(e.target.checked)}
              className="accent-acento-700"
            />
            Imprimir el ticket al cobrar
          </label>

          {error && <Aviso tipo="error">{error}</Aviso>}

          <button
            onClick={cobrar}
            disabled={pendiente || renglones.length === 0}
            className={`${btnPrimario} w-full !py-3 !text-base`}
          >
            {pendiente ? "Registrando…" : `Cobrar ${dinero(total)}`}
          </button>
          {renglones.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("¿Vaciar el carrito?")) limpiar();
              }}
              className={`${btnFantasma} w-full`}
            >
              Cancelar venta
            </button>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}
