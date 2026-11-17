import "server-only";
import { db } from "../db";

export type Entrada = {
  usuario: string | null;
  id: number;
  proveedor_id: number | null;
  proveedor: string | null;
  referencia: string | null;
  total: number;
  nota: string | null;
  creado_en: string;
  renglones: number;
  piezas: number;
};

export type EntradaDetalle = {
  id: number;
  producto_id: number;
  producto: string;
  codigo: string;
  unidad: string;
  imagen: string | null;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
};

const SELECT = `
  SELECT e.*, pr.nombre AS proveedor, (SELECT u.nombre FROM usuarios u WHERE u.id = e.usuario_id) AS usuario,
         (SELECT COUNT(*) FROM entrada_detalle d WHERE d.entrada_id = e.id) AS renglones,
         (SELECT IFNULL(SUM(cantidad),0) FROM entrada_detalle d WHERE d.entrada_id = e.id) AS piezas
  FROM entradas e LEFT JOIN proveedores pr ON pr.id = e.proveedor_id
`;

export function listarEntradas(f: { desde?: string; hasta?: string; pagina?: number; porPagina?: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    where.push("e.creado_en >= ?");
    params.push(`${f.desde} 00:00:00`);
  }
  if (f.hasta) {
    where.push("e.creado_en <= ?");
    params.push(`${f.hasta} 23:59:59`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM entradas e ${whereSql}`).get(...params) as { n: number }).n;
  const porPagina = f.porPagina ?? 50;
  const pagina = Math.max(1, f.pagina ?? 1);
  const entradas = db
    .prepare(`${SELECT} ${whereSql} ORDER BY e.id DESC LIMIT ? OFFSET ?`)
    .all(...params, porPagina, (pagina - 1) * porPagina) as Entrada[];
  return { entradas, total };
}

export function obtenerEntrada(id: number): { entrada: Entrada; detalle: EntradaDetalle[] } | undefined {
  const entrada = db.prepare(`${SELECT} WHERE e.id = ?`).get(id) as Entrada | undefined;
  if (!entrada) return undefined;
  const detalle = db
    .prepare(
      `SELECT d.*, p.nombre AS producto, p.codigo, p.unidad, p.imagen
       FROM entrada_detalle d JOIN productos p ON p.id = d.producto_id
       WHERE d.entrada_id = ? ORDER BY d.id`,
    )
    .all(id) as EntradaDetalle[];
  return { entrada, detalle };
}
