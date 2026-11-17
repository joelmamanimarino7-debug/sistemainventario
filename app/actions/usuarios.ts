"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin, hashClave, problemaClave, type Rol } from "@/lib/auth";
import { db } from "@/lib/db";
import { type EstadoForm, mensajeError, texto } from "@/lib/forms";

const ROLES_VALIDOS: Rol[] = ["admin", "vendedor"];

function adminsActivos(excepto: number): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin' AND activo = 1 AND id <> ?").get(excepto) as { n: number }).n;
}

/** Crea o edita un usuario (solo administradores). */
export async function guardarUsuario(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const yo = await exigirAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const nombre = texto(fd, "nombre");
  const usuario = texto(fd, "usuario");
  const rol = String(fd.get("rol")) as Rol;
  const activo = fd.get("activo") === "1" || !id ? 1 : 0;
  const clave = String(fd.get("clave") ?? "");

  const campos: Record<string, string> = {};
  if (!nombre) campos.nombre = "Escribe el nombre.";
  if (!usuario || !/^[a-zA-Z0-9._-]{3,30}$/.test(usuario))
    campos.usuario = "De 3 a 30 letras o números, sin espacios (puede llevar . _ -).";
  if (!ROLES_VALIDOS.includes(rol)) campos.rol = "Elige un rol.";
  if (!id || clave) {
    const p = problemaClave(clave);
    if (p) campos.clave = p;
  }
  if (Object.keys(campos).length) return { error: "Revisa los campos marcados.", campos };

  if (id) {
    // No dejar el sistema sin administradores activos.
    const quitaAdmin = rol !== "admin" || !activo;
    if (quitaAdmin && adminsActivos(id) === 0) {
      return { error: "Debe quedar al menos un administrador activo." };
    }
    if (id === yo.id && !activo) return { error: "No puedes desactivar tu propio usuario." };
  }

  try {
    if (id) {
      db.prepare("UPDATE usuarios SET nombre = ?, usuario = ?, rol = ?, activo = ? WHERE id = ?").run(nombre, usuario, rol, activo, id);
      if (clave) db.prepare("UPDATE usuarios SET clave_hash = ? WHERE id = ?").run(hashClave(clave), id);
      // Si se desactivó o cambió la contraseña, se cierran sus sesiones.
      if (!activo || clave) db.prepare("DELETE FROM sesiones WHERE usuario_id = ?").run(id);
    } else {
      db.prepare("INSERT INTO usuarios (nombre, usuario, clave_hash, rol) VALUES (?, ?, ?, ?)").run(nombre, usuario, hashClave(clave), rol);
    }
  } catch (e) {
    const msg = mensajeError(e);
    if (msg.includes("ese nombre")) return { error: "Ya existe un usuario con ese nombre de usuario.", campos: { usuario: "Ya existe." } };
    return { error: msg };
  }
  revalidatePath("/", "layout");
  redirect("/usuarios?guardado=1");
}
