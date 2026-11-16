import "server-only";
import type ExcelJS from "exceljs";
import { CONFIG, etiquetaMetodo } from "./config";
import { listarMovimientos, type FiltrosMovimientos } from "./data/movimientos";
import {
  inventarioPorCategoria,
  type Periodo,
  productosSinVentas,
  resumenPeriodo,
  seriePeriodo,
  ventasPorCategoria,
  ventasPorMetodo,
  ventasPorProducto,
} from "./data/reportes";
import { listarVentas } from "./data/ventas";
import { db } from "./db";
import { agregarHoja, agregarHojaSimple, bs, fechaExcel, nuevoLibro } from "./excel";

const TIPOS_MOV: Record<string, string> = { entrada: "Entrada", venta: "Venta", ajuste: "Ajuste", devolucion: "Devolución" };
const fmt = (s: string) => s.split("-").reverse().join("/");

export function libroVentas(p: Partial<Periodo>): ExcelJS.Workbook {
  const libro = nuevoLibro();
  const { ventas } = listarVentas({ desde: p.desde, hasta: p.hasta, porPagina: 1_000_000 });
  agregarHoja(
    libro,
    "Ventas",
    [
      { titulo: "Folio", ancho: 8, valor: (v) => v.id },
      { titulo: "Fecha", ancho: 17, formato: "fecha", valor: (v) => fechaExcel(v.creado_en) },
      { titulo: "Estado", ancho: 11, valor: (v) => (v.estado === "cancelada" ? "Anulada" : "Completada") },
      { titulo: "Cliente", ancho: 20, valor: (v) => v.cliente },
      { titulo: "Método de pago", ancho: 16, valor: (v) => etiquetaMetodo(v.metodo_pago) },
      { titulo: "Artículos", formato: "cantidad", valor: (v) => v.unidades },
      { titulo: "Subtotal", ancho: 13, formato: "dinero", valor: (v) => bs(v.subtotal) },
      { titulo: "Descuento", ancho: 13, formato: "dinero", valor: (v) => bs(v.descuento) },
      { titulo: "Total", ancho: 13, formato: "dinero", valor: (v) => bs(v.total) },
      { titulo: "Devuelto", ancho: 13, formato: "dinero", valor: (v) => bs(v.devuelto) },
      { titulo: "Costo", ancho: 13, formato: "dinero", valor: (v) => bs(v.costo) },
      { titulo: "Ganancia (sin devoluciones)", ancho: 16, formato: "dinero", valor: (v) => (v.estado === "cancelada" ? null : bs(v.total - v.costo)) },
      { titulo: "Nota", ancho: 30, valor: (v) => v.nota },
    ],
    ventas.reverse(),
  );

  const w: string[] = [];
  const params: string[] = [];
  if (p.desde) (w.push("v.creado_en >= ?"), params.push(`${p.desde} 00:00:00`));
  if (p.hasta) (w.push("v.creado_en <= ?"), params.push(`${p.hasta} 23:59:59`));
  const where = w.length ? `WHERE ${w.join(" AND ")}` : "";
  type Det = {
    venta_id: number; creado_en: string; estado: string; codigo: string; producto: string; unidad: string;
    cantidad: number; precio_unitario: number; subtotal: number; costo_unitario: number; devuelto: number;
  };
  const detalle = db
    .prepare(
      `SELECT d.venta_id, v.creado_en, v.estado, p.codigo, p.nombre AS producto, p.unidad, d.cantidad, d.precio_unitario,
              d.subtotal, d.costo_unitario,
              (SELECT IFNULL(SUM(dd.cantidad),0) FROM devolucion_detalle dd WHERE dd.venta_detalle_id = d.id) AS devuelto
       FROM venta_detalle d JOIN ventas v ON v.id = d.venta_id JOIN productos p ON p.id = d.producto_id
       ${where} ORDER BY d.venta_id, d.id`,
    )
    .all(...params) as Det[];
  agregarHoja<Det>(
    libro,
    "Detalle",
    [
      { titulo: "Folio", ancho: 8, valor: (d) => d.venta_id },
      { titulo: "Fecha", ancho: 17, formato: "fecha", valor: (d) => fechaExcel(d.creado_en) },
      { titulo: "Estado", ancho: 11, valor: (d) => (d.estado === "cancelada" ? "Anulada" : "Completada") },
      { titulo: "Código", ancho: 12, valor: (d) => d.codigo },
      { titulo: "Producto", ancho: 34, valor: (d) => d.producto },
      { titulo: "Cantidad", formato: "cantidad", valor: (d) => d.cantidad },
      { titulo: "Unidad", valor: (d) => d.unidad },
      { titulo: "Precio unit.", ancho: 13, formato: "dinero", valor: (d) => bs(d.precio_unitario) },
      { titulo: "Subtotal", ancho: 13, formato: "dinero", valor: (d) => bs(d.subtotal) },
      { titulo: "Costo unit.", ancho: 13, formato: "dinero", valor: (d) => bs(d.costo_unitario) },
      { titulo: "Devuelto", formato: "cantidad", valor: (d) => d.devuelto || null },
    ],
    detalle,
  );

  const wd: string[] = [];
  const pd: string[] = [];
  if (p.desde) (wd.push("de.creado_en >= ?"), pd.push(`${p.desde} 00:00:00`));
  if (p.hasta) (wd.push("de.creado_en <= ?"), pd.push(`${p.hasta} 23:59:59`));
  type Dev = { id: number; venta_id: number; creado_en: string; motivo: string; nota: string | null; producto: string; cantidad: number; importe: number; reingresa: number };
  const devoluciones = db
    .prepare(
      `SELECT de.id, de.venta_id, de.creado_en, de.motivo, de.nota, p.nombre AS producto, dd.cantidad, dd.importe, dd.reingresa
       FROM devoluciones de JOIN devolucion_detalle dd ON dd.devolucion_id = de.id JOIN productos p ON p.id = dd.producto_id
       ${wd.length ? `WHERE ${wd.join(" AND ")}` : ""} ORDER BY de.id, dd.id`,
    )
    .all(...pd) as Dev[];
  agregarHoja<Dev>(
    libro,
    "Devoluciones",
    [
      { titulo: "N°", ancho: 6, valor: (d) => d.id },
      { titulo: "Venta", ancho: 8, valor: (d) => d.venta_id },
      { titulo: "Fecha", ancho: 17, formato: "fecha", valor: (d) => fechaExcel(d.creado_en) },
      { titulo: "Motivo", ancho: 24, valor: (d) => d.motivo },
      { titulo: "Producto", ancho: 34, valor: (d) => d.producto },
      { titulo: "Cantidad", formato: "cantidad", valor: (d) => d.cantidad },
      { titulo: "Devuelto", ancho: 13, formato: "dinero", valor: (d) => bs(d.importe) },
      { titulo: "Volvió al stock", ancho: 15, valor: (d) => (d.reingresa ? "Sí" : "No (dañado)") },
      { titulo: "Nota", ancho: 30, valor: (d) => d.nota },
    ],
    devoluciones,
  );
  return libro;
}

export function libroMovimientos(f: FiltrosMovimientos): ExcelJS.Workbook {
  const libro = nuevoLibro();
  const { movimientos } = listarMovimientos({ ...f, pagina: 1, porPagina: 1_000_000 });
  agregarHoja(
    libro,
    "Movimientos",
    [
      { titulo: "Fecha", ancho: 17, formato: "fecha", valor: (m) => fechaExcel(m.creado_en) },
      { titulo: "Código", ancho: 12, valor: (m) => m.codigo },
      { titulo: "Producto", ancho: 34, valor: (m) => m.producto },
      { titulo: "Tipo", ancho: 12, valor: (m) => TIPOS_MOV[m.tipo] ?? m.tipo },
      { titulo: "Cantidad", formato: "cantidad", valor: (m) => m.cantidad },
      { titulo: "Stock antes", ancho: 12, formato: "cantidad", valor: (m) => m.stock_anterior },
      { titulo: "Stock después", ancho: 13, formato: "cantidad", valor: (m) => m.stock_resultante },
      {
        titulo: "Referencia",
        ancho: 18,
        valor: (m) =>
          m.devolucion_id
            ? `Devolución #${m.devolucion_id}`
            : m.ajuste_id
              ? `Ajuste #${m.ajuste_id}`
              : m.venta_id
                ? `Venta #${m.venta_id}`
                : m.entrada_id
                  ? `Entrada #${m.entrada_id}`
                  : null,
      },
      { titulo: "Nota", ancho: 30, valor: (m) => m.nota },
    ],
    movimientos.reverse(),
  );
  return libro;
}

export function libroReporte(p: Periodo): ExcelJS.Workbook {
  const libro = nuevoLibro();
  const r = resumenPeriodo(p);
  agregarHojaSimple(libro, "Resumen", [
    [`${CONFIG.nombreNegocio} · Reporte del ${fmt(p.desde)} al ${fmt(p.hasta)}`, null],
    ["", null],
    ["Ventas (cantidad)", r.ventas],
    ["Ventas cobradas", bs(r.bruto), "dinero"],
    ["Descuentos otorgados", bs(r.descuentos), "dinero"],
    ["Devoluciones (cantidad)", r.devoluciones],
    ["Dinero devuelto a clientes", bs(r.devuelto), "dinero"],
    ["Ventas netas", bs(r.netas), "dinero"],
    ["Costo de lo vendido", bs(r.costo), "dinero"],
    ["Ganancia", bs(r.ganancia), "dinero"],
    ["Margen sobre ventas netas", r.margen / 100, "porcentaje"],
    ["Venta promedio", bs(r.ticketPromedio), "dinero"],
    ["", null],
    ["Compras / entradas (cantidad)", r.compras],
    ["Compras / entradas (total)", bs(r.comprasTotal), "dinero"],
    ["Ajustes: faltantes (a costo)", bs(r.ajustesFaltante), "dinero"],
    ["Ajustes: sobrantes (a costo)", bs(r.ajustesSobrante), "dinero"],
  ]);

  const serie = seriePeriodo(p);
  agregarHoja(
    libro,
    serie.porMes ? "Por mes" : "Por día",
    [
      { titulo: serie.porMes ? "Mes" : "Día", ancho: 12, valor: (x) => (serie.porMes ? x.clave : fmt(x.clave)) },
      { titulo: "Ventas", valor: (x) => x.ventas },
      { titulo: "Ventas netas", ancho: 14, formato: "dinero", valor: (x) => bs(x.netas) },
      { titulo: "Ganancia", ancho: 14, formato: "dinero", valor: (x) => bs(x.ganancia) },
    ],
    serie.puntos,
  );

  const productos = ventasPorProducto(p);
  agregarHoja(
    libro,
    "Por producto",
    [
      { titulo: "Código", ancho: 12, valor: (x) => x.codigo },
      { titulo: "Producto", ancho: 34, valor: (x) => x.nombre },
      { titulo: "Categoría", ancho: 18, valor: (x) => x.categoria },
      { titulo: "Vendidos", formato: "cantidad", valor: (x) => x.vendidos },
      { titulo: "Devueltos", formato: "cantidad", valor: (x) => x.devueltos },
      { titulo: "Ventas netas", ancho: 14, formato: "dinero", valor: (x) => bs(x.importe) },
      { titulo: "Ganancia", ancho: 14, formato: "dinero", valor: (x) => bs(x.ganancia) },
    ],
    productos,
  );
  agregarHoja(
    libro,
    "Por categoría",
    [
      { titulo: "Categoría", ancho: 22, valor: (x) => x.categoria },
      { titulo: "Productos", valor: (x) => x.productos },
      { titulo: "Unidades netas", ancho: 14, formato: "cantidad", valor: (x) => x.vendidos },
      { titulo: "Ventas netas", ancho: 14, formato: "dinero", valor: (x) => bs(x.importe) },
      { titulo: "Ganancia", ancho: 14, formato: "dinero", valor: (x) => bs(x.ganancia) },
    ],
    ventasPorCategoria(productos),
  );
  agregarHoja(
    libro,
    "Por método de pago",
    [
      { titulo: "Método", ancho: 18, valor: (x) => etiquetaMetodo(x.metodo) },
      { titulo: "Ventas", valor: (x) => x.ventas },
      { titulo: "Total", ancho: 14, formato: "dinero", valor: (x) => bs(x.total) },
    ],
    ventasPorMetodo(p),
  );
  agregarHoja(
    libro,
    "Sin ventas",
    [
      { titulo: "Código", ancho: 12, valor: (x) => x.codigo },
      { titulo: "Producto", ancho: 34, valor: (x) => x.nombre },
      { titulo: "Stock", formato: "cantidad", valor: (x) => x.stock },
      { titulo: "Valor a costo", ancho: 14, formato: "dinero", valor: (x) => bs(x.valor) },
      { titulo: "Última venta", ancho: 17, formato: "fecha", valor: (x) => fechaExcel(x.ultima_venta) },
    ],
    productosSinVentas(p),
  );
  agregarHoja(
    libro,
    "Inventario actual",
    [
      { titulo: "Categoría", ancho: 22, valor: (x) => x.categoria },
      { titulo: "Productos", valor: (x) => x.productos },
      { titulo: "Unidades", formato: "cantidad", valor: (x) => x.unidades },
      { titulo: "Valor a costo", ancho: 14, formato: "dinero", valor: (x) => bs(x.valor_costo) },
      { titulo: "Valor a venta", ancho: 14, formato: "dinero", valor: (x) => bs(x.valor_venta) },
    ],
    inventarioPorCategoria(),
  );
  return libro;
}
