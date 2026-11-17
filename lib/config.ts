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

/** Motivos para ajustar el inventario (fase 2). */
export const MOTIVOS_AJUSTE = [
  "Conteo físico",
  "Producto dañado o roto",
  "Pérdida o robo",
  "Uso interno",
  "Regalo o muestra",
  "Corrección de un error",
  "Otro",
] as const;

/** Motivos de devolución de una venta (fase 2). */
export const MOTIVOS_DEVOLUCION = [
  "Producto defectuoso",
  "No era lo que buscaba",
  "Cambio por otro producto",
  "Error en la venta",
  "Otro",
] as const;

// Billetes y monedas de Bolivia, para contar el efectivo al cerrar.
export const DENOMINACIONES = [
  { valor: 20000, texto: "200", tipo: "billete" },
  { valor: 10000, texto: "100", tipo: "billete" },
  { valor: 5000, texto: "50", tipo: "billete" },
  { valor: 2000, texto: "20", tipo: "billete" },
  { valor: 1000, texto: "10", tipo: "billete" },
  { valor: 500, texto: "5", tipo: "moneda" },
  { valor: 200, texto: "2", tipo: "moneda" },
  { valor: 100, texto: "1", tipo: "moneda" },
  { valor: 50, texto: "0,50", tipo: "moneda" },
  { valor: 20, texto: "0,20", tipo: "moneda" },
  { valor: 10, texto: "0,10", tipo: "moneda" },
] as const;
