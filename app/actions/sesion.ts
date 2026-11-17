"use server";

import { redirect } from "next/navigation";
import {
  cerrarSesionActual,
  exigirUsuario,
  hashClave,
  hayUsuarios,
  iniciarSesion,
  problemaClave,
  verificarClave,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { type EstadoForm, texto } from "@/lib/forms";

/** Solo acepta rutas internas para volver después de iniciar sesión. */
function destinoSeguro(v: string | null): string {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

export async function iniciarSesionAccion(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const usuario = texto(fd, "usuario");
  const clave = String(fd.get("clave") ?? "");
  if (!usuario || !clave) return { error: "Escribe tu usuario y tu contraseña." };

  const u = db.prepare("SELECT id, clave_hash, activo FROM usuarios WHERE usuario = ?").get(usuario) as
    | { id: number; clave_hash: string; activo: number }
    | undefined;
  if (!u || !verificarClave(clave, u.clave_hash) || !u.activo) {
    await new Promise((r) => setTimeout(r, 600)); // frena los intentos al azar
    return { error: u && !u.activo && verificarClave(clave, u.clave_hash) ? "Este usuario está desactivado." : "Usuario o contraseña incorrectos." };
  }
  await iniciarSesion(u.id);
  redirect(destinoSeguro(texto(fd, "siguiente")));
}

export async function cerrarSesionAccion() {
  await cerrarSesionActual();
  redirect("/login");
}

/** Primer uso: crea el administrador. Solo funciona si todavía no hay ningún usuario. */
export async function crearPrimerAdmin(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (hayUsuarios()) redirect("/login");
  const nombre = texto(fd, "nombre");
  const usuario = texto(fd, "usuario");
  const clave = String(fd.get("clave") ?? "");
  const campos: Record<string, string> = {};
  if (!nombre) campos.nombre = "Escribe tu nombre.";
  if (!usuario || !/^[a-zA-Z0-9._-]{3,30}$/.test(usuario))
    campos.usuario = "De 3 a 30 letras o números, sin espacios (puede llevar . _ -).";
  const p = problemaClave(clave);
  if (p) campos.clave = p;
  else if (clave !== String(fd.get("clave2") ?? "")) campos.clave2 = "Las contraseñas no coinciden.";
  if (Object.keys(campos).length) return { error: "Revisa los campos marcados.", campos };

  const id = Number(
    db
      .prepare("INSERT INTO usuarios (nombre, usuario, clave_hash, rol) VALUES (?, ?, ?, 'admin')")
      .run(nombre, usuario, hashClave(clave)).lastInsertRowid,
  );
  await iniciarSesion(id);
  redirect("/");
}

/** Cualquier usuario puede cambiar su propia contraseña. */
export async function cambiarMiClave(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const yo = await exigirUsuario();
  const actual = String(fd.get("actual") ?? "");
  const nueva = String(fd.get("nueva") ?? "");
  const fila = db.prepare("SELECT clave_hash FROM usuarios WHERE id = ?").get(yo.id) as { clave_hash: string };
  if (!verificarClave(actual, fila.clave_hash)) return { error: "La contraseña actual no es correcta.", campos: { actual: "Incorrecta." } };
  const p = problemaClave(nueva);
  if (p) return { error: p, campos: { nueva: p } };
  if (nueva !== String(fd.get("nueva2") ?? "")) return { error: "Las contraseñas no coinciden.", campos: { nueva2: "No coincide." } };
  db.prepare("UPDATE usuarios SET clave_hash = ? WHERE id = ?").run(hashClave(nueva), yo.id);
  // Cierra las demás sesiones (por si alguien más la conocía) y deja abierta esta.
  db.prepare("DELETE FROM sesiones WHERE usuario_id = ?").run(yo.id);
  await iniciarSesion(yo.id);
  return { ok: "Contraseña cambiada. Se cerraron tus sesiones en otros equipos." };
}
