import "server-only";
import { db } from "../db";

/** Periodo de un reporte: fechas YYYY-MM-DD, ambas incluidas. */
export type Periodo = { desde: string; hasta: string };

const rango = (p: Periodo) => [`${p.desde} 00:00:00`, `${p.hasta} 23:59:59`];

export type ResumenPeriodo = {
  ventas: number;
  bruto: number; // total cobrado en ventas (ya con descuentos)
  descuentos: number;
  costo: number; // costo de lo vendido
  devoluciones: number;
  devuelto: number; // dinero devuelto a clientes
  perdidaDevoluciones: number; // lo que la ganancia baja por devoluciones
  netas: number; // bruto - devuelto
  ganancia: number;
  margen: number; // % sobre ventas netas
  ticketPromedio: number;
  unidades: number;
  compras: number; // entradas de mercancía
  comprasTotal: number;
  ajustesFaltante: number; // valor a costo (negativo)
  ajustesSobrante: number; // valor a costo (positivo)
};

export function resumenPeriodo(p: Periodo): ResumenPeriodo {
  const r = rango(p);
  const v = db
    .prepare(
      `SELECT COUNT(*) AS ventas, IFNULL(SUM(total),0) AS bruto, IFNULL(SUM(descuento),0) AS descuentos,
              IFNULL(SUM((SELECT SUM(ROUND(d.cantidad*d.costo_unitario)) FROM venta_detalle d WHERE d.venta_id = v.id)),0) AS costo,
              IFNULL(SUM((SELECT SUM(d.cantidad) FROM venta_detalle d WHERE d.venta_id = v.id)),0) AS unidades
       FROM ventas v WHERE estado = 'completada' AND creado_en BETWEEN ? AND ?`,
    )
    .get(...r) as { ventas: number; bruto: number; descuentos: number; costo: number; unidades: number };

  const dv = db
    .prepare(
      `SELECT COUNT(DISTINCT de.id) AS devoluciones, IFNULL(SUM(dd.importe),0) AS devuelto,
              IFNULL(SUM(dd.importe - CASE WHEN dd.reingresa = 1 THEN ROUND(dd.cantidad*dd.costo_unitario) ELSE 0 END),0) AS perdida
       FROM devoluciones de JOIN devolucion_detalle dd ON dd.devolucion_id = de.id
       WHERE de.creado_en BETWEEN ? AND ?`,
    )
    .get(...r) as { devoluciones: number; devuelto: number; perdida: number };

  const en = db
    .prepare("SELECT COUNT(*) AS n, IFNULL(SUM(total),0) AS total FROM entradas WHERE creado_en BETWEEN ? AND ?")
    .get(...r) as { n: number; total: number };

  const aj = db
    .prepare(
      `SELECT IFNULL(SUM(CASE WHEN d.diferencia < 0 THEN ROUND(d.diferencia*d.costo_unitario) END),0) AS faltante,
              IFNULL(SUM(CASE WHEN d.diferencia > 0 THEN ROUND(d.diferencia*d.costo_unitario) END),0) AS sobrante
       FROM ajustes a JOIN ajuste_detalle d ON d.ajuste_id = a.id WHERE a.creado_en BETWEEN ? AND ?`,
    )
    .get(...r) as { faltante: number; sobrante: number };

  const netas = v.bruto - dv.devuelto;
  const ganancia = v.bruto - v.costo - dv.perdida;
  return {
    ventas: v.ventas,
    bruto: v.bruto,
    descuentos: v.descuentos,
    costo: v.costo,
    devoluciones: dv.devoluciones,
    devuelto: dv.devuelto,
    perdidaDevoluciones: dv.perdida,
    netas,
    ganancia,
    margen: netas > 0 ? Math.round((ganancia / netas) * 1000) / 10 : 0,
    ticketPromedio: v.ventas > 0 ? Math.round(v.bruto / v.ventas) : 0,
    unidades: v.unidades,
    compras: en.n,
    comprasTotal: en.total,
    ajustesFaltante: aj.faltante,
    ajustesSobrante: aj.sobrante,
  };
}

export type PuntoSerie = { clave: string; etiqueta: string; ventas: number; netas: number; ganancia: number };

/** Ventas netas por día (o por mes si el periodo es largo), incluyendo los días sin ventas. */
export function seriePeriodo(p: Periodo): { porMes: boolean; puntos: PuntoSerie[] } {
  const ini = new Date(`${p.desde}T00:00:00`);
  const fin = new Date(`${p.hasta}T00:00:00`);
  const dias = Math.round((fin.getTime() - ini.getTime()) / 86_400_000) + 1;
  const porMes = dias > 62;
  const fmt = porMes ? "%Y-%m" : "%Y-%m-%d";
  const r = rango(p);

  const ventas = db
    .prepare(
      `SELECT strftime('${fmt}', v.creado_en) AS clave, COUNT(*) AS ventas, SUM(v.total) AS bruto,
              SUM(v.total - (SELECT IFNULL(SUM(ROUND(d.cantidad*d.costo_unitario)),0) FROM venta_detalle d WHERE d.venta_id = v.id)) AS ganancia
       FROM ventas v WHERE v.estado = 'completada' AND v.creado_en BETWEEN ? AND ? GROUP BY clave`,
    )
    .all(...r) as { clave: string; ventas: number; bruto: number; ganancia: number }[];
  const devol = db
    .prepare(
      `SELECT strftime('${fmt}', de.creado_en) AS clave, SUM(dd.importe) AS devuelto,
              SUM(dd.importe - CASE WHEN dd.reingresa = 1 THEN ROUND(dd.cantidad*dd.costo_unitario) ELSE 0 END) AS perdida
       FROM devoluciones de JOIN devolucion_detalle dd ON dd.devolucion_id = de.id
       WHERE de.creado_en BETWEEN ? AND ? GROUP BY clave`,
    )
    .all(...r) as { clave: string; devuelto: number; perdida: number }[];
  const mv = new Map(ventas.map((x) => [x.clave, x]));
  const md = new Map(devol.map((x) => [x.clave, x]));

  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const puntos: PuntoSerie[] = [];
  const d = new Date(ini);
  if (porMes) d.setDate(1);
  while (d <= fin) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const clave = porMes ? `${y}-${m}` : `${y}-${m}-${dd}`;
    const v = mv.get(clave);
    const x = md.get(clave);
    puntos.push({
      clave,
      etiqueta: porMes ? `${MESES[d.getMonth()]} ${String(y).slice(2)}` : `${d.getDate()}/${d.getMonth() + 1}`,
      ventas: v?.ventas ?? 0,
      netas: (v?.bruto ?? 0) - (x?.devuelto ?? 0),
      ganancia: (v?.ganancia ?? 0) - (x?.perdida ?? 0),
    });
    if (porMes) d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 1);
  }
  return { porMes, puntos };
}

export function ventasPorMetodo(p: Periodo) {
  return db
    .prepare(
      `SELECT metodo_pago AS metodo, COUNT(*) AS ventas, SUM(total) AS total
       FROM ventas WHERE estado = 'completada' AND creado_en BETWEEN ? AND ?
       GROUP BY metodo_pago ORDER BY total DESC`,
    )
    .all(...rango(p)) as { metodo: string; ventas: number; total: number }[];
}

export type FilaProductoReporte = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  imagen: string | null;
  categoria: string | null;
  vendidos: number;
  devueltos: number;
  importe: number; // ventas netas del producto (descuentos prorrateados, menos devoluciones)
  ganancia: number;
};

/** Ventas por producto en el periodo, de mayor a menor importe. */
export function ventasPorProducto(p: Periodo): FilaProductoReporte[] {
  const r = rango(p);
  return db
    .prepare(
      `WITH v AS (
         SELECT d.producto_id, SUM(d.cantidad) AS cant,
                SUM(ROUND(d.subtotal * CASE WHEN ve.subtotal > 0 THEN ve.total * 1.0 / ve.subtotal ELSE 0 END)) AS importe,
                SUM(ROUND(d.cantidad * d.costo_unitario)) AS costo
         FROM venta_detalle d JOIN ventas ve ON ve.id = d.venta_id
         WHERE ve.estado = 'completada' AND ve.creado_en BETWEEN ? AND ?
         GROUP BY d.producto_id
       ), dv AS (
         SELECT dd.producto_id, SUM(dd.cantidad) AS cant, SUM(dd.importe) AS importe,
                SUM(dd.importe - CASE WHEN dd.reingresa = 1 THEN ROUND(dd.cantidad*dd.costo_unitario) ELSE 0 END) AS perdida
         FROM devolucion_detalle dd JOIN devoluciones de ON de.id = dd.devolucion_id
         WHERE de.creado_en BETWEEN ? AND ?
         GROUP BY dd.producto_id
       )
       SELECT p.id, p.codigo, p.nombre, p.unidad, p.imagen, c.nombre AS categoria,
              IFNULL(v.cant,0) AS vendidos, IFNULL(dv.cant,0) AS devueltos,
              IFNULL(v.importe,0) - IFNULL(dv.importe,0) AS importe,
              IFNULL(v.importe,0) - IFNULL(v.costo,0) - IFNULL(dv.perdida,0) AS ganancia
       FROM productos p
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN v ON v.producto_id = p.id
       LEFT JOIN dv ON dv.producto_id = p.id
       WHERE v.producto_id IS NOT NULL OR dv.producto_id IS NOT NULL
       ORDER BY importe DESC, vendidos DESC`,
    )
    .all(...r, ...r) as FilaProductoReporte[];
}

/** Agrupa las filas por producto en categorías. */
export function ventasPorCategoria(filas: FilaProductoReporte[]) {
  const m = new Map<string, { categoria: string; productos: number; vendidos: number; importe: number; ganancia: number }>();
  for (const f of filas) {
    const k = f.categoria ?? "Sin categoría";
    const c = m.get(k) ?? { categoria: k, productos: 0, vendidos: 0, importe: 0, ganancia: 0 };
    c.productos++;
    c.vendidos += f.vendidos - f.devueltos;
    c.importe += f.importe;
    c.ganancia += f.ganancia;
    m.set(k, c);
  }
  return [...m.values()].sort((a, b) => b.importe - a.importe);
}

export type ProductoSinVentas = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  imagen: string | null;
  stock: number;
  valor: number; // stock × costo
  ultima_venta: string | null;
};

/** Productos activos con stock que no se vendieron en el periodo (mercancía quieta). */
export function productosSinVentas(p: Periodo): ProductoSinVentas[] {
  return db
    .prepare(
      `SELECT p.id, p.codigo, p.nombre, p.unidad, p.imagen, p.stock, ROUND(p.stock * p.precio_costo) AS valor,
              (SELECT MAX(ve.creado_en) FROM venta_detalle d JOIN ventas ve ON ve.id = d.venta_id
               WHERE d.producto_id = p.id AND ve.estado = 'completada') AS ultima_venta
       FROM productos p
       WHERE p.activo = 1 AND p.stock > 0 AND NOT EXISTS (
         SELECT 1 FROM venta_detalle d JOIN ventas ve ON ve.id = d.venta_id
         WHERE d.producto_id = p.id AND ve.estado = 'completada' AND ve.creado_en BETWEEN ? AND ?)
       ORDER BY valor DESC, p.nombre`,
    )
    .all(...rango(p)) as ProductoSinVentas[];
}

/** Valor actual del inventario por categoría (productos activos). */
export function inventarioPorCategoria() {
  return db
    .prepare(
      `SELECT IFNULL(c.nombre, 'Sin categoría') AS categoria, COUNT(*) AS productos, SUM(p.stock) AS unidades,
              SUM(ROUND(p.stock * p.precio_costo)) AS valor_costo, SUM(ROUND(p.stock * p.precio_venta)) AS valor_venta
       FROM productos p LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.activo = 1 GROUP BY c.id ORDER BY valor_costo DESC`,
    )
    .all() as { categoria: string; productos: number; unidades: number; valor_costo: number; valor_venta: number }[];
}
