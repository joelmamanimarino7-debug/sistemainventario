import { aCentavos } from "./format";

/** Estado que devuelven las server actions a los formularios. */
export type EstadoForm = {
  error?: string;
  ok?: string;
  campos?: Record<string, string>; // errores por campo
};

export function texto(fd: FormData, clave: string): string | null {
  const v = fd.get(clave);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export function numero(fd: FormData, clave: string): number | null {
  const s = texto(fd, clave);
  if (s == null) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function entero(fd: FormData, clave: string): number | null {
  const n = numero(fd, clave);
  if (n == null || Number.isNaN(n)) return null;
  return Math.trunc(n);
}

export function centavos(fd: FormData, clave: string): number | null {
  const s = texto(fd, clave);
  if (s == null) return null;
  const c = aCentavos(s);
  return c == null ? NaN : c;
}

/** Traduce errores comunes de SQLite a mensajes entendibles. */
export function mensajeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("UNIQUE constraint failed: productos.codigo_barras"))
    return "Ya existe otro producto con ese código de barras.";
  if (msg.includes("UNIQUE constraint failed: productos.codigo"))
    return "Ya existe otro producto con ese código.";
  if (msg.includes("UNIQUE constraint failed")) return "Ya existe un registro con ese nombre.";
  return msg;
}
