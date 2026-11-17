"use server";

import { revalidatePath } from "next/cache";
import { usuarioDeAccion } from "@/lib/auth";
import { type EstadoForm, mensajeError } from "@/lib/forms";
import { crearRespaldo, guardarAjustesRespaldo } from "@/lib/respaldos";

export async function respaldarAhora(_prev: EstadoForm, _fd: FormData): Promise<EstadoForm> {
  try {
    await usuarioDeAccion("admin");
    const r = await crearRespaldo("manual");
    revalidatePath("/respaldos");
    return { ok: `Respaldo creado: ${r.archivo}` };
  } catch (e) {
    revalidatePath("/respaldos");
    return { error: mensajeError(e) };
  }
}

export async function guardarAjustesRespaldoAccion(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  try {
    await usuarioDeAccion("admin");
    guardarAjustesRespaldo({
      carpeta: String(fd.get("carpeta") ?? ""),
      conservar: Number(fd.get("conservar")),
      automatico: fd.get("automatico") === "1",
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/respaldos");
  return { ok: "Ajustes guardados." };
}
