import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DIR_IMAGENES, ErrorNegocio } from "./db";

export const MAX_MB = 20;
const NOMBRE_VALIDO = /^[a-f0-9-]{36}(-mini)?\.webp$/;

/**
 * Procesa y guarda una foto. Devuelve el identificador que se guarda en productos.imagen.
 * - Corrige la orientación de fotos de celular.
 * - Recorta franjas negras (típicas de capturas de pantalla).
 * - Genera una versión grande (máx. 1200 px) y una miniatura (máx. 240 px), ambas en WebP, sin recortar el producto.
 */
export async function guardarImagen(archivo: File): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new ErrorNegocio("El archivo debe ser una imagen (JPG, PNG, WebP…).");
  if (archivo.size > MAX_MB * 1024 * 1024) throw new ErrorNegocio(`La foto pesa más de ${MAX_MB} MB.`);

  let entrada = Buffer.from(await archivo.arrayBuffer());
  try {
    entrada = await sharp(entrada).rotate().trim({ background: "#000000", threshold: 30 }).toBuffer();
  } catch {
    // Si no se puede recortar (p. ej. imagen totalmente negra), seguimos con la original.
    entrada = await sharp(entrada).rotate().toBuffer().catch(() => {
      throw new ErrorNegocio("No se pudo leer la imagen. Prueba con una foto JPG o PNG.");
    });
  }

  const id = crypto.randomUUID();
  await fs.mkdir(DIR_IMAGENES, { recursive: true });
  await Promise.all([
    sharp(entrada)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(DIR_IMAGENES, `${id}.webp`)),
    sharp(entrada)
      .resize(240, 240, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(DIR_IMAGENES, `${id}-mini.webp`)),
  ]);
  return id;
}

export async function borrarImagen(id: string | null | undefined) {
  if (!id) return;
  await Promise.all(
    [`${id}.webp`, `${id}-mini.webp`].map((n) => fs.rm(path.join(DIR_IMAGENES, n), { force: true })),
  );
}

/** Ruta en disco de un archivo de imagen, o null si el nombre no es válido. */
export function rutaImagen(nombre: string): string | null {
  return NOMBRE_VALIDO.test(nombre) ? path.join(DIR_IMAGENES, nombre) : null;
}
