// Next.js ejecuta register() una vez al arrancar el servidor.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { iniciarRespaldosAutomaticos } = await import("./lib/respaldosAuto");
  iniciarRespaldosAutomaticos();
}
