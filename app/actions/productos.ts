"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/auth";
import { UNIDADES, UNIDADES_MEDIDA } from "@/lib/config";
import { db, ErrorNegocio, registrarMovimiento } from "@/lib/db";
import { centavos, type EstadoForm, entero, mensajeError, numero, texto } from "@/lib/forms";
import { borrarImagen, guardarImagen } from "@/lib/imagenes";

/** Si el formulario trae una foto nueva, la procesa y guarda. Devuelve su id o null. */
async function fotoNueva(fd: FormData): Promise<string | null> {
  const archivo = fd.get("imagen");
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  return guardarImagen(archivo);
}

type DatosProducto = {
  codigo: string | null;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  marca_id: number | null;
  modelo: string | null;
  categoria_id: number | null;
  proveedor_id: number | null;
  unidad: string;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
  unidad_medida: string;
  color: string | null;
  material: string | null;
  peso: number | null;
  precio_costo: number;
  precio_venta: number;
  stock_minimo: number;
  ubicacion: string | null;
};

/** Lee y valida el formulario. Devuelve los datos limpios o los errores por campo. */
function leerFormulario(fd: FormData): { datos?: DatosProducto; campos?: Record<string, string> } {
  const campos: Record<string, string> = {};

  const nombre = texto(fd, "nombre");
  if (!nombre) campos.nombre = "El nombre es obligatorio.";

  const positivoOpcional = (clave: string) => {
    const n = numero(fd, clave);
    if (n != null && (Number.isNaN(n) || n < 0)) {
      campos[clave] = "Debe ser un número mayor o igual a 0.";
      return null;
    }
    return n;
  };
  const dineroObligatorio = (clave: string) => {
    const c = centavos(fd, clave);
    if (c == null) return 0;
    if (Number.isNaN(c) || c < 0) {
      campos[clave] = "Escribe un precio válido.";
      return 0;
    }
    return c;
  };

  const unidad = texto(fd, "unidad") ?? "unidad";
  const unidadMedida = texto(fd, "unidad_medida") ?? "cm";

  const datos: DatosProducto = {
    codigo: texto(fd, "codigo"),
    codigo_barras: texto(fd, "codigo_barras"),
    nombre: nombre ?? "",
    descripcion: texto(fd, "descripcion"),
    marca_id: entero(fd, "marca_id"),
    modelo: texto(fd, "modelo"),
    categoria_id: entero(fd, "categoria_id"),
    proveedor_id: entero(fd, "proveedor_id"),
    unidad: (UNIDADES as readonly string[]).includes(unidad) ? unidad : "unidad",
    largo: positivoOpcional("largo"),
    ancho: positivoOpcional("ancho"),
    alto: positivoOpcional("alto"),
    unidad_medida: (UNIDADES_MEDIDA as readonly string[]).includes(unidadMedida) ? unidadMedida : "cm",
    color: texto(fd, "color"),
    material: texto(fd, "material"),
    peso: positivoOpcional("peso"),
    precio_costo: dineroObligatorio("precio_costo"),
    precio_venta: dineroObligatorio("precio_venta"),
    stock_minimo: positivoOpcional("stock_minimo") ?? 0,
    ubicacion: texto(fd, "ubicacion"),
  };

  return Object.keys(campos).length ? { campos } : { datos };
}

/** Genera un código tipo P-00012 que no choque con uno existente. */
function generarCodigo(id: number): string {
  const base = `P-${String(id).padStart(5, "0")}`;
  let codigo = base;
  let n = 1;
  while (db.prepare("SELECT 1 FROM productos WHERE codigo = ? AND id <> ?").get(codigo, id)) {
    codigo = `${base}-${n++}`;
  }
  return codigo;
}

export async function crearProducto(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const yo = await exigirAdmin();
  const { datos, campos } = leerFormulario(fd);
  if (!datos) return { error: "Revisa los campos marcados.", campos };

  const stockInicial = numero(fd, "stock_inicial") ?? 0;
  if (Number.isNaN(stockInicial) || stockInicial < 0) {
    return { error: "Revisa los campos marcados.", campos: { stock_inicial: "Debe ser 0 o más." } };
  }

  let imagen: string | null = null;
  try {
    imagen = await fotoNueva(fd);
  } catch (e) {
    return { error: mensajeError(e), campos: { imagen: mensajeError(e) } };
  }

  let nuevoId: number;
  try {
    nuevoId = db.transaction(() => {
      const codigoTemporal = datos.codigo ?? `__tmp_${Date.now()}_${Math.random()}`;
      const r = db
        .prepare(
          `INSERT INTO productos (codigo, codigo_barras, nombre, descripcion, marca_id, modelo, categoria_id,
             proveedor_id, unidad, largo, ancho, alto, unidad_medida, color, material, peso,
             precio_costo, precio_venta, stock_minimo, ubicacion, imagen)
           VALUES (@codigo, @codigo_barras, @nombre, @descripcion, @marca_id, @modelo, @categoria_id,
             @proveedor_id, @unidad, @largo, @ancho, @alto, @unidad_medida, @color, @material, @peso,
             @precio_costo, @precio_venta, @stock_minimo, @ubicacion, @imagen)`,
        )
        .run({ ...datos, codigo: codigoTemporal, imagen });
      const id = Number(r.lastInsertRowid);

      if (!datos.codigo) {
        db.prepare("UPDATE productos SET codigo = ? WHERE id = ?").run(generarCodigo(id), id);
      }
      if (stockInicial > 0) {
        registrarMovimiento({ productoId: id, tipo: "entrada", cantidad: stockInicial, nota: "Stock inicial", usuario: yo.nombre });
      }
      return id;
    })();
  } catch (e) {
    await borrarImagen(imagen); // no dejar fotos huérfanas
    return { error: mensajeError(e) };
  }

  revalidatePath("/", "layout");
  redirect(`/productos/${nuevoId}?creado=1`);
}

export async function actualizarProducto(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = Number(fd.get("id"));
  const { datos, campos } = leerFormulario(fd);
  if (!datos) return { error: "Revisa los campos marcados.", campos };
  if (!datos.codigo) return { error: "Revisa los campos marcados.", campos: { codigo: "El código no puede quedar vacío." } };

  const actual = db.prepare("SELECT imagen FROM productos WHERE id = ?").get(id) as { imagen: string | null } | undefined;
  if (!actual) return { error: "El producto no existe." };

  let nueva: string | null = null;
  try {
    nueva = await fotoNueva(fd);
  } catch (e) {
    return { error: mensajeError(e), campos: { imagen: mensajeError(e) } };
  }
  const quitar = fd.get("quitar_imagen") === "1";
  const imagen = nueva ?? (quitar ? null : actual.imagen);

  try {
    const r = db
      .prepare(
        `UPDATE productos SET codigo=@codigo, codigo_barras=@codigo_barras, nombre=@nombre,
           descripcion=@descripcion, marca_id=@marca_id, modelo=@modelo, categoria_id=@categoria_id,
           proveedor_id=@proveedor_id, unidad=@unidad, largo=@largo, ancho=@ancho, alto=@alto,
           unidad_medida=@unidad_medida, color=@color, material=@material, peso=@peso,
           precio_costo=@precio_costo, precio_venta=@precio_venta, stock_minimo=@stock_minimo,
           ubicacion=@ubicacion, imagen=@imagen, actualizado_en=datetime('now','localtime')
         WHERE id=@id`,
      )
      .run({ ...datos, imagen, id });
    if (r.changes === 0) throw new ErrorNegocio("El producto no existe.");
  } catch (e) {
    await borrarImagen(nueva);
    return { error: mensajeError(e) };
  }

  // La foto anterior ya no se usa: la borramos del disco.
  if (actual.imagen && actual.imagen !== imagen) await borrarImagen(actual.imagen);

  revalidatePath("/", "layout");
  redirect(`/productos/${id}?guardado=1`);
}

/** "Eliminar" un producto = desactivarlo. Conserva su historial de ventas y movimientos. */
export async function cambiarEstadoProducto(fd: FormData) {
  await exigirAdmin();
  const id = Number(fd.get("id"));
  const activo = fd.get("activo") === "1" ? 1 : 0;
  db.prepare("UPDATE productos SET activo = ?, actualizado_en = datetime('now','localtime') WHERE id = ?").run(
    activo,
    id,
  );
  revalidatePath("/", "layout");
}
