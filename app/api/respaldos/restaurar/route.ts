import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { cerrarSesionActual, usuarioActual } from "@/lib/auth";
import { ErrorNegocio } from "@/lib/db";
import { restaurarRespaldo, rutaRespaldo } from "@/lib/respaldos";

// Restaura un respaldo: el elegido de la lista (campo "archivo") o uno subido (campo "zip").
// Se hace con una ruta y no con una server action porque un respaldo puede pesar más de 20 MB.
export async function POST(req: Request) {
  const yo = await usuarioActual();
  if (!yo) return Response.json({ ok: false, error: "Tu sesión terminó. Vuelve a iniciar sesión." }, { status: 401 });
  if (yo.rol !== "admin") return Response.json({ ok: false, error: "Solo un administrador puede restaurar." }, { status: 403 });

  try {
    const fd = await req.formData();
    let contenido: Uint8Array;
    const archivo = fd.get("archivo");
    const zip = fd.get("zip");
    if (typeof archivo === "string" && archivo) {
      const ruta = rutaRespaldo(archivo);
      if (!ruta) throw new ErrorNegocio("Ese respaldo ya no existe en la carpeta.");
      contenido = new Uint8Array(await fs.readFile(ruta));
    } else if (zip instanceof File && zip.size > 0) {
      contenido = new Uint8Array(await zip.arrayBuffer());
    } else {
      throw new ErrorNegocio("Elige un respaldo.");
    }
    const r = await restaurarRespaldo(contenido);
    await cerrarSesionActual(); // los usuarios ahora son los del respaldo: hay que volver a entrar
    revalidatePath("/", "layout");
    return Response.json({ ok: true, ...r });
  } catch (e) {
    const mensaje = e instanceof ErrorNegocio ? e.message : `No se pudo restaurar: ${(e as Error).message}`;
    return Response.json({ ok: false, error: mensaje }, { status: 400 });
  }
}
