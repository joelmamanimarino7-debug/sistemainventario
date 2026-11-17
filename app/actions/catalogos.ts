"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { catalogoEnUso, type TablaCatalogo } from "@/lib/data/catalogos";
import { type EstadoForm, mensajeError, texto } from "@/lib/forms";

const TABLAS: TablaCatalogo[] = ["categorias", "marcas"];

function validarTabla(t: string): TablaCatalogo {
  if (!TABLAS.includes(t as TablaCatalogo)) throw new Error("Catálogo no válido");
  return t as TablaCatalogo;
}

function refrescar() {
  revalidatePath("/", "layout");
}

// ---------- Categorías y marcas (solo tienen nombre) ----------

export async function crearItemCatalogo(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const tabla = validarTabla(String(fd.get("tabla")));
  const nombre = texto(fd, "nombre");
  if (!nombre) return { error: "Escribe un nombre." };
  try {
    db.prepare(`INSERT INTO ${tabla} (nombre) VALUES (?)`).run(nombre);
  } catch (e) {
    return { error: mensajeError(e) };
  }
  refrescar();
  return { ok: `"${nombre}" agregado.` };
}

export async function renombrarItemCatalogo(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const tabla = validarTabla(String(fd.get("tabla")));
  const id = Number(fd.get("id"));
  const nombre = texto(fd, "nombre");
  if (!nombre) return { error: "El nombre no puede quedar vacío." };
  try {
    db.prepare(`UPDATE ${tabla} SET nombre = ? WHERE id = ?`).run(nombre, id);
  } catch (e) {
    return { error: mensajeError(e) };
  }
  refrescar();
  return { ok: "Guardado." };
}

export async function cambiarEstadoCatalogo(fd: FormData) {
  await exigirAdmin();
  const tabla = String(fd.get("tabla"));
  if (![...TABLAS, "proveedores"].includes(tabla)) throw new Error("Catálogo no válido");
  const id = Number(fd.get("id"));
  const activo = fd.get("activo") === "1" ? 1 : 0;
  db.prepare(`UPDATE ${tabla} SET activo = ? WHERE id = ?`).run(activo, id);
  refrescar();
}

/** Borra solo si nadie lo usa; si está en uso, hay que desactivarlo. */
export async function eliminarItemCatalogo(fd: FormData) {
  await exigirAdmin();
  const tabla = String(fd.get("tabla")) as TablaCatalogo | "proveedores";
  if (![...TABLAS, "proveedores"].includes(tabla)) throw new Error("Catálogo no válido");
  const id = Number(fd.get("id"));
  if (catalogoEnUso(tabla, id)) {
    // La interfaz ya oculta el botón en este caso; esto es una protección extra.
    throw new Error("No se puede eliminar porque está en uso. Desactívalo en su lugar.");
  }
  db.prepare(`DELETE FROM ${tabla} WHERE id = ?`).run(id);
  refrescar();
}

// ---------- Proveedores ----------

export async function guardarProveedor(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = fd.get("id") ? Number(fd.get("id")) : null;
  const datos = {
    nombre: texto(fd, "nombre"),
    contacto: texto(fd, "contacto"),
    telefono: texto(fd, "telefono"),
    email: texto(fd, "email"),
    direccion: texto(fd, "direccion"),
    notas: texto(fd, "notas"),
  };
  if (!datos.nombre) return { error: "El nombre es obligatorio.", campos: { nombre: "Obligatorio" } };

  try {
    if (id) {
      db.prepare(
        `UPDATE proveedores SET nombre=@nombre, contacto=@contacto, telefono=@telefono,
         email=@email, direccion=@direccion, notas=@notas WHERE id=@id`,
      ).run({ ...datos, id });
    } else {
      db.prepare(
        `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, notas)
         VALUES (@nombre, @contacto, @telefono, @email, @direccion, @notas)`,
      ).run(datos);
    }
  } catch (e) {
    return { error: mensajeError(e) };
  }
  refrescar();
  redirect("/proveedores");
}
