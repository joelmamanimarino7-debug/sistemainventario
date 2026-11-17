import "server-only";
import ExcelJS from "exceljs";
import { obtenerNegocio } from "./negocio";

// Herramientas comunes para generar y leer archivos de Excel (.xlsx).

export type Columna<T> = {
  titulo: string;
  ancho?: number;
  formato?: "dinero" | "cantidad" | "fecha" | "porcentaje" | "texto";
  valor: (fila: T) => string | number | Date | null | undefined;
};

const FORMATOS: Record<string, string> = {
  dinero: "#,##0.00",
  cantidad: "#,##0.###",
  fecha: "dd/mm/yyyy hh:mm",
  porcentaje: "0.0%",
  texto: "@",
};

export function nuevoLibro(): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook();
  libro.creator = obtenerNegocio().nombre;
  libro.created = new Date();
  return libro;
}

/** Agrega una hoja con encabezado en negrita, filtros y la primera fila fija. */
export function agregarHoja<T>(libro: ExcelJS.Workbook, nombre: string, columnas: Columna<T>[], filas: T[]) {
  const hoja = libro.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = columnas.map((c) => ({
    header: c.titulo,
    width: c.ancho ?? Math.max(10, c.titulo.length + 2),
    style: c.formato ? { numFmt: FORMATOS[c.formato] } : {},
  }));
  for (const f of filas) hoja.addRow(columnas.map((c) => c.valor(f) ?? null));
  const enc = hoja.getRow(1);
  enc.font = { bold: true, color: { argb: "FFFFFFFF" } };
  enc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  enc.alignment = { vertical: "middle" };
  enc.height = 20;
  if (filas.length) hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columnas.length } };
  return hoja;
}

/** Hoja de dos columnas (dato / valor), para resúmenes e instrucciones. */
export function agregarHojaSimple(
  libro: ExcelJS.Workbook,
  nombre: string,
  filas: [string, string | number | null, ("dinero" | "porcentaje")?][],
  anchos: [number, number] = [34, 22],
) {
  const hoja = libro.addWorksheet(nombre);
  hoja.columns = [{ width: anchos[0] }, { width: anchos[1] }];
  for (const [dato, valor, formato] of filas) {
    const fila = hoja.addRow([dato, valor]);
    if (formato) fila.getCell(2).numFmt = FORMATOS[formato];
    if (valor === null && dato) fila.font = { bold: true };
  }
  hoja.getColumn(1).alignment = { wrapText: true, vertical: "top" };
  return hoja;
}

/** Centavos → número en bolivianos para Excel. */
export const bs = (centavos: number | null | undefined) => (centavos == null ? null : centavos / 100);

/** "2026-11-16 11:28:05" (hora local) → Date que Excel muestra con esa misma hora. */
export function fechaExcel(texto: string | null | undefined): Date | null {
  if (!texto) return null;
  const [d, t = "00:00:00"] = texto.split(" ");
  const [y, m, dia] = d.split("-").map(Number);
  const [h, mi, s] = t.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, dia, h || 0, mi || 0, s || 0));
}

/** Respuesta HTTP para descargar el libro. */
export async function descargarLibro(libro: ExcelJS.Workbook, nombreArchivo: string): Promise<Response> {
  const buffer = await libro.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`,
      "Cache-Control": "no-store",
    },
  });
}

/** Valor "plano" de una celda (resuelve fórmulas, texto enriquecido, hipervínculos). */
export function valorCelda(v: ExcelJS.CellValue): string | number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") return v.trim() === "" ? null : v.trim();
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue);
    if ("richText" in v) return valorCelda(v.richText.map((r) => r.text).join(""));
    if ("text" in v) return valorCelda(v.text as string);
  }
  return null;
}

/** Normaliza un encabezado: sin tildes, minúsculas, solo letras y números. "Código de barras" → "codigodebarras". */
export function normalizarEncabezado(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Nombre de archivo con la fecha de hoy: "productos-2026-11-16.xlsx". */
export function nombreConFecha(base: string, sufijo?: string) {
  const h = new Date();
  const hoy = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
  return `${base}-${sufijo ?? hoy}.xlsx`;
}
