import "server-only";
import { db } from "../db";

export type Ajuste = {
  usuario: string | null;
  id: number;
  motivo: string;
  nota: string | null;
  creado_en: string;
  productos: number;
  /** Valor de la diferencia a precio de costo (centavos). Negativo = pérdida. */
  valor: number;
};

export type AjusteDetalle = {
  id: number;
  producto_id: number;
  producto: string;
  codigo: string;
  unidad: string;
  imagen: string | null;
  stock_anterior: number;
  stock_nuevo: number;
  diferencia: number;
  costo_unitario: number;
};

const SELECT = `
  SELECT a.*, (SELECT u.nombre FROM usuarios u WHERE u.id = a.usuario_id) AS usuario,
    (SELECT COUNT(*) FROM ajuste_detalle d WHERE d.ajuste_id = a.id) AS productos,
    (SELECT IFNULL(SUM(ROUND(d.diferencia * d.costo_unitario)),0) FROM ajuste_detalle d WHERE d.ajuste_id = a.id) AS valor
  FROM ajustes a
`;

export function listarAjustes(f: { desde?: string; hasta?: string; pagina?: number; porPagina?: number }) {
  const w: string[] = [];
  const params: unknown[] = [];
  if (f.desde) {
    w.push("a.creado_en >= ?");
    params.push(`${f.desde} 00:00:00`);
  }
  if (f.hasta) {
    w.push("a.creado_en <= ?");
    params.push(`${f.hasta} 23:59:59`);
  }
  const where = w.length ? `WHERE ${w.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM ajustes a ${where}`).get(...params) as { n: number }).n;
  const porPagina = f.porPagina ?? 50;
  const pagina = Math.max(1, f.pagina ?? 1);
  const ajustes = db
    .prepare(`${SELECT} ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`)
    .all(...params, porPagina, (pagina - 1) * porPagina) as Ajuste[];
  return { ajustes, total };
}

export function obtenerAjuste(id: number): { ajuste: Ajuste; detalle: AjusteDetalle[] } | undefined {
  const ajuste = db.prepare(`${SELECT} WHERE a.id = ?`).get(id) as Ajuste | undefined;
  if (!ajuste) return undefined;
  const detalle = db
    .prepare(
      `SELECT d.*, p.nombre AS producto, p.codigo, p.unidad, p.imagen
       FROM ajuste_detalle d JOIN productos p ON p.id = d.producto_id
       WHERE d.ajuste_id = ? ORDER BY d.id`,
    )
    .all(id) as AjusteDetalle[];
  return { ajuste, detalle };
}
