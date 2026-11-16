"use server";

import { revalidatePath } from "next/cache";
import { crearAjuste, type RenglonAjuste } from "@/lib/ajustes";
import { MOTIVOS_AJUSTE } from "@/lib/config";
import { db, ErrorNegocio } from "@/lib/db";
import { mensajeError } from "@/lib/forms";
import type { ResultadoOperacion } from "./entradas";

export async function registrarAjuste(datos: {
  motivo: string;
  nota: string | null;
  renglones: RenglonAjuste[];
}): Promise<ResultadoOperacion> {
  try {
    if (!(MOTIVOS_AJUSTE as readonly string[]).includes(datos.motivo)) throw new ErrorNegocio("Elige un motivo.");
    if (!datos.renglones.length) throw new ErrorNegocio("Agrega al menos un producto.");
    if (datos.motivo === "Otro" && !datos.nota?.trim()) throw new ErrorNegocio('Si el motivo es "Otro", explica el motivo en la nota.');
    const id = db.transaction(() => crearAjuste(datos))();
    if (id == null) throw new ErrorNegocio("No hay diferencias: el stock ya coincide con lo que escribiste.");
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
