"use server";

import { revalidatePath } from "next/cache";
import { usuarioDeAccion } from "@/lib/auth";
import { mensajeError } from "@/lib/forms";
import {
  aplicarImportacion,
  type FilaArchivo,
  leerArchivoProductos,
  limpiarFilas,
  type ResumenImportacion,
  revisarImportacion,
} from "@/lib/productosExcel";

export type RespuestaRevision = { ok: true; filas: FilaArchivo[]; resumen: ResumenImportacion } | { ok: false; error: string };

/** Paso 1: lee el Excel y muestra qué pasaría, sin cambiar nada. */
export async function revisarArchivo(fd: FormData, ajustarStock: boolean): Promise<RespuestaRevision> {
  try {
    await usuarioDeAccion("admin");
    const archivo = fd.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elige un archivo de Excel." };
    const filas = await leerArchivoProductos(archivo);
    return { ok: true, filas, resumen: revisarImportacion(filas, { ajustarStock }) };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

/** Vuelve a revisar las mismas filas (por ejemplo, al marcar o desmarcar «Ajustar el stock»). */
export async function revisarDeNuevo(filas: unknown, ajustarStock: boolean): Promise<RespuestaRevision> {
  try {
    await usuarioDeAccion("admin");
    const limpias = limpiarFilas(filas);
    return { ok: true, filas: limpias, resumen: revisarImportacion(limpias, { ajustarStock }) };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}

/** Paso 2: aplica la importación (todo o nada). */
export async function importarProductos(
  filas: unknown,
  ajustarStock: boolean,
): Promise<
  { ok: true; creados: number; actualizados: number; omitidos: number; ajusteId: number | null } | { ok: false; error: string }
> {
  try {
    const yo = await usuarioDeAccion("admin");
    const r = aplicarImportacion(limpiarFilas(filas), { ajustarStock, usuario: yo });
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: mensajeError(e) };
  }
}
