"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioDeAccion } from "@/lib/auth";
import { calcularResumen } from "@/lib/caja";
import { db, ErrorNegocio } from "@/lib/db";
import { centavos, type EstadoForm, mensajeError, texto } from "@/lib/forms";
import { dinero } from "@/lib/format";
import { ajustesRespaldo, crearRespaldo } from "@/lib/respaldos";

export async function abrirCaja(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  try {
    const yo = await usuarioDeAccion();
    const monto = centavos(fd, "monto_inicial") ?? 0;
    if (Number.isNaN(monto) || monto < 0) return { error: "Escribe un monto válido (0 si la caja empieza vacía).", campos: { monto_inicial: "Monto no válido." } };
    try {
      db.prepare("INSERT INTO cajas (abierta_por, monto_inicial) VALUES (?, ?)").run(yo.id, monto);
    } catch (e) {
      if (String((e as Error).message).includes("UNIQUE")) throw new ErrorNegocio("Ya hay una caja abierta.");
      throw e;
    }
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Caja abierta." };
}

export async function registrarMovimientoCaja(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  try {
    const yo = await usuarioDeAccion();
    const tipo = fd.get("tipo") === "ingreso" ? "ingreso" : "retiro";
    const monto = centavos(fd, "monto");
    const motivo = texto(fd, "motivo");
    const campos: Record<string, string> = {};
    if (monto == null || Number.isNaN(monto) || monto <= 0) campos.monto = "Escribe un monto mayor a 0.";
    if (!motivo) campos.motivo = "Indica el motivo.";
    if (Object.keys(campos).length) return { error: "Revisa los campos marcados.", campos };

    db.transaction(() => {
      const caja = db.prepare("SELECT id, monto_inicial FROM cajas WHERE estado = 'abierta'").get() as
        | { id: number; monto_inicial: number }
        | undefined;
      if (!caja) throw new ErrorNegocio("La caja está cerrada.");
      if (tipo === "retiro") {
        const disponible = calcularResumen(caja.id, caja.monto_inicial).efectivoEsperado;
        if (monto! > disponible)
          throw new ErrorNegocio(
            yo.rol === "admin"
              ? `No puede salir más efectivo del que debería haber en caja (${dinero(disponible)}).`
              : "Ese retiro es mayor que el efectivo que debería haber en caja.",
          );
      }
      db.prepare("INSERT INTO caja_movimientos (caja_id, tipo, monto, motivo, usuario_id) VALUES (?, ?, ?, ?, ?)").run(
        caja.id,
        tipo,
        monto,
        motivo!.slice(0, 200),
        yo.id,
      );
    })();
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/caja");
  return { ok: "Registrado." };
}

export async function cerrarCaja(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  let cajaId: number;
  try {
    const yo = await usuarioDeAccion();
    cajaId = Number(fd.get("caja_id"));
    const contado = centavos(fd, "efectivo_contado");
    if (contado == null || Number.isNaN(contado) || contado < 0)
      return { error: "Escribe cuánto efectivo contaste.", campos: { efectivo_contado: "Obligatorio." } };
    const nota = texto(fd, "nota_cierre");

    db.transaction(() => {
      const caja = db.prepare("SELECT id, estado, monto_inicial FROM cajas WHERE id = ?").get(cajaId) as
        | { id: number; estado: string; monto_inicial: number }
        | undefined;
      if (!caja) throw new ErrorNegocio("La caja no existe.");
      if (caja.estado !== "abierta") throw new ErrorNegocio("Esta caja ya fue cerrada.");
      const resumen = calcularResumen(caja.id, caja.monto_inicial);
      db.prepare(
        `UPDATE cajas SET estado = 'cerrada', cerrada_por = ?, cerrada_en = datetime('now','localtime'),
           efectivo_esperado = ?, efectivo_contado = ?, diferencia = ?, resumen = ?, nota_cierre = ?
         WHERE id = ?`,
      ).run(yo.id, resumen.efectivoEsperado, contado, contado - resumen.efectivoEsperado, JSON.stringify(resumen), nota, caja.id);
    })();
  } catch (e) {
    return { error: mensajeError(e) };
  }

  // Respaldo al cerrar la caja (en segundo plano: no hace esperar al usuario).
  if (ajustesRespaldo().automatico) {
    void crearRespaldo("cierre").catch((e) => console.error("[respaldos] Falló el respaldo del cierre:", (e as Error).message));
  }
  revalidatePath("/", "layout");
  redirect(`/caja/${cajaId}?cerrada=1`);
}
