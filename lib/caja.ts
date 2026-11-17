import "server-only";
import { METODOS_PAGO } from "./config";
import { db, ErrorNegocio } from "./db";

// Caja: turnos de caja (apertura → ventas, devoluciones, entradas y salidas de efectivo → cierre).
// Solo hay una caja abierta a la vez para todo el negocio.

export type Caja = {
  id: number;
  estado: "abierta" | "cerrada";
  abierta_por: number;
  abierta_por_nombre: string | null;
  abierta_en: string;
  monto_inicial: number;
  cerrada_por: number | null;
  cerrada_por_nombre: string | null;
  cerrada_en: string | null;
  efectivo_esperado: number | null;
  efectivo_contado: number | null;
  diferencia: number | null;
  resumen: string | null;
  nota_cierre: string | null;
};

export type TotalMetodo = { metodo: string; etiqueta: string; cantidad: number; total: number };

export type ResumenCaja = {
  montoInicial: number;
  ventas: TotalMetodo[]; // por método de pago
  devoluciones: TotalMetodo[]; // por el método de pago de la venta original
  numVentas: number;
  totalVentas: number;
  totalDevoluciones: number;
  ingresos: number; // entradas de efectivo que no son ventas
  retiros: number; // salidas de efectivo
  efectivoEsperado: number; // inicial + ventas efectivo - devoluciones efectivo + ingresos - retiros
};

export type MovimientoCaja = {
  id: number;
  tipo: "ingreso" | "retiro";
  monto: number;
  motivo: string;
  usuario: string | null;
  creado_en: string;
};

const SELECT = `
  SELECT c.*, ua.nombre AS abierta_por_nombre, uc.nombre AS cerrada_por_nombre
  FROM cajas c
  LEFT JOIN usuarios ua ON ua.id = c.abierta_por
  LEFT JOIN usuarios uc ON uc.id = c.cerrada_por
`;

export function cajaAbierta(): Caja | undefined {
  return db.prepare(`${SELECT} WHERE c.estado = 'abierta'`).get() as Caja | undefined;
}

export function obtenerCaja(id: number): Caja | undefined {
  return db.prepare(`${SELECT} WHERE c.id = ?`).get(id) as Caja | undefined;
}

/** Para usar dentro de la transacción de una venta o devolución. */
export function idCajaAbierta(accion: string): number {
  const c = db.prepare("SELECT id FROM cajas WHERE estado = 'abierta'").get() as { id: number } | undefined;
  if (!c) throw new ErrorNegocio(`La caja está cerrada. Ábrela en «Caja» para poder ${accion}.`);
  return c.id;
}

export function calcularResumen(cajaId: number, montoInicial: number): ResumenCaja {
  const ventas = db
    .prepare(
      `SELECT metodo_pago AS metodo, COUNT(*) AS cantidad, IFNULL(SUM(total),0) AS total
       FROM ventas WHERE caja_id = ? AND estado = 'completada' GROUP BY metodo_pago`,
    )
    .all(cajaId) as { metodo: string; cantidad: number; total: number }[];
  const devoluciones = db
    .prepare(
      `SELECT v.metodo_pago AS metodo, COUNT(*) AS cantidad, IFNULL(SUM(d.total),0) AS total
       FROM devoluciones d JOIN ventas v ON v.id = d.venta_id
       WHERE d.caja_id = ? GROUP BY v.metodo_pago`,
    )
    .all(cajaId) as { metodo: string; cantidad: number; total: number }[];
  const mov = db
    .prepare(
      `SELECT IFNULL(SUM(CASE WHEN tipo='ingreso' THEN monto END),0) AS ingresos,
              IFNULL(SUM(CASE WHEN tipo='retiro' THEN monto END),0) AS retiros
       FROM caja_movimientos WHERE caja_id = ?`,
    )
    .get(cajaId) as { ingresos: number; retiros: number };

  const porMetodo = (filas: { metodo: string; cantidad: number; total: number }[]): TotalMetodo[] =>
    METODOS_PAGO.map((m) => {
      const f = filas.find((x) => x.metodo === m.valor);
      return { metodo: m.valor, etiqueta: m.etiqueta, cantidad: f?.cantidad ?? 0, total: f?.total ?? 0 };
    });
  const v = porMetodo(ventas);
  const d = porMetodo(devoluciones);
  const efectivo = (l: TotalMetodo[]) => l.find((x) => x.metodo === "efectivo")?.total ?? 0;

  return {
    montoInicial,
    ventas: v,
    devoluciones: d,
    numVentas: v.reduce((s, x) => s + x.cantidad, 0),
    totalVentas: v.reduce((s, x) => s + x.total, 0),
    totalDevoluciones: d.reduce((s, x) => s + x.total, 0),
    ingresos: mov.ingresos,
    retiros: mov.retiros,
    efectivoEsperado: montoInicial + efectivo(v) - efectivo(d) + mov.ingresos - mov.retiros,
  };
}

/** Resumen de una caja: el guardado al cerrarla (no cambia después) o el calculado en vivo si está abierta. */
export function resumenDeCaja(c: Caja): ResumenCaja {
  if (c.estado === "cerrada" && c.resumen) {
    try {
      return JSON.parse(c.resumen) as ResumenCaja;
    } catch {
      /* se recalcula */
    }
  }
  return calcularResumen(c.id, c.monto_inicial);
}

export function movimientosDeCaja(cajaId: number): MovimientoCaja[] {
  return db
    .prepare(
      `SELECT m.id, m.tipo, m.monto, m.motivo, u.nombre AS usuario, m.creado_en
       FROM caja_movimientos m LEFT JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.caja_id = ? ORDER BY m.id`,
    )
    .all(cajaId) as MovimientoCaja[];
}

export type VentaDeCaja = {
  id: number;
  creado_en: string;
  metodo_pago: string;
  total: number;
  estado: string;
  vendedor: string | null;
  devuelto: number;
};

export function ventasDeCaja(cajaId: number): VentaDeCaja[] {
  return db
    .prepare(
      `SELECT v.id, v.creado_en, v.metodo_pago, v.total, v.estado, u.nombre AS vendedor,
              (SELECT IFNULL(SUM(d.total),0) FROM devoluciones d WHERE d.venta_id = v.id) AS devuelto
       FROM ventas v LEFT JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.caja_id = ? ORDER BY v.id`,
    )
    .all(cajaId) as VentaDeCaja[];
}

export function listarCajas(pagina = 1, porPagina = 30): { cajas: Caja[]; total: number } {
  const total = (db.prepare("SELECT COUNT(*) AS n FROM cajas").get() as { n: number }).n;
  const cajas = db
    .prepare(`${SELECT} ORDER BY c.id DESC LIMIT ? OFFSET ?`)
    .all(porPagina, (Math.max(1, pagina) - 1) * porPagina) as Caja[];
  return { cajas, total };
}

export function ultimoCierre(): Caja | undefined {
  return db.prepare(`${SELECT} WHERE c.estado = 'cerrada' ORDER BY c.id DESC LIMIT 1`).get() as Caja | undefined;
}
