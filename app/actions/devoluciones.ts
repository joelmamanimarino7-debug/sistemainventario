"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin, usuarioDeAccion } from "@/lib/auth";
import { MOTIVOS_DEVOLUCION } from "@/lib/config";
import { db, ErrorNegocio, redondear, registrarMovimiento } from "@/lib/db";
import { mensajeError } from "@/lib/forms";
import type { ResultadoOperacion } from "./entradas";

export type RenglonDevolucion = { ventaDetalleId: number; cantidad: number; reingresa: boolean };

type Linea = {
  id: number;
  producto_id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  devuelto: number;
};

/**
 * Devolución parcial o total de una venta. El dinero devuelto se calcula con el precio de la venta
 * y el descuento repartido en proporción, así la suma de devoluciones nunca supera lo cobrado.
 */
export async function registrarDevolucion(datos: {
  ventaId: number;
  motivo: string;
  nota: string | null;
  renglones: RenglonDevolucion[];
}): Promise<ResultadoOperacion> {
  try {
    const yo = await usuarioDeAccion();
    if (!(MOTIVOS_DEVOLUCION as readonly string[]).includes(datos.motivo)) throw new ErrorNegocio("Elige un motivo.");
    const renglones = datos.renglones.filter((r) => r.cantidad > 0);
    if (!renglones.length) throw new ErrorNegocio("Indica cuánto se devuelve de al menos un producto.");

    const id = db.transaction(() => {
      const venta = db.prepare("SELECT id, subtotal, total, estado FROM ventas WHERE id = ?").get(datos.ventaId) as
        | { id: number; subtotal: number; total: number; estado: string }
        | undefined;
      if (!venta) throw new ErrorNegocio("La venta no existe.");
      if (venta.estado !== "completada") throw new ErrorNegocio("La venta está anulada; no admite devoluciones.");

      const lineas = db
        .prepare(
          `SELECT d.id, d.producto_id, p.nombre AS producto, d.cantidad, d.precio_unitario, d.costo_unitario,
                  (SELECT IFNULL(SUM(dd.cantidad),0) FROM devolucion_detalle dd WHERE dd.venta_detalle_id = d.id) AS devuelto
           FROM venta_detalle d JOIN productos p ON p.id = d.producto_id WHERE d.venta_id = ?`,
        )
        .all(venta.id) as Linea[];
      const porId = new Map(lineas.map((l) => [l.id, l]));
      const factor = venta.subtotal > 0 ? venta.total / venta.subtotal : 0; // descuento prorrateado

      const items = renglones.map((r) => {
        const l = porId.get(r.ventaDetalleId);
        if (!l) throw new ErrorNegocio("Uno de los productos no pertenece a esta venta.");
        const cant = redondear(r.cantidad);
        const disponible = redondear(l.cantidad - l.devuelto);
        if (!Number.isFinite(cant) || cant <= 0) throw new ErrorNegocio("Las cantidades deben ser mayores a 0.");
        if (cant > disponible)
          throw new ErrorNegocio(`De "${l.producto}" solo se pueden devolver ${disponible} (ya se devolvieron ${l.devuelto}).`);
        l.devuelto = redondear(l.devuelto + cant);
        return { l, cant, reingresa: r.reingresa, importe: Math.round(cant * l.precio_unitario * factor) };
      });

      // Si con esta devolución se devuelve todo, ajustamos centavos de redondeo para que lo devuelto = total cobrado.
      let total = items.reduce((s, i) => s + i.importe, 0);
      const todoDevuelto = lineas.every((l) => l.devuelto >= l.cantidad);
      if (todoDevuelto) {
        const previo = (
          db.prepare("SELECT IFNULL(SUM(total),0) AS t FROM devoluciones WHERE venta_id = ?").get(venta.id) as { t: number }
        ).t;
        const exacto = venta.total - previo;
        items[items.length - 1].importe += exacto - total;
        total = exacto;
      }

      const dv = db
        .prepare("INSERT INTO devoluciones (venta_id, motivo, nota, total, usuario_id) VALUES (?, ?, ?, ?, ?)")
        .run(venta.id, datos.motivo, datos.nota?.trim() || null, total, yo.id);
      const devolucionId = Number(dv.lastInsertRowid);
      const ins = db.prepare(
        `INSERT INTO devolucion_detalle (devolucion_id, venta_detalle_id, producto_id, cantidad, importe, costo_unitario, reingresa)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const i of items) {
        ins.run(devolucionId, i.l.id, i.l.producto_id, i.cant, i.importe, i.l.costo_unitario, i.reingresa ? 1 : 0);
        if (i.reingresa) {
          registrarMovimiento({
            productoId: i.l.producto_id,
            tipo: "devolucion",
            cantidad: i.cant,
            ventaId: venta.id,
            devolucionId,
            nota: datos.motivo,
            usuario: yo.nombre,
          });
        }
      }
      return devolucionId;
    })();

    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

/**
 * Anula una venta registrada por error: todo vuelve al stock y la venta deja de contar en los totales.
 * Solo se permite si la venta no tiene devoluciones (en ese caso hay que devolver lo que falta).
 */
export async function anularVenta(fd: FormData) {
  const yo = await exigirAdmin();
  const ventaId = Number(fd.get("id"));
  db.transaction(() => {
    const venta = db.prepare("SELECT estado FROM ventas WHERE id = ?").get(ventaId) as { estado: string } | undefined;
    if (!venta) throw new ErrorNegocio("La venta no existe.");
    if (venta.estado !== "completada") throw new ErrorNegocio("La venta ya está anulada.");
    if (db.prepare("SELECT 1 FROM devoluciones WHERE venta_id = ?").get(ventaId))
      throw new ErrorNegocio("Esta venta tiene devoluciones; registra una devolución por lo que falta en lugar de anularla.");
    const lineas = db.prepare("SELECT producto_id, cantidad FROM venta_detalle WHERE venta_id = ?").all(ventaId) as {
      producto_id: number;
      cantidad: number;
    }[];
    for (const l of lineas) {
      registrarMovimiento({
        productoId: l.producto_id,
        tipo: "devolucion",
        cantidad: l.cantidad,
        ventaId,
        nota: "Venta anulada",
        usuario: yo.nombre,
      });
    }
    db.prepare("UPDATE ventas SET estado = 'cancelada' WHERE id = ?").run(ventaId);
  })();
  revalidatePath("/", "layout");
}
