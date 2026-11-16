import "server-only";
import { db } from "../db";

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
  const hoy = db
    .prepare(
      `SELECT COUNT(*) AS ventas, IFNULL(SUM(v.total),0) AS total,
              IFNULL(SUM(v.total - (SELECT IFNULL(SUM(ROUND(d.cantidad*d.costo_unitario)),0) FROM venta_detalle d WHERE d.venta_id=v.id)),0) AS ganancia
       FROM ventas v
       WHERE v.estado='completada' AND date(v.creado_en) = date('now','localtime')`,
    )
    .get() as { ventas: number; total: number; ganancia: number };

  const mes = db
    .prepare(
      `SELECT COUNT(*) AS ventas, IFNULL(SUM(total),0) AS total FROM ventas
       WHERE estado='completada' AND strftime('%Y-%m', creado_en) = strftime('%Y-%m','now','localtime')`,
    )
    .get() as { ventas: number; total: number };

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

  // Ventas de los últimos 7 días (incluye días sin ventas)
  const dias = db
    .prepare(
      `WITH RECURSIVE d(n, dia) AS (
         SELECT 6, date('now','localtime','-6 days')
         UNION ALL SELECT n-1, date(dia,'+1 day') FROM d WHERE n > 0
       )
       SELECT d.dia, IFNULL(SUM(v.total),0) AS total, COUNT(v.id) AS ventas
       FROM d LEFT JOIN ventas v ON date(v.creado_en) = d.dia AND v.estado='completada'
       GROUP BY d.dia ORDER BY d.dia`,
    )
    .all() as { dia: string; total: number; ventas: number }[];

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
