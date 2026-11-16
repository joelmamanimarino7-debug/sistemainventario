import "server-only";
import { db } from "../db";

export type Venta = {
  id: number;
  cliente: string | null;
  metodo_pago: string;
  subtotal: number;
  descuento: number;
  total: number;
  pago_con: number | null;
  nota: string | null;
  estado: "completada" | "cancelada";
  creado_en: string;
  renglones: number;
  unidades: number;
  costo: number; // costo total de lo vendido (para ganancia)
};

export type VentaDetalle = {
  id: number;
  producto_id: number;
  producto: string;
  codigo: string;
  unidad: string;
  imagen: string | null;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
};

const SELECT = `
  SELECT v.*,
    (SELECT COUNT(*) FROM venta_detalle d WHERE d.venta_id = v.id) AS renglones,
    (SELECT IFNULL(SUM(d.cantidad),0) FROM venta_detalle d WHERE d.venta_id = v.id) AS unidades,
    (SELECT IFNULL(SUM(ROUND(d.cantidad * d.costo_unitario)),0) FROM venta_detalle d WHERE d.venta_id = v.id) AS costo
  FROM ventas v
`;

export type FiltrosVentas = { desde?: string; hasta?: string; metodo?: string; pagina?: number; porPagina?: number };

function where(f: FiltrosVentas) {
  const w: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    w.push("v.creado_en >= ?");
    params.push(`${f.desde} 00:00:00`);
  }
  if (f.hasta) {
    w.push("v.creado_en <= ?");
    params.push(`${f.hasta} 23:59:59`);
  }
  if (f.metodo) {
    w.push("v.metodo_pago = ?");
    params.push(f.metodo);
  }
  return { sql: w.length ? `WHERE ${w.join(" AND ")}` : "", params };
}

export function listarVentas(f: FiltrosVentas) {
  const { sql, params } = where(f);
  const resumen = db
    .prepare(
      `SELECT COUNT(*) AS n, IFNULL(SUM(CASE WHEN v.estado='completada' THEN v.total END),0) AS total
       FROM ventas v ${sql}`,
    )
    .get(...params) as { n: number; total: number };
  const porPagina = f.porPagina ?? 50;
  const pagina = Math.max(1, f.pagina ?? 1);
  const ventas = db
    .prepare(`${SELECT} ${sql} ORDER BY v.id DESC LIMIT ? OFFSET ?`)
    .all(...params, porPagina, (pagina - 1) * porPagina) as Venta[];
  return { ventas, total: resumen.n, importe: resumen.total };
}

export function obtenerVenta(id: number): { venta: Venta; detalle: VentaDetalle[] } | undefined {
  const venta = db.prepare(`${SELECT} WHERE v.id = ?`).get(id) as Venta | undefined;
  if (!venta) return undefined;
  const detalle = db
    .prepare(
      `SELECT d.*, p.nombre AS producto, p.codigo, p.unidad, p.imagen
       FROM venta_detalle d JOIN productos p ON p.id = d.producto_id
       WHERE d.venta_id = ? ORDER BY d.id`,
    )
    .all(id) as VentaDetalle[];
  return { venta, detalle };
}
