import { usuarioActual } from "@/lib/auth";
import type { TipoMovimiento } from "@/lib/db";
import { descargarLibro, nombreConFecha } from "@/lib/excel";
import { libroMovimientos, libroReporte, libroVentas } from "@/lib/exportaciones";
import { resolverPeriodo } from "@/lib/periodos";
import { libroProductos, listarParaExportar } from "@/lib/productosExcel";

// Descargas en Excel: /api/exportar/productos, /plantilla, /ventas, /movimientos y /reporte.
// Aceptan los mismos filtros de la URL que sus pantallas (desde, hasta, tipo, q, producto).

const fecha = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);
const TIPOS: TipoMovimiento[] = ["entrada", "venta", "ajuste", "devolucion"];

export async function GET(req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const yo = await usuarioActual();
  if (!yo) return new Response("Inicia sesión para descargar.", { status: 401 });
  if (yo.rol !== "admin") return new Response("Solo un administrador puede descargar estos datos.", { status: 403 });
  const { tipo } = await params;
  const sp = new URL(req.url).searchParams;
  const desde = fecha(sp.get("desde"));
  const hasta = fecha(sp.get("hasta"));
  const rango = desde || hasta ? `${desde ?? "inicio"}_a_${hasta ?? "hoy"}` : undefined;

  switch (tipo) {
    case "productos":
      return descargarLibro(libroProductos(listarParaExportar()), nombreConFecha("productos"));
    case "plantilla":
      return descargarLibro(libroProductos([], true), "plantilla-productos.xlsx");
    case "ventas":
      return descargarLibro(libroVentas({ desde, hasta }), nombreConFecha("ventas", rango));
    case "movimientos": {
      const t = sp.get("tipo") as TipoMovimiento | null;
      return descargarLibro(
        libroMovimientos({
          desde,
          hasta,
          q: sp.get("q") ?? undefined,
          tipo: t && TIPOS.includes(t) ? t : undefined,
          productoId: Number(sp.get("producto")) || undefined,
        }),
        nombreConFecha("movimientos", rango),
      );
    }
    case "reporte": {
      const p = resolverPeriodo({ desde, hasta, periodo: sp.get("periodo") ?? undefined });
      return descargarLibro(libroReporte(p), nombreConFecha("reporte", `${p.desde}_a_${p.hasta}`));
    }
    default:
      return new Response("No existe esa exportación.", { status: 404 });
  }
}
