import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, ErrorNegocio } from "./db";

// Usuarios, contraseñas y sesiones.
// Las contraseñas se guardan con scrypt (con sal). La cookie lleva un token al azar y en la base
// solo se guarda su hash, así que copiar la base no permite entrar con las sesiones abiertas.

export type Rol = "admin" | "vendedor";
export type Usuario = { id: number; nombre: string; usuario: string; rol: Rol };

export const ROLES: { valor: Rol; texto: string; descripcion: string }[] = [
  { valor: "admin", texto: "Administrador", descripcion: "Todo: productos, precios, entradas, ajustes, reportes, usuarios y configuración." },
  { valor: "vendedor", texto: "Vendedor", descripcion: "Vender, registrar devoluciones, consultar productos y movimientos, imprimir etiquetas." },
];

const COOKIE = "inventario_sesion";
const DIAS_SESION = 30;

// ---------- Contraseñas ----------

export function hashClave(clave: string): string {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(clave, sal, 64);
  return `scrypt:${sal.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarClave(clave: string, guardado: string): boolean {
  const [tipo, salHex, hashHex] = guardado.split(":");
  if (tipo !== "scrypt" || !salHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = crypto.scryptSync(clave, Buffer.from(salHex, "hex"), esperado.length);
  return crypto.timingSafeEqual(esperado, calculado);
}

/** Devuelve un mensaje si la contraseña no sirve; null si está bien. */
export function problemaClave(clave: string | null): string | null {
  if (!clave || clave.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (clave.length > 200) return "La contraseña es demasiado larga.";
  return null;
}

// ---------- Sesiones ----------

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function hayUsuarios(): boolean {
  return !!db.prepare("SELECT 1 FROM usuarios LIMIT 1").get();
}

/** Crea la sesión y deja la cookie puesta. Solo en server actions o route handlers. */
export async function iniciarSesion(usuarioId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DIAS_SESION * 86_400_000);
  db.prepare(
    "INSERT INTO sesiones (id, usuario_id, expira_en) VALUES (?, ?, datetime('now','localtime','+' || ? || ' days'))",
  ).run(hashToken(token), usuarioId, DIAS_SESION);
  db.prepare("UPDATE usuarios SET ultimo_acceso = datetime('now','localtime') WHERE id = ?").run(usuarioId);
  // Limpieza de sesiones vencidas.
  db.prepare("DELETE FROM sesiones WHERE expira_en < datetime('now','localtime')").run();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function cerrarSesionActual() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sesiones WHERE id = ?").run(hashToken(token));
  c.delete(COOKIE);
}

/** Usuario de la sesión actual, o null. Se calcula una sola vez por petición. */
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const u = db
    .prepare(
      `SELECT u.id, u.nombre, u.usuario, u.rol
       FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.id = ? AND s.expira_en > datetime('now','localtime') AND u.activo = 1`,
    )
    .get(hashToken(token)) as Usuario | undefined;
  return u ?? null;
});

// ---------- Permisos ----------

/** Para páginas: si no hay sesión, manda a iniciar sesión (o a crear el primer usuario). */
export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) redirect(hayUsuarios() ? "/login" : "/configurar");
  return u;
}

/** Para páginas solo de administrador. */
export async function exigirAdmin(): Promise<Usuario> {
  const u = await exigirUsuario();
  if (u.rol !== "admin") redirect("/sin-permiso");
  return u;
}

/**
 * Para server actions que devuelven el error como mensaje: lanza ErrorNegocio en vez de redirigir
 * (una redirección dentro de try/catch se perdería).
 */
export async function usuarioDeAccion(rol?: Rol): Promise<Usuario> {
  const u = await usuarioActual();
  if (!u) throw new ErrorNegocio("Tu sesión terminó. Vuelve a iniciar sesión.");
  if (rol === "admin" && u.rol !== "admin") throw new ErrorNegocio("No tienes permiso para hacer esto.");
  return u;
}

export const esAdmin = (u: Usuario | null | undefined) => u?.rol === "admin";
