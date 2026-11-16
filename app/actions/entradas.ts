"use server";

import { revalidatePath } from "next/cache";
import { db, ErrorNegocio, redondear, registrarMovimiento } from "@/lib/db";
import { mensajeError } from "@/lib/forms";

export type RenglonEntrada = { productoId: number; cantidad: number; costoUnitario: number /* centavos */ };

export type ResultadoOperacion = { ok: true; id: number } | { ok: false; error: string };

export async function registrarEntrada(datos: {
  proveedorId: number | null;
  referencia: string | null;
  nota: string | null;
  actualizarCosto: boolean;
  renglones: RenglonEntrada[];
}): Promise<ResultadoOperacion> {
  try {
    if (!datos.renglones.length) throw new ErrorNegocio("Agrega al menos un producto.");
    for (const r of datos.renglones) {
      if (!Number.isFinite(r.cantidad) || r.cantidad <= 0) throw new ErrorNegocio("Todas las cantidades deben ser mayores a 0.");
      if (!Number.isInteger(r.costoUnitario) || r.costoUnitario < 0) throw new ErrorNegocio("Hay un costo no válido.");
    }

    const id = db.transaction(() => {
      const total = datos.renglones.reduce((s, r) => s + Math.round(r.cantidad * r.costoUnitario), 0);
      const e = db
        .prepare("INSERT INTO entradas (proveedor_id, referencia, nota, total) VALUES (?, ?, ?, ?)")
        .run(datos.proveedorId, datos.referencia?.trim() || null, datos.nota?.trim() || null, total);
      const entradaId = Number(e.lastInsertRowid);

      const insDetalle = db.prepare(
        "INSERT INTO entrada_detalle (entrada_id, producto_id, cantidad, costo_unitario, subtotal) VALUES (?, ?, ?, ?, ?)",
      );
      for (const r of datos.renglones) {
        const cant = redondear(r.cantidad);
        insDetalle.run(entradaId, r.productoId, cant, r.costoUnitario, Math.round(cant * r.costoUnitario));
        registrarMovimiento({ productoId: r.productoId, tipo: "entrada", cantidad: cant, entradaId });
        if (datos.actualizarCosto) {
          db.prepare("UPDATE productos SET precio_costo = ? WHERE id = ?").run(r.costoUnitario, r.productoId);
        }
      }
      return entradaId;
    })();

    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
