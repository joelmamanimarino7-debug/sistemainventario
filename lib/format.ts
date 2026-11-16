import { CONFIG } from "./config";

const fmtDinero = new Intl.NumberFormat(CONFIG.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmtCantidad = new Intl.NumberFormat(CONFIG.locale, { maximumFractionDigits: 3 });

/** Separador decimal del formato regional configurado ("," en Bolivia). */
const SEP_DECIMAL = fmtDinero.formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";

/** Centavos → "Bs 1.234,50" */
export function dinero(centavos: number | null | undefined): string {
  const v = (centavos ?? 0) / 100;
  const s = fmtDinero.format(Math.abs(v));
  return `${v < 0 ? "-" : ""}${CONFIG.simboloMoneda} ${s}`;
}

/** Centavos → "1234,50" (para precargar inputs; sin separador de miles) */
export function centavosAInput(centavos: number | null | undefined): string {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2).replace(".", SEP_DECIMAL);
}

/**
 * Texto escrito por el usuario → centavos. Acepta coma o punto como decimal:
 * "12,50", "12.50", "1.234,50", "1,234.50", "Bs 89" → 1250, 1250, 123450, 123450, 8900.
 * Devuelve null si no es un número válido.
 */
export function aCentavos(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  let t = String(texto).replace(/[^\d.,-]/g, "");
  if (t === "" || t === "-") return null;
  const ultimaComa = t.lastIndexOf(",");
  const ultimoPunto = t.lastIndexOf(".");
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    // El separador que aparece al final es el decimal; el otro es de miles.
    const decimal = ultimaComa > ultimoPunto ? "," : ".";
    const miles = decimal === "," ? "." : ",";
    t = t.split(miles).join("").replace(decimal, ".");
  } else if (ultimaComa >= 0 || ultimoPunto >= 0) {
    const sep = ultimaComa >= 0 ? "," : ".";
    const partes = t.split(sep);
    // Un solo separador seguido de 1 o 2 dígitos = decimal; si no, son miles ("1.500" o "1,500,000").
    const esDecimal = partes.length === 2 && partes[1].length <= 2;
    t = esDecimal ? partes.join(".") : partes.join("");
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Nombre de la unidad según la cantidad: 1 unidad, 8 unidades, 24 cajas, 3,5 metros, 2 pares. */
export function nombreUnidad(n: number | null | undefined, unidad: string): string {
  if (n === 1) return unidad;
  return /[aeiouáéíóú]$/i.test(unidad) ? `${unidad}s` : `${unidad}es`;
}

export function cantidad(n: number | null | undefined): string {
  return fmtCantidad.format(n ?? 0);
}

/** "2026-11-16 11:28:05" → "16/11/2026 11:28" */
export function fecha(texto: string | null | undefined, conHora = true): string {
  if (!texto) return "";
  const [d, t = ""] = texto.split(" ");
  const [y, m, dia] = d.split("-");
  const base = `${dia}/${m}/${y}`;
  return conHora && t ? `${base} ${t.slice(0, 5)}` : base;
}

export function medidas(p: {
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  unidad_medida: string;
}): string {
  const partes = [p.largo, p.ancho, p.alto].filter((x): x is number => x != null);
  if (partes.length === 0) return "";
  return `${partes.map((x) => cantidad(x)).join(" × ")} ${p.unidad_medida}`;
}
