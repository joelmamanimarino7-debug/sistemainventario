// Ajustes generales del negocio. Cambia aquí el símbolo de moneda y el formato regional.
export const CONFIG = {
  nombreNegocio: "Mi Inventario",
  simboloMoneda: "Bs",
  locale: "es-BO", // formato boliviano: 1.234,50
};

export const UNIDADES = ["unidad", "caja", "paquete", "juego", "par", "metro", "kilo", "litro", "rollo"] as const;
export const UNIDADES_MEDIDA = ["cm", "mm", "m", "pulg"] as const;
export const METODOS_PAGO = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "transferencia", etiqueta: "Transferencia QR" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

export function etiquetaMetodo(valor: string) {
  return METODOS_PAGO.find((m) => m.valor === valor)?.etiqueta ?? valor;
}
