import { esCodificable } from "./code128";

// Formatos de hojas de etiquetas adhesivas (medidas en mm).

export type FormatoEtiquetas = {
  id: string;
  nombre: string;
  pagina: "A4" | "letter";
  anchoPagina: number;
  altoPagina: number;
  columnas: number;
  filas: number;
  ancho: number; // de cada etiqueta
  alto: number;
  margenSup: number;
  margenIzq: number;
  espacioX: number; // entre columnas
  espacioY: number; // entre filas
};

export const FORMATOS_ETIQUETAS: FormatoEtiquetas[] = [
  { id: "a4-3x8", nombre: "A4 · 24 por hoja (3×8, 70×37 mm)", pagina: "A4", anchoPagina: 210, altoPagina: 297, columnas: 3, filas: 8, ancho: 70, alto: 37.125, margenSup: 0, margenIzq: 0, espacioX: 0, espacioY: 0 },
  { id: "a4-3x7", nombre: "A4 · 21 por hoja (3×7, 63,5×38,1 mm)", pagina: "A4", anchoPagina: 210, altoPagina: 297, columnas: 3, filas: 7, ancho: 63.5, alto: 38.1, margenSup: 15.15, margenIzq: 7.2, espacioX: 2.5, espacioY: 0 },
  { id: "a4-4x10", nombre: "A4 · 40 por hoja (4×10, 48,5×25,4 mm)", pagina: "A4", anchoPagina: 210, altoPagina: 297, columnas: 4, filas: 10, ancho: 48.5, alto: 25.4, margenSup: 21.5, margenIzq: 8, espacioX: 0, espacioY: 0 },
  { id: "carta-3x10", nombre: "Carta · 30 por hoja (3×10, 66,7×25,4 mm)", pagina: "letter", anchoPagina: 215.9, altoPagina: 279.4, columnas: 3, filas: 10, ancho: 66.675, alto: 25.4, margenSup: 12.7, margenIzq: 4.7625, espacioX: 3.175, espacioY: 0 },
];

/** Qué se imprime en el código de barras: el código de fábrica si lo tiene, si no el código interno. */
export function valorCodigoBarras(p: { codigo: string; codigo_barras: string | null }): string {
  const cb = p.codigo_barras?.trim();
  return cb && esCodificable(cb) ? cb : p.codigo;
}
