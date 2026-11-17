import "server-only";
import { db } from "../db";

export type Producto = {
  id: number;
  codigo: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  marca_id: number | null;
  modelo: string | null;
  categoria_id: number | null;
  proveedor_id: number | null;
  unidad: string;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  unidad_medida: string;
  color: string | null;
  material: string | null;
  peso: number | null;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  ubicacion: string | null;
  imagen: string | null;
  activo: number;
  creado_en: string;
  actualizado_en: string;
  // nombres de catálogos (JOIN)
  marca: string | null;
  categoria: string | null;
  proveedor: string | null;
};

export type FiltrosProductos = {
  q?: string;
  categoria?: number;
  marca?: number;
  estado?: "activos" | "inactivos" | "bajo" | "agotados" | "todos";
  pagina?: number;
};

export const POR_PAGINA = 50;

const SELECT_BASE = `
  SELECT p.*, m.nombre AS marca, c.nombre AS categoria, pr.nombre AS proveedor
  FROM productos p
  LEFT JOIN marcas m       ON m.id = p.marca_id
  LEFT JOIN categorias c   ON c.id = p.categoria_id
  LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
`;

/** Construye una condición de búsqueda por palabras: cada palabra debe aparecer en algún campo. */
function condicionBusqueda(q: string, params: unknown[]): string {
  const palabras = q.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return palabras
    .map((w) => {
      const like = `%${w}%`;
      params.push(like, like, like, like, like, like);
      return `(p.nombre LIKE ? OR p.codigo LIKE ? OR IFNULL(p.codigo_barras,'') LIKE ?
               OR IFNULL(p.modelo,'') LIKE ? OR IFNULL(m.nombre,'') LIKE ? OR IFNULL(p.descripcion,'') LIKE ?)`;
    })
    .join(" AND ");
}

export function buscarProductos(f: FiltrosProductos): { productos: Producto[]; total: number } {
  const where: string[] = [];
  const params: unknown[] = [];

  switch (f.estado ?? "activos") {
    case "activos":
      where.push("p.activo = 1");
      break;
    case "inactivos":
      where.push("p.activo = 0");
      break;
    case "bajo":
      where.push("p.activo = 1 AND p.stock <= p.stock_minimo");
      break;
    case "agotados":
      where.push("p.activo = 1 AND p.stock <= 0");
      break;
  }
  if (f.q?.trim()) where.push(condicionBusqueda(f.q, params));
  if (f.categoria) {
    where.push("p.categoria_id = ?");
    params.push(f.categoria);
  }
  if (f.marca) {
    where.push("p.marca_id = ?");
    params.push(f.marca);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db
      .prepare(`SELECT COUNT(*) AS n FROM productos p LEFT JOIN marcas m ON m.id = p.marca_id ${whereSql}`)
      .get(...params) as { n: number }
  ).n;

  const pagina = Math.max(1, f.pagina ?? 1);
  const productos = db
    .prepare(`${SELECT_BASE} ${whereSql} ORDER BY p.nombre COLLATE NOCASE LIMIT ? OFFSET ?`)
    .all(...params, POR_PAGINA, (pagina - 1) * POR_PAGINA) as Producto[];

  return { productos, total };
}

export function obtenerProducto(id: number): Producto | undefined {
  return db.prepare(`${SELECT_BASE} WHERE p.id = ?`).get(id) as Producto | undefined;
}

/** Versión ligera para los buscadores de Venta y Entrada. */
export type ProductoBusqueda = Pick<
  Producto,
  "id" | "codigo" | "codigo_barras" | "nombre" | "modelo" | "marca" | "unidad" | "precio_venta" | "precio_costo" | "stock" | "imagen"
>;

export function buscarParaOperacion(q: string, limite = 15): ProductoBusqueda[] {
  const texto = q.trim();
  if (!texto) return [];
  const params: unknown[] = [];
  const cond = condicionBusqueda(texto, params);
  // Coincidencias exactas de código o código de barras van primero (útil con lector de códigos).
  return db
    .prepare(
      `SELECT p.id, p.codigo, p.codigo_barras, p.nombre, p.modelo, m.nombre AS marca, p.unidad,
              p.precio_venta, p.precio_costo, p.stock, p.imagen
       FROM productos p LEFT JOIN marcas m ON m.id = p.marca_id
       WHERE p.activo = 1 AND (${cond})
       ORDER BY (p.codigo = ? COLLATE NOCASE OR p.codigo_barras = ?) DESC, p.nombre COLLATE NOCASE
       LIMIT ?`,
    )
    .all(...params, texto, texto, limite) as ProductoBusqueda[];
}

export function obtenerParaOperacion(id: number): ProductoBusqueda | undefined {
  return db
    .prepare(
      `SELECT p.id, p.codigo, p.codigo_barras, p.nombre, p.modelo, m.nombre AS marca, p.unidad,
              p.precio_venta, p.precio_costo, p.stock, p.imagen
       FROM productos p LEFT JOIN marcas m ON m.id = p.marca_id
       WHERE p.id = ? AND p.activo = 1`,
    )
    .get(id) as ProductoBusqueda | undefined;
}

/** Datos mínimos para imprimir etiquetas. */
export type ProductoEtiqueta = Pick<Producto, "id" | "codigo" | "codigo_barras" | "nombre" | "precio_venta" | "stock">;

export function productosParaEtiquetas(ids?: number[]): ProductoEtiqueta[] {
  const sql = `SELECT id, codigo, codigo_barras, nombre, precio_venta, stock FROM productos WHERE activo = 1`;
  if (!ids) return db.prepare(`${sql} ORDER BY nombre COLLATE NOCASE`).all() as ProductoEtiqueta[];
  if (!ids.length) return [];
  return db.prepare(`${sql} AND id IN (${ids.map(() => "?").join(",")})`).all(...ids) as ProductoEtiqueta[];
}
