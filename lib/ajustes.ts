import "server-only";
import { db, ErrorNegocio, redondear, registrarMovimiento } from "./db";

export type RenglonAjuste = {
  productoId: number;
  /** "conteo": `valor` es el stock real contado. "diferencia": `valor` se suma (o resta, si es negativo). */
  modo: "conteo" | "diferencia";
  valor: number;
};

/**
 * Crea un ajuste de inventario con sus movimientos. Debe llamarse dentro de db.transaction().
 * Los renglones sin diferencia se ignoran. Devuelve el id del ajuste, o null si no hubo nada que ajustar.
 */
export function crearAjuste(datos: { motivo: string; nota: string | null; renglones: RenglonAjuste[] }): number | null {
  const lineas: { productoId: number; anterior: number; nuevo: number; costo: number }[] = [];
  const vistos = new Set<number>();
  for (const r of datos.renglones) {
    if (!Number.isFinite(r.valor)) throw new ErrorNegocio("Hay una cantidad no válida.");
    if (vistos.has(r.productoId)) throw new ErrorNegocio("Un producto aparece dos veces en el ajuste.");
    vistos.add(r.productoId);
    const p = db.prepare("SELECT nombre, stock, precio_costo FROM productos WHERE id = ?").get(r.productoId) as
      | { nombre: string; stock: number; precio_costo: number }
      | undefined;
    if (!p) throw new ErrorNegocio(`El producto #${r.productoId} no existe.`);
    const nuevo = redondear(r.modo === "conteo" ? r.valor : p.stock + r.valor);
    if (nuevo < 0) throw new ErrorNegocio(`"${p.nombre}" quedaría con stock negativo (${nuevo}).`);
    if (nuevo !== p.stock) lineas.push({ productoId: r.productoId, anterior: p.stock, nuevo, costo: p.precio_costo });
  }
  if (lineas.length === 0) return null;

  const a = db.prepare("INSERT INTO ajustes (motivo, nota) VALUES (?, ?)").run(datos.motivo, datos.nota?.trim() || null);
  const ajusteId = Number(a.lastInsertRowid);
  const ins = db.prepare(
    `INSERT INTO ajuste_detalle (ajuste_id, producto_id, stock_anterior, stock_nuevo, diferencia, costo_unitario)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const l of lineas) {
    const diferencia = redondear(l.nuevo - l.anterior);
    ins.run(ajusteId, l.productoId, l.anterior, l.nuevo, diferencia, l.costo);
    registrarMovimiento({ productoId: l.productoId, tipo: "ajuste", cantidad: diferencia, ajusteId, nota: datos.motivo });
  }
  return ajusteId;
}
