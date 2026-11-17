import fs from "node:fs/promises";
import { usuarioActual } from "@/lib/auth";
import { rutaRespaldo } from "@/lib/respaldos";

// Descarga de un respaldo de la carpeta de respaldos (solo administradores).
export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  const yo = await usuarioActual();
  if (!yo) return new Response("Inicia sesión para descargar.", { status: 401 });
  if (yo.rol !== "admin") return new Response("Solo un administrador puede descargar respaldos.", { status: 403 });
  const { archivo } = await params;
  const ruta = rutaRespaldo(archivo);
  if (!ruta) return new Response("No existe ese respaldo.", { status: 404 });
  const datos = await fs.readFile(ruta);
  return new Response(new Uint8Array(datos), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
