"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { type EstadoForm } from "@/lib/forms";
import { guardarNegocio } from "@/lib/negocio";

export async function guardarConfiguracion(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const v = (k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);
  const nombre = v("nombre", 60);
  if (!nombre) return { error: "El nombre del negocio es obligatorio.", campos: { nombre: "Obligatorio." } };
  guardarNegocio({
    nombre,
    direccion: v("direccion", 120),
    telefono: v("telefono", 60),
    nit: v("nit", 40),
    mensajeTicket: v("mensajeTicket", 200),
  });
  revalidatePath("/", "layout");
  return { ok: "Configuración guardada." };
}
