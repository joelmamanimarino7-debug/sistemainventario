import fs from "node:fs/promises";
import { usuarioActual } from "@/lib/auth";
import { rutaImagen } from "@/lib/imagenes";

// Sirve las fotos de productos guardadas en data/imagenes.
export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  if (!(await usuarioActual())) return new Response("No autorizado", { status: 401 });
  const { archivo } = await params;
  const ruta = rutaImagen(archivo);
  if (!ruta) return new Response("No encontrado", { status: 404 });
  try {
    const datos = await fs.readFile(ruta);
    return new Response(new Uint8Array(datos), {
      headers: {
        "Content-Type": "image/webp",
        // Cada foto tiene un nombre único, así que el navegador puede guardarla en caché para siempre.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("No encontrado", { status: 404 });
  }
}
