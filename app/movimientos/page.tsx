import type { Metadata } from "next";
import Link from "next/link";
import { btnSecundario, inputCls } from "@/components/estilos";
import { Paginacion } from "@/components/Paginacion";
import { TablaMovimientos } from "@/components/TablaMovimientos";
import { Encabezado, Tarjeta, Vacio } from "@/components/ui";
import type { TipoMovimiento } from "@/lib/db";
import { listarMovimientos } from "@/lib/data/movimientos";
import { obtenerProducto } from "@/lib/data/productos";

export const metadata: Metadata = { title: "Movimientos" };

type SP = { q?: string; tipo?: string; desde?: string; hasta?: string; producto?: string; pagina?: string };
const TIPOS: { valor: TipoMovimiento; texto: string }[] = [
  { valor: "entrada", texto: "Entradas" },
  { valor: "venta", texto: "Ventas" },
  { valor: "ajuste", texto: "Ajustes" },
  { valor: "devolucion", texto: "Devoluciones" },
];

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const tipo = TIPOS.some((t) => t.valor === sp.tipo) ? (sp.tipo as TipoMovimiento) : undefined;
  const productoId = Number(sp.producto) || undefined;
  const producto = productoId ? obtenerProducto(productoId) : undefined;
  const { movimientos, total } = listarMovimientos({
    q: sp.q,
    tipo,
    desde: sp.desde,
    hasta: sp.hasta,
    productoId,
    pagina,
  });
  const hayFiltros = !!(sp.q || tipo || sp.desde || sp.hasta || productoId);

  return (
    <>
      <Encabezado
        titulo="Movimientos de inventario"
        descripcion={
          producto ? (
            <>
              Mostrando solo{" "}
              <Link href={`/productos/${producto.id}`} className="font-medium text-teal-700 hover:underline">
                {producto.nombre}
              </Link>
            </>
          ) : (
            "Cada cambio de stock queda registrado aquí: entradas, ventas, ajustes y devoluciones."
          )
        }
      />
      <form method="get" className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_160px_auto]">
        {productoId && <input type="hidden" name="producto" value={productoId} />}
        {!productoId && (
          <input name="q" type="search" defaultValue={sp.q} placeholder="Buscar producto…" className={`${inputCls} sm:col-span-2 xl:col-span-1`} />
        )}
        <select name="tipo" defaultValue={tipo ?? ""} className={inputCls} aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>
        <input type="date" name="desde" defaultValue={sp.desde} className={inputCls} aria-label="Desde" />
        <input type="date" name="hasta" defaultValue={sp.hasta} className={inputCls} aria-label="Hasta" />
        <div className="flex gap-2">
          <button className={btnSecundario}>Filtrar</button>
          {hayFiltros && (
            <Link href="/movimientos" className={btnSecundario}>
              Limpiar
            </Link>
          )}
        </div>
      </form>
      <Tarjeta className="overflow-hidden">
        {movimientos.length === 0 ? (
          <Vacio titulo={hayFiltros ? "No hay movimientos con esos filtros" : "Aún no hay movimientos"} />
        ) : (
          <>
            <TablaMovimientos movimientos={movimientos} conProducto={!productoId} />
            <Paginacion
              ruta="/movimientos"
              params={{ q: sp.q, tipo, desde: sp.desde, hasta: sp.hasta, producto: sp.producto }}
              pagina={pagina}
              total={total}
              porPagina={50}
            />
          </>
        )}
      </Tarjeta>
    </>
  );
}
