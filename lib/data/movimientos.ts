import "server-only";
import { db, type TipoMovimiento } from "../db";

export type Movimiento = {
  id: number;
  producto_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
  venta_id: number | null;
  entrada_id: number | null;
  nota: string | null;
  creado_en: string;
  producto: string;
  codigo: string;
  unidad: string;
};

export type FiltrosMovimientos = {
  productoId?: number;
  tipo?: TipoMovimiento;
  q?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  pagina?: number;
  porPagina?: number;
};

export function listarMovimientos(f: FiltrosMovimientos): { movimientos: Movimiento[]; total: number } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.productoId) {
    where.push("mv.producto_id = ?");
    params.push(f.productoId);
  }
  if (f.tipo) {
    where.push("mv.tipo = ?");
    params.push(f.tipo);
  }
  if (f.q?.trim()) {
    where.push("(p.nombre LIKE ? OR p.codigo LIKE ?)");
    params.push(`%${f.q.trim()}%`, `%${f.q.trim()}%`);
  }
  if (f.desde) {
    where.push("mv.creado_en >= ?");
    params.push(`${f.desde} 00:00:00`);
  }
  if (f.hasta) {
    where.push("mv.creado_en <= ?");
    params.push(`${f.hasta} 23:59:59`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const desdeTabla = "FROM movimientos mv JOIN productos p ON p.id = mv.producto_id";
  const total = (db.prepare(`SELECT COUNT(*) AS n ${desdeTabla} ${whereSql}`).get(...params) as { n: number }).n;

  const porPagina = f.porPagina ?? 50;
  const pagina = Math.max(1, f.pagina ?? 1);
  const movimientos = db
    .prepare(
      `SELECT mv.*, p.nombre AS producto, p.codigo, p.unidad
       ${desdeTabla} ${whereSql}
       ORDER BY mv.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, porPagina, (pagina - 1) * porPagina) as Movimiento[];

  return { movimientos, total };
}
