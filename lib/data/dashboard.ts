import "server-only";
import { db } from "../db";
import { isoLocal } from "../format";
import { resumenPeriodo, seriePeriodo } from "./reportes";

export type ProductoStockBajo = {
  id: number;
  codigo: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
  unidad: string;
  proveedor: string | null;
  imagen: string | null;
};

export function resumenInicio() {
  // Ventas netas: ya descuentan devoluciones y no cuentan las ventas anuladas.
  const ahora = new Date();
  const hoyIso = isoLocal(ahora);
  const hoy = resumenPeriodo({ desde: hoyIso, hasta: hoyIso });
  const mes = resumenPeriodo({ desde: isoLocal(new Date(ahora.getFullYear(), ahora.getMonth(), 1)), hasta: hoyIso });

  const inventario = db
    .prepare(
      `SELECT COUNT(*) AS productos,
              IFNULL(SUM(ROUND(stock*precio_costo)),0) AS valor_costo,
              IFNULL(SUM(ROUND(stock*precio_venta)),0) AS valor_venta,
              SUM(CASE WHEN stock <= stock_minimo THEN 1 ELSE 0 END) AS bajos,
              SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS agotados
       FROM productos WHERE activo = 1`,
    )
    .get() as { productos: number; valor_costo: number; valor_venta: number; bajos: number | null; agotados: number | null };

  const stockBajo = db
    .prepare(
      `SELECT p.id, p.codigo, p.nombre, p.stock, p.stock_minimo, p.unidad, p.imagen, pr.nombre AS proveedor
       FROM productos p LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
       WHERE p.activo = 1 AND p.stock <= p.stock_minimo
       ORDER BY p.stock <= 0 DESC, (p.stock * 1.0 / NULLIF(p.stock_minimo,0)) ASC, p.nombre
       LIMIT 10`,
    )
    .all() as ProductoStockBajo[];

  // Ventas netas de los últimos 7 días (incluye días sin ventas)
  const dias = seriePeriodo({ desde: isoLocal(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6)), hasta: hoyIso })
    .puntos.map((p) => ({ dia: p.clave, total: p.netas, ventas: p.ventas }));

  const masVendidos = db
    .prepare(
      `SELECT p.id, p.nombre, p.unidad, p.imagen, SUM(d.cantidad) AS cantidad, SUM(d.subtotal) AS importe
       FROM venta_detalle d
       JOIN ventas v ON v.id = d.venta_id AND v.estado='completada'
       JOIN productos p ON p.id = d.producto_id
       WHERE v.creado_en >= datetime('now','localtime','-30 days')
       GROUP BY p.id ORDER BY cantidad DESC LIMIT 5`,
    )
    .all() as { id: number; nombre: string; unidad: string; imagen: string | null; cantidad: number; importe: number }[];

  return {
    hoy,
    mes,
    inventario: { ...inventario, bajos: inventario.bajos ?? 0, agotados: inventario.agotados ?? 0 },
    stockBajo,
    dias,
    masVendidos,
  };
}
