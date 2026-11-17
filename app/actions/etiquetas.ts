"use server";

import { usuarioDeAccion } from "@/lib/auth";
import { productosParaEtiquetas, type ProductoEtiqueta } from "@/lib/data/productos";

/** Todos los productos activos, para «Agregar todos» en la pantalla de etiquetas. */
export async function todosParaEtiquetas(): Promise<ProductoEtiqueta[]> {
  await usuarioDeAccion();
  return productosParaEtiquetas();
}
