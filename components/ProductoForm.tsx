"use client";

import Link from "next/link";
import { useState } from "react";
import { actualizarProducto, crearProducto } from "@/app/actions/productos";
import { UNIDADES, UNIDADES_MEDIDA } from "@/lib/config";
import type { Producto } from "@/lib/data/productos";
import { aCentavos, cantidad, centavosAInput, dinero, nombreUnidad } from "@/lib/format";
import { btnPrimario, btnSecundario, inputCls } from "./estilos";
import { SelectorFoto } from "./SelectorFoto";
import { Aviso, Campo, Tarjeta } from "./ui";
import { useFormAccion } from "./useFormAccion";

type Opcion = { id: number; nombre: string; activo: number };

export function ProductoForm({
  producto,
  categorias,
  marcas,
  proveedores,
}: {
  producto?: Producto;
  categorias: Opcion[];
  marcas: Opcion[];
  proveedores: Opcion[];
}) {
  const p = producto;
  const { estado, onSubmit, pendiente } = useFormAccion(p ? actualizarProducto : crearProducto);
  const err = estado.campos ?? {};

  const [costo, setCosto] = useState(centavosAInput(p?.precio_costo));
  const [venta, setVenta] = useState(centavosAInput(p?.precio_venta));
  const c = aCentavos(costo) ?? 0;
  const v = aCentavos(venta) ?? 0;
  const ganancia = v - c;
  const margen = v > 0 ? (ganancia / v) * 100 : 0;

  // En los selects mostramos solo opciones activas, más la que ya tenga asignada el producto.
  const visibles = (ops: Opcion[], actual: number | null | undefined) =>
    ops.filter((o) => o.activo || o.id === actual);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}

      <Tarjeta titulo="Identificación">
        <div className="grid gap-5 p-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-56 md:max-w-none">
          <SelectorFoto actual={p?.imagen} error={err.imagen} />
        </div>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Campo label="Nombre" htmlFor="nombre" requerido error={err.nombre} className="sm:col-span-2">
            <input id="nombre" name="nombre" defaultValue={p?.nombre} className={inputCls} required autoFocus={!p} />
          </Campo>
          <Campo
            label="Código / SKU"
            htmlFor="codigo"
            error={err.codigo}
            ayuda={p ? undefined : "Déjalo vacío para generarlo automáticamente."}
          >
            <input id="codigo" name="codigo" defaultValue={p?.codigo} className={inputCls} required={!!p} />
          </Campo>
          <Campo label="Código de barras" htmlFor="codigo_barras" ayuda="Opcional.">
            <input id="codigo_barras" name="codigo_barras" defaultValue={p?.codigo_barras ?? ""} className={inputCls} />
          </Campo>
          <Campo
            label="Descripción"
            htmlFor="descripcion"
            className="sm:col-span-2"
            ayuda="Detalles libres: piezas que incluye, contenido del paquete, compatibilidad, etc."
          >
            <textarea id="descripcion" name="descripcion" rows={3} defaultValue={p?.descripcion ?? ""} className={inputCls} />
          </Campo>
        </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Clasificación">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo label="Categoría" htmlFor="categoria_id">
            <select id="categoria_id" name="categoria_id" defaultValue={p?.categoria_id ?? ""} className={inputCls}>
              <option value="">Sin categoría</option>
              {visibles(categorias, p?.categoria_id).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Marca" htmlFor="marca_id">
            <select id="marca_id" name="marca_id" defaultValue={p?.marca_id ?? ""} className={inputCls}>
              <option value="">Sin marca</option>
              {visibles(marcas, p?.marca_id).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Modelo" htmlFor="modelo">
            <input id="modelo" name="modelo" defaultValue={p?.modelo ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Proveedor" htmlFor="proveedor_id">
            <select id="proveedor_id" name="proveedor_id" defaultValue={p?.proveedor_id ?? ""} className={inputCls}>
              <option value="">Sin proveedor</option>
              {visibles(proveedores, p?.proveedor_id).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </Campo>
          {(categorias.length === 0 || marcas.length === 0) && (
            <p className="text-xs text-zinc-500 sm:col-span-2">
              Puedes dar de alta categorías, marcas y proveedores en{" "}
              <Link href="/categorias" className="text-teal-700 underline">
                Catálogos
              </Link>
              .
            </p>
          )}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Medidas y características">
        <div className="grid gap-4 p-5 sm:grid-cols-4">
          <Campo label="Largo" htmlFor="largo" error={err.largo}>
            <input id="largo" name="largo" type="number" step="any" min="0" defaultValue={p?.largo ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Ancho" htmlFor="ancho" error={err.ancho}>
            <input id="ancho" name="ancho" type="number" step="any" min="0" defaultValue={p?.ancho ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Alto" htmlFor="alto" error={err.alto}>
            <input id="alto" name="alto" type="number" step="any" min="0" defaultValue={p?.alto ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Unidad de medida" htmlFor="unidad_medida">
            <select id="unidad_medida" name="unidad_medida" defaultValue={p?.unidad_medida ?? "cm"} className={inputCls}>
              {UNIDADES_MEDIDA.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Peso (kg)" htmlFor="peso" error={err.peso}>
            <input id="peso" name="peso" type="number" step="any" min="0" defaultValue={p?.peso ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Color" htmlFor="color">
            <input id="color" name="color" defaultValue={p?.color ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Material" htmlFor="material" className="sm:col-span-2">
            <input id="material" name="material" defaultValue={p?.material ?? ""} className={inputCls} />
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Precios">
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Campo label="Precio de costo" htmlFor="precio_costo" error={err.precio_costo} ayuda="Lo que te cuesta a ti.">
            <input
              id="precio_costo"
              name="precio_costo"
              inputMode="decimal"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0,00"
              className={`${inputCls} tabular`}
            />
          </Campo>
          <Campo label="Precio de venta" htmlFor="precio_venta" error={err.precio_venta} ayuda="Lo que cobras al cliente.">
            <input
              id="precio_venta"
              name="precio_venta"
              inputMode="decimal"
              value={venta}
              onChange={(e) => setVenta(e.target.value)}
              placeholder="0,00"
              className={`${inputCls} tabular`}
            />
          </Campo>
          <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ganancia por unidad</p>
            <p className={`tabular mt-1 text-lg font-semibold ${ganancia < 0 ? "text-red-600" : "text-zinc-900"}`}>
              {dinero(ganancia)}
            </p>
            <p className="tabular text-xs text-zinc-500">Margen {cantidad(Math.round(margen * 10) / 10)}%</p>
            {ganancia < 0 && <p className="mt-1 text-xs text-red-600">El precio de venta es menor que el costo.</p>}
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Inventario">
        <div className="grid gap-4 p-5 sm:grid-cols-4">
          <Campo label="Se vende por" htmlFor="unidad">
            <select id="unidad" name="unidad" defaultValue={p?.unidad ?? "unidad"} className={inputCls}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
          {p ? (
            <Campo label="Stock actual" ayuda="Se cambia con entradas y ventas.">
              <div className={`${inputCls} tabular bg-zinc-50`}>
                {cantidad(p.stock)} {nombreUnidad(p.stock, p.unidad)}
              </div>
            </Campo>
          ) : (
            <Campo label="Stock inicial" htmlFor="stock_inicial" error={err.stock_inicial} ayuda="Lo que tienes hoy.">
              <input id="stock_inicial" name="stock_inicial" type="number" step="any" min="0" defaultValue="0" className={`${inputCls} tabular`} />
            </Campo>
          )}
          <Campo label="Stock mínimo" htmlFor="stock_minimo" error={err.stock_minimo} ayuda="Avisa cuando llegue aquí.">
            <input
              id="stock_minimo"
              name="stock_minimo"
              type="number"
              step="any"
              min="0"
              defaultValue={p?.stock_minimo ?? 0}
              className={`${inputCls} tabular`}
            />
          </Campo>
          <Campo label="Ubicación" htmlFor="ubicacion" ayuda="Estante, pasillo, bodega…">
            <input id="ubicacion" name="ubicacion" defaultValue={p?.ubicacion ?? ""} className={inputCls} />
          </Campo>
        </div>
      </Tarjeta>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        {estado.error && (
          <div className="mr-auto">
            <Aviso tipo="error">{estado.error}</Aviso>
          </div>
        )}
        <Link href={p ? `/productos/${p.id}` : "/productos"} className={btnSecundario}>
          Cancelar
        </Link>
        <button type="submit" disabled={pendiente} className={btnPrimario}>
          {pendiente ? "Guardando…" : p ? "Guardar cambios" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
