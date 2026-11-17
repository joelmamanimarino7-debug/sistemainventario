import "server-only";
import { ajustesRespaldo, crearRespaldo, listarRespaldos } from "./respaldos";

// Respaldo automático diario. Mientras el sistema esté encendido, cada 30 minutos revisa si ya hay
// un respaldo de hoy (automático, manual o de cierre de caja); si no lo hay, crea uno.
// Así, aunque la computadora se apague de noche, el respaldo del día se hace al encenderla.

const g = globalThis as unknown as { __respaldosAuto?: NodeJS.Timeout };

async function revisar() {
  try {
    if (!ajustesRespaldo().automatico) return;
    const d = new Date();
    const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const hayDeHoy = listarRespaldos().some((r) => r.fecha.startsWith(hoy) && r.tipo !== "previo");
    if (!hayDeHoy) {
      const r = await crearRespaldo("auto");
      console.log(`[respaldos] Respaldo automático creado: ${r.archivo}`);
    }
  } catch (e) {
    console.error("[respaldos] No se pudo crear el respaldo automático:", (e as Error).message);
  }
}

export function iniciarRespaldosAutomaticos() {
  if (g.__respaldosAuto) return; // ya iniciado (el modo desarrollo recarga módulos)
  setTimeout(revisar, 20_000).unref();
  g.__respaldosAuto = setInterval(revisar, 30 * 60_000);
  g.__respaldosAuto.unref();
}
