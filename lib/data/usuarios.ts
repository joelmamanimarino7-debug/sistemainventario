import "server-only";
import { db } from "../db";

export type FilaUsuario = {
  id: number;
  nombre: string;
  usuario: string;
  rol: "admin" | "vendedor";
  activo: number;
  ultimo_acceso: string | null;
  creado_en: string;
  ventas: number;
};

const SELECT = `SELECT u.id, u.nombre, u.usuario, u.rol, u.activo, u.ultimo_acceso, u.creado_en,
  (SELECT COUNT(*) FROM ventas v WHERE v.usuario_id = u.id AND v.estado = 'completada') AS ventas
  FROM usuarios u`;

export function listarUsuarios(): FilaUsuario[] {
  return db.prepare(`${SELECT} ORDER BY u.activo DESC, u.nombre COLLATE NOCASE`).all() as FilaUsuario[];
}

export function obtenerUsuario(id: number): FilaUsuario | undefined {
  return db.prepare(`${SELECT} WHERE u.id = ?`).get(id) as FilaUsuario | undefined;
}
