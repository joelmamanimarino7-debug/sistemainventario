import "server-only";
import ExcelJS from "exceljs";
import { crearAjuste } from "./ajustes";
import { UNIDADES, UNIDADES_MEDIDA } from "./config";
import type { Producto } from "./data/productos";
import { db, ErrorNegocio, redondear, registrarMovimiento } from "./db";
import { agregarHoja, agregarHojaSimple, bs, type Columna, normalizarEncabezado, nuevoLibro, valorCelda } from "./excel";
import { aCentavos } from "./format";

// Importar y exportar productos en Excel. Las mismas columnas sirven para ambas cosas:
// se puede exportar, corregir en Excel y volver a importar.

type Clave =
  | "codigo"
  | "codigo_barras"
  | "nombre"
  | "descripcion"
  | "categoria"
  | "marca"
  | "modelo"
  | "proveedor"
  | "unidad"
  | "largo"
  | "ancho"
  | "alto"
  | "unidad_medida"
  | "color"
  | "material"
  | "peso"
  | "precio_costo"
  | "precio_venta"
  | "stock"
  | "stock_minimo"
  | "ubicacion"
  | "activo";

type Campo = {
  clave: Clave;
  titulo: string;
  alias?: string[];
  ancho?: number;
  formato?: Columna<Producto>["formato"];
  exportar: (p: Producto) => string | number | null;
};

const CAMPOS: Campo[] = [
  { clave: "codigo", titulo: "Código", ancho: 14, formato: "texto", exportar: (p) => p.codigo },
  { clave: "codigo_barras", titulo: "Código de barras", alias: ["codigobarras", "ean", "barras"], ancho: 18, formato: "texto", exportar: (p) => p.codigo_barras },
  { clave: "nombre", titulo: "Nombre", alias: ["producto", "articulo"], ancho: 36, exportar: (p) => p.nombre },
  { clave: "descripcion", titulo: "Descripción", ancho: 30, exportar: (p) => p.descripcion },
  { clave: "categoria", titulo: "Categoría", ancho: 18, exportar: (p) => p.categoria },
  { clave: "marca", titulo: "Marca", ancho: 16, exportar: (p) => p.marca },
  { clave: "modelo", titulo: "Modelo", ancho: 16, formato: "texto", exportar: (p) => p.modelo },
  { clave: "proveedor", titulo: "Proveedor", ancho: 20, exportar: (p) => p.proveedor },
  { clave: "unidad", titulo: "Unidad de venta", alias: ["unidad", "sevendepor"], ancho: 14, exportar: (p) => p.unidad },
  { clave: "largo", titulo: "Largo", formato: "cantidad", exportar: (p) => p.largo },
  { clave: "ancho", titulo: "Ancho", formato: "cantidad", exportar: (p) => p.ancho },
  { clave: "alto", titulo: "Alto", formato: "cantidad", exportar: (p) => p.alto },
  { clave: "unidad_medida", titulo: "Unidad de medida", alias: ["unidadmedida"], ancho: 16, exportar: (p) => p.unidad_medida },
  { clave: "color", titulo: "Color", exportar: (p) => p.color },
  { clave: "material", titulo: "Material", exportar: (p) => p.material },
  { clave: "peso", titulo: "Peso (kg)", alias: ["peso", "pesokg"], formato: "cantidad", exportar: (p) => p.peso },
  { clave: "precio_costo", titulo: "Precio de costo", alias: ["preciocosto", "costo"], ancho: 15, formato: "dinero", exportar: (p) => bs(p.precio_costo) },
  { clave: "precio_venta", titulo: "Precio de venta", alias: ["precioventa", "precio"], ancho: 15, formato: "dinero", exportar: (p) => bs(p.precio_venta) },
  { clave: "stock", titulo: "Stock", alias: ["stockactual", "existencia", "existencias", "cantidad"], formato: "cantidad", exportar: (p) => p.stock },
  { clave: "stock_minimo", titulo: "Stock mínimo", alias: ["stockminimo", "minimo"], ancho: 13, formato: "cantidad", exportar: (p) => p.stock_minimo },
  { clave: "ubicacion", titulo: "Ubicación", ancho: 14, exportar: (p) => p.ubicacion },
  { clave: "activo", titulo: "Activo", alias: ["estado"], ancho: 9, exportar: (p) => (p.activo ? "Sí" : "No") },
];

// ---------- Exportar ----------

export function listarParaExportar(): Producto[] {
  return db
    .prepare(
      `SELECT p.*, m.nombre AS marca, c.nombre AS categoria, pr.nombre AS proveedor
       FROM productos p
       LEFT JOIN marcas m ON m.id = p.marca_id
       LEFT JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
       ORDER BY p.activo DESC, p.nombre COLLATE NOCASE`,
    )
    .all() as Producto[];
}

const INSTRUCCIONES: [string, string | number | null][] = [
  ["Cómo importar productos", null],
  ["1. Llena una fila por producto en la hoja «Productos». No cambies los títulos de la primera fila.", ""],
  ["2. Código: si ya existe en el sistema, el producto se ACTUALIZA. Si no existe (o lo dejas vacío), se CREA uno nuevo (vacío = código automático P-00001).", ""],
  ["3. Al actualizar, las celdas vacías no cambian nada: solo se modifican las columnas que tengan algo escrito.", ""],
  ["4. Nombre es obligatorio para productos nuevos.", ""],
  ["5. Categoría, Marca y Proveedor se escriben con su nombre. Si no existen, se crean.", ""],
  [`6. Unidad de venta: ${UNIDADES.join(", ")}.`, ""],
  [`7. Unidad de medida: ${UNIDADES_MEDIDA.join(", ")}.`, ""],
  ["8. Precios en bolivianos, con coma o punto decimal (12,50 o 12.50).", ""],
  ["9. Stock: en productos nuevos es el stock inicial. En productos existentes solo se usa si al importar marcas «Ajustar el stock» (queda registrado como ajuste por conteo físico).", ""],
  ["10. Activo: Sí o No. «No» da de baja el producto (conserva su historial).", ""],
  ["Las columnas de valor (Valor a costo, Valor a venta) solo son informativas y se ignoran al importar.", ""],
  ["", ""],
  ["Ejemplo de una fila", null],
  ["Código: (vacío) · Nombre: Fuente rectangular de vidrio · Categoría: Cocina · Marca: Marinex · Modelo: FR-30 · Unidad de venta: unidad · Largo 30, Ancho 20, Alto 5, Unidad de medida: cm · Precio de costo: 45 · Precio de venta: 79,90 · Stock: 10 · Stock mínimo: 2 · Activo: Sí", ""],
];

export function libroProductos(productos: Producto[], esPlantilla = false): ExcelJS.Workbook {
  const libro = nuevoLibro();
  const columnas: Columna<Producto>[] = CAMPOS.map((c) => ({
    titulo: c.titulo,
    ancho: c.ancho,
    formato: c.formato,
    valor: c.exportar,
  }));
  if (!esPlantilla) {
    columnas.push(
      { titulo: "Valor a costo", ancho: 15, formato: "dinero", valor: (p) => bs(Math.round(p.stock * p.precio_costo)) },
      { titulo: "Valor a venta", ancho: 15, formato: "dinero", valor: (p) => bs(Math.round(p.stock * p.precio_venta)) },
    );
  }
  agregarHoja(libro, "Productos", columnas, productos);
  agregarHojaSimple(libro, "Instrucciones", INSTRUCCIONES, [110, 4]);
  return libro;
}

// ---------- Leer el archivo ----------

export type FilaArchivo = { fila: number; datos: Partial<Record<Clave, string | number>> };

const MAX_FILAS = 5000;

export async function leerArchivoProductos(archivo: File): Promise<FilaArchivo[]> {
  if (!/\.xlsx$/i.test(archivo.name)) throw new ErrorNegocio("El archivo debe ser de Excel (.xlsx). Si es .xls o .csv, ábrelo en Excel y guárdalo como .xlsx.");
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new ErrorNegocio("No se pudo leer el archivo. ¿Es un Excel (.xlsx) válido?");
  }
  const hoja = libro.getWorksheet("Productos") ?? libro.worksheets[0];
  if (!hoja) throw new ErrorNegocio("El archivo no tiene hojas.");

  // Busca la fila de títulos en las primeras 5 filas.
  const porAlias = new Map<string, Clave>();
  for (const c of CAMPOS) {
    porAlias.set(normalizarEncabezado(c.titulo), c.clave);
    porAlias.set(c.clave.replace(/_/g, ""), c.clave);
    for (const a of c.alias ?? []) porAlias.set(a, c.clave);
  }
  let filaTitulos = 0;
  let columnas = new Map<number, Clave>();
  for (let n = 1; n <= Math.min(5, hoja.rowCount); n++) {
    const mapa = new Map<number, Clave>();
    hoja.getRow(n).eachCell((celda, col) => {
      const v = valorCelda(celda.value);
      const clave = typeof v === "string" ? porAlias.get(normalizarEncabezado(v)) : undefined;
      if (clave && ![...mapa.values()].includes(clave)) mapa.set(col, clave);
    });
    if ([...mapa.values()].some((c) => c === "nombre" || c === "codigo")) {
      filaTitulos = n;
      columnas = mapa;
      break;
    }
  }
  if (!filaTitulos) throw new ErrorNegocio("No encontré la fila de títulos. La primera fila debe tener al menos «Código» o «Nombre».");

  const filas: FilaArchivo[] = [];
  for (let n = filaTitulos + 1; n <= hoja.rowCount; n++) {
    const row = hoja.getRow(n);
    const datos: FilaArchivo["datos"] = {};
    for (const [col, clave] of columnas) {
      const v = valorCelda(row.getCell(col).value);
      if (v != null) datos[clave] = v;
    }
    if (Object.keys(datos).length === 0) continue; // fila vacía
    filas.push({ fila: n, datos });
    if (filas.length > MAX_FILAS) throw new ErrorNegocio(`El archivo tiene más de ${MAX_FILAS} productos. Divídelo en partes.`);
  }
  if (!filas.length) throw new ErrorNegocio("El archivo no tiene productos debajo de los títulos.");
  return filas;
}

/** Revisa que las filas que manda el navegador tengan la forma esperada (solo columnas conocidas, texto o número). */
export function limpiarFilas(x: unknown): FilaArchivo[] {
  if (!Array.isArray(x) || x.length > MAX_FILAS) throw new ErrorNegocio("Datos de importación no válidos.");
  const claves = new Set<string>(CAMPOS.map((c) => c.clave));
  return x.map((f) => {
    const fila = Number((f as FilaArchivo)?.fila);
    const datos: FilaArchivo["datos"] = {};
    for (const [k, v] of Object.entries((f as FilaArchivo)?.datos ?? {})) {
      if (claves.has(k) && (typeof v === "string" || (typeof v === "number" && Number.isFinite(v)))) datos[k as Clave] = v;
    }
    return { fila: Number.isFinite(fila) ? fila : 0, datos };
  });
}

// ---------- Validar ----------

type ValoresProducto = {
  codigo?: string;
  codigo_barras?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  modelo?: string;
  proveedor?: string;
  unidad?: string;
  largo?: number;
  ancho?: number;
  alto?: number;
  unidad_medida?: string;
  color?: string;
  material?: string;
  peso?: number;
  precio_costo?: number; // centavos
  precio_venta?: number; // centavos
  stock?: number;
  stock_minimo?: number;
  ubicacion?: string;
  activo?: 0 | 1;
};

export type FilaRevisada = {
  fila: number;
  accion: "crear" | "actualizar" | "error";
  productoId?: number;
  nombre: string;
  codigo: string | null;
  errores: string[];
  avisos: string[];
  /** Cambio de stock que se aplicaría (solo productos existentes con «ajustar stock»). */
  stockAntes?: number;
  stockDespues?: number;
  valores: ValoresProducto;
};

export type ResumenImportacion = {
  filas: FilaRevisada[];
  crear: number;
  actualizar: number;
  conError: number;
  ajustesStock: number;
  catalogosNuevos: { categorias: string[]; marcas: string[]; proveedores: string[] };
};

const texto = (v: string | number | undefined) => (v == null ? undefined : String(v).trim() || undefined);

function numeroCantidad(v: string | number | undefined): number | undefined | null {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  const t = v.replace(/\s/g, "");
  const n = Number(t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function dineroCentavos(v: string | number | undefined): number | undefined | null {
  if (v == null) return undefined;
  if (typeof v === "number") return Math.round(v * 100);
  return aCentavos(v);
}

function normalizarUnidad(v: string, lista: readonly string[]): string | null {
  const t = v.trim().toLowerCase();
  if (lista.includes(t)) return t;
  // Acepta plurales: "unidades", "cajas", "pares", "metros".
  for (const u of lista) if (t === `${u}s` || t === `${u}es`) return u;
  if (t === "pza" || t === "pieza" || t === "piezas" || t === "und" || t === "u") return lista.includes("unidad") ? "unidad" : null;
  return null;
}

function idCatalogo(tabla: "categorias" | "marcas" | "proveedores", nombre: string): number | undefined {
  return (db.prepare(`SELECT id FROM ${tabla} WHERE nombre = ? COLLATE NOCASE`).get(nombre) as { id: number } | undefined)?.id;
}

export function revisarImportacion(entrada: FilaArchivo[], opciones: { ajustarStock: boolean }): ResumenImportacion {
  const codigosVistos = new Map<string, number>();
  const barrasVistas = new Map<string, number>();
  const nuevos = { categorias: new Set<string>(), marcas: new Set<string>(), proveedores: new Set<string>() };

  const filas = entrada.map(({ fila, datos: d }): FilaRevisada => {
    const errores: string[] = [];
    const avisos: string[] = [];
    const v: ValoresProducto = {};

    const textos: Clave[] = ["codigo", "codigo_barras", "nombre", "descripcion", "categoria", "marca", "modelo", "proveedor", "color", "material", "ubicacion"];
    for (const k of textos) {
      const t = texto(d[k]);
      if (t !== undefined) (v as Record<string, unknown>)[k] = t;
    }
    // Excel guarda los códigos numéricos como número: "00123" se pierde, pero 123 → "123".
    if (typeof d.codigo === "number") v.codigo = String(d.codigo);
    if (typeof d.codigo_barras === "number") v.codigo_barras = String(Math.round(d.codigo_barras));

    if (d.unidad != null) {
      const u = normalizarUnidad(String(d.unidad), UNIDADES);
      if (u) v.unidad = u;
      else errores.push(`Unidad de venta «${d.unidad}» no válida (usa: ${UNIDADES.join(", ")}).`);
    }
    if (d.unidad_medida != null) {
      const u = normalizarUnidad(String(d.unidad_medida), UNIDADES_MEDIDA);
      if (u) v.unidad_medida = u;
      else errores.push(`Unidad de medida «${d.unidad_medida}» no válida (usa: ${UNIDADES_MEDIDA.join(", ")}).`);
    }
    for (const k of ["largo", "ancho", "alto", "peso", "stock", "stock_minimo"] as const) {
      const n = numeroCantidad(d[k]);
      if (n === null || (n !== undefined && n < 0)) errores.push(`«${CAMPOS.find((c) => c.clave === k)!.titulo}» debe ser un número mayor o igual a 0.`);
      else if (n !== undefined) v[k] = redondear(n);
    }
    for (const k of ["precio_costo", "precio_venta"] as const) {
      const c = dineroCentavos(d[k]);
      if (c === null || (c !== undefined && c < 0)) errores.push(`«${CAMPOS.find((x) => x.clave === k)!.titulo}» no es un precio válido.`);
      else if (c !== undefined) v[k] = c;
    }
    if (d.activo != null) {
      const a = normalizarEncabezado(String(d.activo));
      if (["si", "s", "1", "activo", "true", "verdadero", "x"].includes(a)) v.activo = 1;
      else if (["no", "n", "0", "inactivo", "false", "falso", "baja"].includes(a)) v.activo = 0;
      else errores.push(`«Activo» debe ser Sí o No.`);
    }

    // ¿Crear o actualizar?
    const existente = v.codigo
      ? (db.prepare("SELECT id, nombre, stock FROM productos WHERE codigo = ? COLLATE NOCASE").get(v.codigo) as
          | { id: number; nombre: string; stock: number }
          | undefined)
      : undefined;
    if (!existente && !v.nombre) errores.push("Falta el nombre (obligatorio para productos nuevos).");

    if (v.codigo) {
      const k = v.codigo.toLowerCase();
      if (codigosVistos.has(k)) errores.push(`El código «${v.codigo}» está repetido (fila ${codigosVistos.get(k)}).`);
      else codigosVistos.set(k, fila);
    }
    if (v.codigo_barras) {
      if (barrasVistas.has(v.codigo_barras)) errores.push(`El código de barras está repetido (fila ${barrasVistas.get(v.codigo_barras)}).`);
      else barrasVistas.set(v.codigo_barras, fila);
      const otro = db
        .prepare("SELECT codigo FROM productos WHERE codigo_barras = ? AND id <> ?")
        .get(v.codigo_barras, existente?.id ?? -1) as { codigo: string } | undefined;
      if (otro) errores.push(`El código de barras ya lo usa el producto ${otro.codigo}.`);
    }

    const r: FilaRevisada = {
      fila,
      accion: errores.length ? "error" : existente ? "actualizar" : "crear",
      productoId: existente?.id,
      nombre: v.nombre ?? existente?.nombre ?? "(sin nombre)",
      codigo: v.codigo ?? null,
      errores,
      avisos,
      valores: v,
    };
    if (errores.length) return r;

    if (existente && v.stock !== undefined && v.stock !== existente.stock) {
      if (opciones.ajustarStock) {
        r.stockAntes = existente.stock;
        r.stockDespues = v.stock;
      } else avisos.push(`Stock del archivo (${v.stock}) distinto al del sistema (${existente.stock}): no se cambia.`);
    }
    if (v.precio_venta !== undefined && v.precio_costo !== undefined && v.precio_venta < v.precio_costo)
      avisos.push("El precio de venta es menor que el costo.");
    if (v.categoria && !idCatalogo("categorias", v.categoria)) nuevos.categorias.add(v.categoria);
    if (v.marca && !idCatalogo("marcas", v.marca)) nuevos.marcas.add(v.marca);
    if (v.proveedor && !idCatalogo("proveedores", v.proveedor)) nuevos.proveedores.add(v.proveedor);
    return r;
  });

  // Catálogos nuevos: sin repetir por mayúsculas/minúsculas.
  const unicos = (s: Set<string>) => [...new Map([...s].map((x) => [x.toLowerCase(), x])).values()];
  return {
    filas,
    crear: filas.filter((f) => f.accion === "crear").length,
    actualizar: filas.filter((f) => f.accion === "actualizar").length,
    conError: filas.filter((f) => f.accion === "error").length,
    ajustesStock: filas.filter((f) => f.stockDespues !== undefined).length,
    catalogosNuevos: {
      categorias: unicos(nuevos.categorias),
      marcas: unicos(nuevos.marcas),
      proveedores: unicos(nuevos.proveedores),
    },
  };
}

// ---------- Aplicar ----------

/** Aplica las filas válidas en una sola transacción: si algo falla, no se cambia nada. */
export function aplicarImportacion(
  entrada: FilaArchivo[],
  opciones: { ajustarStock: boolean; usuario: { id: number; nombre: string } },
): { creados: number; actualizados: number; omitidos: number; ajusteId: number | null } {
  return db.transaction(() => {
    const revision = revisarImportacion(entrada, opciones);
    const catalogo = (tabla: "categorias" | "marcas" | "proveedores", nombre: string | undefined) => {
      if (!nombre) return undefined;
      return idCatalogo(tabla, nombre) ?? Number(db.prepare(`INSERT INTO ${tabla} (nombre) VALUES (?)`).run(nombre).lastInsertRowid);
    };

    let creados = 0;
    let actualizados = 0;
    const renglonesAjuste: { productoId: number; modo: "conteo"; valor: number }[] = [];

    for (const f of revision.filas) {
      if (f.accion === "error") continue;
      const v = f.valores;
      const columnas: Record<string, unknown> = {};
      const copiar = ["codigo_barras", "nombre", "descripcion", "modelo", "unidad", "largo", "ancho", "alto", "unidad_medida", "color", "material", "peso", "precio_costo", "precio_venta", "stock_minimo", "ubicacion", "activo"] as const;
      for (const k of copiar) if (v[k] !== undefined) columnas[k] = v[k];
      const cat = catalogo("categorias", v.categoria);
      const mar = catalogo("marcas", v.marca);
      const pro = catalogo("proveedores", v.proveedor);
      if (cat !== undefined) columnas.categoria_id = cat;
      if (mar !== undefined) columnas.marca_id = mar;
      if (pro !== undefined) columnas.proveedor_id = pro;

      if (f.accion === "actualizar" && f.productoId) {
        const claves = Object.keys(columnas);
        if (claves.length) {
          db.prepare(
            `UPDATE productos SET ${claves.map((k) => `${k} = @${k}`).join(", ")}, actualizado_en = datetime('now','localtime') WHERE id = @id`,
          ).run({ ...columnas, id: f.productoId });
        }
        if (f.stockDespues !== undefined) renglonesAjuste.push({ productoId: f.productoId, modo: "conteo", valor: f.stockDespues });
        actualizados++;
      } else {
        const codigo = v.codigo ?? `__tmp_${Date.now()}_${Math.random()}`;
        const claves = ["codigo", ...Object.keys(columnas)];
        const id = Number(
          db
            .prepare(`INSERT INTO productos (${claves.join(", ")}) VALUES (${claves.map((k) => `@${k}`).join(", ")})`)
            .run({ ...columnas, codigo }).lastInsertRowid,
        );
        if (!v.codigo) {
          let nuevo = `P-${String(id).padStart(5, "0")}`;
          for (let n = 1; db.prepare("SELECT 1 FROM productos WHERE codigo = ? AND id <> ?").get(nuevo, id); n++)
            nuevo = `P-${String(id).padStart(5, "0")}-${n}`;
          db.prepare("UPDATE productos SET codigo = ? WHERE id = ?").run(nuevo, id);
        }
        if (v.stock && v.stock > 0) {
          registrarMovimiento({
            productoId: id,
            tipo: "entrada",
            cantidad: v.stock,
            nota: "Stock inicial (importado de Excel)",
            usuario: opciones.usuario.nombre,
          });
        }
        creados++;
      }
    }

    const ajusteId = renglonesAjuste.length
      ? crearAjuste({ motivo: "Conteo físico", nota: "Importado desde Excel", renglones: renglonesAjuste, usuario: opciones.usuario })
      : null;
    return { creados, actualizados, omitidos: revision.conError, ajusteId };
  })();
}
