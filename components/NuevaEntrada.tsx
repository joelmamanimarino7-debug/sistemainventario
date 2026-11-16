"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { registrarEntrada } from "@/app/actions/entradas";
import type { ProductoBusqueda } from "@/lib/data/productos";
import { aCentavos, cantidad, centavosAInput, dinero, nombreUnidad } from "@/lib/format";
import { BuscadorProductos, type BuscadorRef } from "./BuscadorProductos";
import { Miniatura } from "./Foto";
import { btnFantasma, btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "./estilos";
import { Aviso, Campo, Tarjeta, Vacio } from "./ui";

type Renglon = { producto: ProductoBusqueda; cantidad: string; costo: string };

export function NuevaEntrada({
  proveedores,
  productoInicial,
}: {
  proveedores: { id: number; nombre: string }[];
  productoInicial?: ProductoBusqueda;
}) {
  const router = useRouter();
  const buscador = useRef<BuscadorRef>(null);
  const [renglones, setRenglones] = useState<Renglon[]>(
    productoInicial ? [{ producto: productoInicial, cantidad: "1", costo: centavosAInput(productoInicial.precio_costo) }] : [],
  );
  const [proveedorId, setProveedorId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [nota, setNota] = useState("");
  const [actualizarCosto, setActualizarCosto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function agregar(p: ProductoBusqueda) {
    setError(null);
    setRenglones((rs) => {
      const i = rs.findIndex((r) => r.producto.id === p.id);
      if (i >= 0) {
        const copia = [...rs];
        copia[i] = { ...copia[i], cantidad: String((Number(copia[i].cantidad) || 0) + 1) };
        return copia;
      }
      return [...rs, { producto: p, cantidad: "1", costo: centavosAInput(p.precio_costo) }];
    });
  }

  const cambiar = (i: number, campo: "cantidad" | "costo", valor: string) =>
    setRenglones((rs) => rs.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)));
  const quitar = (i: number) => setRenglones((rs) => rs.filter((_, j) => j !== i));

  const total = renglones.reduce(
    (s, r) => s + Math.round((Number(r.cantidad) || 0) * (aCentavos(r.costo) ?? 0)),
    0,
  );
  const unidades = renglones.reduce((s, r) => s + (Number(r.cantidad) || 0), 0);

  function guardar() {
    setError(null);
    const datos = renglones.map((r) => ({
      productoId: r.producto.id,
      cantidad: Number(r.cantidad),
      costoUnitario: aCentavos(r.costo) ?? 0,
    }));
    if (datos.some((d) => !(d.cantidad > 0))) {
      setError("Revisa las cantidades: todas deben ser mayores a 0.");
      return;
    }
    startTransition(async () => {
      const res = await registrarEntrada({
        proveedorId: proveedorId ? Number(proveedorId) : null,
        referencia,
        nota,
        actualizarCosto,
        renglones: datos,
      });
      if (res.ok) router.push(`/entradas/${res.id}?nueva=1`);
      else setError(res.error);
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <BuscadorProductos ref={buscador} onElegir={agregar} precio="costo" />
        <Tarjeta className="overflow-hidden">
          {renglones.length === 0 ? (
            <Vacio
              titulo="Agrega los productos que llegaron"
              texto="Búscalos arriba por nombre o código. ¿Es un producto nuevo? Regístralo primero."
              accion={
                <Link href="/productos/nuevo" className={btnSecundario}>
                  + Registrar producto nuevo
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Producto</th>
                    <th className={`${thCls} w-28 text-right`}>Cantidad</th>
                    <th className={`${thCls} w-32 text-right`}>Costo unit.</th>
                    <th className={`${thCls} text-right`}>Subtotal</th>
                    <th className={thCls}></th>
                  </tr>
                </thead>
                <tbody>
                  {renglones.map((r, i) => {
                    const sub = Math.round((Number(r.cantidad) || 0) * (aCentavos(r.costo) ?? 0));
                    return (
                      <tr key={r.producto.id}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Miniatura imagen={r.producto.imagen} alt="" tam={44} />
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900">{r.producto.nombre}</p>
                          <p className="text-xs text-zinc-500">
                            <span className="font-mono">{r.producto.codigo}</span> · Stock actual {cantidad(r.producto.stock)}{" "}
                            {nombreUnidad(r.producto.stock, r.producto.unidad)}
                          </p>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={r.cantidad}
                            onChange={(e) => cambiar(i, "cantidad", e.target.value)}
                            className={`${inputCls} tabular min-w-16 text-right`}
                            aria-label={`Cantidad de ${r.producto.nombre}`}
                          />
                        </td>
                        <td className={tdCls}>
                          <input
                            inputMode="decimal"
                            value={r.costo}
                            onChange={(e) => cambiar(i, "costo", e.target.value)}
                            className={`${inputCls} tabular min-w-20 text-right`}
                            aria-label={`Costo de ${r.producto.nombre}`}
                          />
                        </td>
                        <td className={`${tdCls} tabular whitespace-nowrap text-right font-medium`}>{dinero(sub)}</td>
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

      <Tarjeta titulo="Datos de la entrada" className="self-start">
        <div className="space-y-4 p-4">
          <Campo label="Proveedor" htmlFor="proveedor">
            <select id="proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputCls}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Factura / remisión" htmlFor="referencia" ayuda="Opcional.">
            <input id="referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} className={inputCls} />
          </Campo>
          <Campo label="Nota" htmlFor="nota">
            <textarea id="nota" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} className={inputCls} />
          </Campo>
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={actualizarCosto}
              onChange={(e) => setActualizarCosto(e.target.checked)}
              className="mt-0.5 accent-teal-700"
            />
            Actualizar el precio de costo de los productos con estos costos
          </label>

          <div className="border-t border-zinc-100 pt-4">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Productos</span>
              <span className="tabular">{renglones.length}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Unidades</span>
              <span className="tabular">{cantidad(unidades)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="tabular">{dinero(total)}</span>
            </div>
          </div>

          {error && <Aviso tipo="error">{error}</Aviso>}
          <button onClick={guardar} disabled={pendiente || renglones.length === 0} className={`${btnPrimario} w-full !py-2.5`}>
            {pendiente ? "Registrando…" : "Registrar entrada"}
          </button>
        </div>
      </Tarjeta>
    </div>
  );
}
