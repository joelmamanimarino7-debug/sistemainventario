"use server";

import { revalidatePath } from "next/cache";
import { METODOS_PAGO } from "@/lib/config";
import { db, ErrorNegocio, redondear, registrarMovimiento } from "@/lib/db";
import { mensajeError } from "@/lib/forms";
import type { ResultadoOperacion } from "./entradas";

export type RenglonVenta = { productoId: number; cantidad: number; precioUnitario: number /* centavos */ };

export async function registrarVenta(datos: {
  cliente: string | null;
  metodoPago: string;
  descuento: number; // centavos
  pagoCon: number | null; // centavos
  nota: string | null;
  renglones: RenglonVenta[];
}): Promise<ResultadoOperacion> {
  try {
    if (!datos.renglones.length) throw new ErrorNegocio("La venta no tiene productos.");
    if (!METODOS_PAGO.some((m) => m.valor === datos.metodoPago)) throw new ErrorNegocio("Método de pago no válido.");
    for (const r of datos.renglones) {
      if (!Number.isFinite(r.cantidad) || r.cantidad <= 0) throw new ErrorNegocio("Todas las cantidades deben ser mayores a 0.");
      if (!Number.isInteger(r.precioUnitario) || r.precioUnitario < 0) throw new ErrorNegocio("Hay un precio no válido.");
    }
    const descuento = Math.max(0, Math.round(datos.descuento || 0));

    const id = db.transaction(() => {
      // Tomamos el costo vigente de cada producto para poder calcular la ganancia después.
      const lineas = datos.renglones.map((r) => {
        const prod = db.prepare("SELECT id, nombre, precio_costo, activo FROM productos WHERE id = ?").get(r.productoId) as
          | { id: number; nombre: string; precio_costo: number; activo: number }
          | undefined;
        if (!prod) throw new ErrorNegocio(`El producto #${r.productoId} no existe.`);
        if (!prod.activo) throw new ErrorNegocio(`"${prod.nombre}" está dado de baja y no se puede vender.`);
        const cant = redondear(r.cantidad);
        return { ...r, cantidad: cant, costo: prod.precio_costo, subtotal: Math.round(cant * r.precioUnitario) };
      });

      const subtotal = lineas.reduce((s, l) => s + l.subtotal, 0);
      if (descuento > subtotal) throw new ErrorNegocio("El descuento no puede ser mayor que el subtotal.");
      const total = subtotal - descuento;
      if (datos.metodoPago === "efectivo" && datos.pagoCon != null && datos.pagoCon < total) {
        throw new ErrorNegocio("El efectivo recibido es menor que el total.");
      }

      const v = db
        .prepare(
          `INSERT INTO ventas (cliente, metodo_pago, subtotal, descuento, total, pago_con, nota)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          datos.cliente?.trim() || null,
          datos.metodoPago,
          subtotal,
          descuento,
          total,
          datos.metodoPago === "efectivo" ? datos.pagoCon : null,
          datos.nota?.trim() || null,
        );
      const ventaId = Number(v.lastInsertRowid);

      const ins = db.prepare(
        `INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const l of lineas) {
        ins.run(ventaId, l.productoId, l.cantidad, l.precioUnitario, l.costo, l.subtotal);
        // Lanza error (y deshace toda la venta) si no hay stock suficiente.
        registrarMovimiento({ productoId: l.productoId, tipo: "venta", cantidad: -l.cantidad, ventaId });
      }
      return ventaId;
    })();

    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
