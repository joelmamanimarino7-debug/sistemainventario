import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cambiarEstadoProducto } from "@/app/actions/productos";
import { BotonConfirmar, BotonEnviar } from "@/components/botones";
import { btnPeligro, btnPrimario, btnSecundario } from "@/components/estilos";
import { EstadoStock } from "@/components/EstadoStock";
import { Miniatura, urlImagen } from "@/components/Foto";
import { TablaMovimientos } from "@/components/TablaMovimientos";
import { Aviso, Dato, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { listarMovimientos } from "@/lib/data/movimientos";
import { obtenerProducto } from "@/lib/data/productos";
import { cantidad, dinero, fecha, medidas, nombreUnidad } from "@/lib/format";

export const metadata: Metadata = { title: "Producto" };

export default async function ProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string; guardado?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const p = obtenerProducto(Number(id));
  if (!p) notFound();

  const { movimientos, total } = listarMovimientos({ productoId: p.id, porPagina: 30 });
  const ganancia = p.precio_venta - p.precio_costo;
  const margen = p.precio_venta > 0 ? Math.round((ganancia / p.precio_venta) * 1000) / 10 : 0;

  return (
    <>
      <Encabezado
        volver={{ href: "/productos", texto: "Productos" }}
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {p.nombre}
            {!p.activo && <Etiqueta>Inactivo</Etiqueta>}
          </span>
        }
        descripcion={
          <>
            <span className="font-mono">{p.codigo}</span>
            {p.codigo_barras && <span className="font-mono"> · {p.codigo_barras}</span>}
          </>
        }
        acciones={
          <>
            {p.activo ? (
              <>
                <Link href={`/entradas/nueva?producto=${p.id}`} className={btnSecundario}>
                  ↓ Registrar entrada
                </Link>
                <Link href={`/productos/${p.id}/editar`} className={btnPrimario}>
                  Editar
                </Link>
                <form action={cambiarEstadoProducto}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="activo" value="0" />
                  <BotonConfirmar
                    className={btnPeligro}
                    mensaje={`¿Eliminar "${p.nombre}"?\n\nEl producto dejará de aparecer en la lista y en las ventas, pero su historial se conserva. Podrás reactivarlo después.`}
                  >
                    Eliminar
                  </BotonConfirmar>
                </form>
              </>
            ) : (
              <form action={cambiarEstadoProducto}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="activo" value="1" />
                <BotonEnviar className={btnPrimario} textoCargando="Reactivando…">
                  Reactivar producto
                </BotonEnviar>
              </form>
            )}
          </>
        }
      />

      {(sp.creado || sp.guardado) && (
        <div className="mb-4">
          <Aviso tipo="ok">{sp.creado ? "Producto registrado correctamente." : "Cambios guardados."}</Aviso>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tarjeta className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Stock</p>
          <p className="tabular mt-1 text-3xl font-semibold text-zinc-900">
            {cantidad(p.stock)} <span className="text-base font-normal text-zinc-500">{nombreUnidad(p.stock, p.unidad)}</span>
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            Mínimo {cantidad(p.stock_minimo)} <EstadoStock stock={p.stock} minimo={p.stock_minimo} />
          </div>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Precio de venta</p>
          <p className="tabular mt-1 text-3xl font-semibold text-zinc-900">{dinero(p.precio_venta)}</p>
          <p className="tabular mt-1 text-xs text-zinc-500">
            Costo {dinero(p.precio_costo)} · Ganancia{" "}
            <span className={ganancia < 0 ? "text-red-600" : ""}>
              {dinero(ganancia)} ({cantidad(margen)}%)
            </span>
          </p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Valor en inventario</p>
          <p className="tabular mt-1 text-3xl font-semibold text-zinc-900">{dinero(Math.round(p.stock * p.precio_costo))}</p>
          <p className="tabular mt-1 text-xs text-zinc-500">A precio de venta: {dinero(Math.round(p.stock * p.precio_venta))}</p>
        </Tarjeta>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-6 self-start">
        <Tarjeta className="overflow-hidden">
          {p.imagen ? (
            <a href={urlImagen(p.imagen)} target="_blank" rel="noreferrer" title="Ver foto completa">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlImagen(p.imagen)} alt={p.nombre} className="h-80 w-full bg-zinc-50 object-contain lg:h-auto lg:aspect-square" />
            </a>
          ) : (
            <Link
              href={`/productos/${p.id}/editar`}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-zinc-50 text-sm text-zinc-500 hover:text-teal-700"
            >
              <Miniatura imagen={null} alt="" tam={56} className="border-0 bg-transparent" />
              Sin foto · Agregar una
            </Link>
          )}
        </Tarjeta>
        <Tarjeta titulo="Detalles">
          <dl className="grid grid-cols-2 gap-4 p-4">
            <Dato etiqueta="Categoría">{p.categoria}</Dato>
            <Dato etiqueta="Marca">{p.marca}</Dato>
            <Dato etiqueta="Modelo">{p.modelo}</Dato>
            <Dato etiqueta="Proveedor">{p.proveedor}</Dato>
            <Dato etiqueta="Medidas">{medidas(p)}</Dato>
            <Dato etiqueta="Peso">{p.peso != null ? `${cantidad(p.peso)} kg` : null}</Dato>
            <Dato etiqueta="Color">{p.color}</Dato>
            <Dato etiqueta="Material">{p.material}</Dato>
            <Dato etiqueta="Ubicación">{p.ubicacion}</Dato>
            <Dato etiqueta="Se vende por">{p.unidad}</Dato>
            <div className="col-span-2">
              <Dato etiqueta="Descripción">
                {p.descripcion && <span className="whitespace-pre-line">{p.descripcion}</span>}
              </Dato>
            </div>
            <Dato etiqueta="Registrado">{fecha(p.creado_en)}</Dato>
            <Dato etiqueta="Última modificación">{fecha(p.actualizado_en)}</Dato>
          </dl>
        </Tarjeta>
        </div>

        <Tarjeta
          titulo="Historial de movimientos"
          className="self-start overflow-hidden"
          acciones={
            total > movimientos.length ? (
              <Link href={`/movimientos?producto=${p.id}`} className="text-sm text-teal-700 hover:underline">
                Ver los {total}
              </Link>
            ) : null
          }
        >
          {movimientos.length === 0 ? (
            <Vacio titulo="Sin movimientos todavía" texto="Aquí aparecerán las entradas y ventas de este producto." />
          ) : (
            <TablaMovimientos movimientos={movimientos} conProducto={false} />
          )}
        </Tarjeta>
      </div>
    </>
  );
}
