import "server-only";
import { db } from "../db";

export type TablaCatalogo = "categorias" | "marcas";

export type ItemCatalogo = {
  id: number;
  nombre: string;
  activo: number;
  productos: number;
};

export type Proveedor = {
  id: number;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  activo: number;
  productos: number;
  entradas: number;
};

const columnaProducto: Record<TablaCatalogo | "proveedores", string> = {
  categorias: "categoria_id",
  marcas: "marca_id",
  proveedores: "proveedor_id",
};

export function listarCatalogo(tabla: TablaCatalogo, soloActivos = false): ItemCatalogo[] {
  const col = columnaProducto[tabla];
  return db
    .prepare(
      `SELECT c.id, c.nombre, c.activo,
              (SELECT COUNT(*) FROM productos p WHERE p.${col} = c.id) AS productos
       FROM ${tabla} c
       ${soloActivos ? "WHERE c.activo = 1" : ""}
       ORDER BY c.activo DESC, c.nombre`,
    )
    .all() as ItemCatalogo[];
}

export function listarProveedores(soloActivos = false): Proveedor[] {
  return db
    .prepare(
      `SELECT pr.*, (SELECT COUNT(*) FROM productos p WHERE p.proveedor_id = pr.id) AS productos,
              (SELECT COUNT(*) FROM entradas e WHERE e.proveedor_id = pr.id) AS entradas
       FROM proveedores pr
       ${soloActivos ? "WHERE pr.activo = 1" : ""}
       ORDER BY pr.activo DESC, pr.nombre`,
    )
    .all() as Proveedor[];
}

export function obtenerProveedor(id: number): Proveedor | undefined {
  return db
    .prepare(
      `SELECT pr.*, (SELECT COUNT(*) FROM productos p WHERE p.proveedor_id = pr.id) AS productos,
              (SELECT COUNT(*) FROM entradas e WHERE e.proveedor_id = pr.id) AS entradas
       FROM proveedores pr WHERE pr.id = ?`,
    )
    .get(id) as Proveedor | undefined;
}

/** ¿El registro está referenciado por productos o entradas? (si sí, no se puede borrar) */
export function catalogoEnUso(tabla: TablaCatalogo | "proveedores", id: number): boolean {
  const col = columnaProducto[tabla];
  const enProductos = db.prepare(`SELECT 1 FROM productos WHERE ${col} = ? LIMIT 1`).get(id);
  if (enProductos) return true;
  if (tabla === "proveedores") {
    return !!db.prepare("SELECT 1 FROM entradas WHERE proveedor_id = ? LIMIT 1").get(id);
  }
  return false;
}
