// Carga datos de ejemplo (artículos de cocina) para probar el sistema.
// Uso:  INVENTARIO_DB=data/demo.db npm run seed    → recomendado: base separada para pruebas
//       npm run seed                               → usa data/inventario.db
// Solo inserta datos si la base no tiene productos. Las fotos se toman de la carpeta images/.
// Los precios, medidas y stock son inventados, solo para la demostración.

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const dbPath = process.env.INVENTARIO_DB ?? path.join(process.cwd(), "data", "inventario.db");
const dirImagenes = path.join(path.dirname(dbPath), "imagenes");
const dirFotos = path.join(process.cwd(), "images");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8"));

const hay = db.prepare("SELECT COUNT(*) AS n FROM productos").get().n;
if (hay > 0) {
  console.log(`La base ${dbPath} ya tiene ${hay} productos. No se cargó nada.`);
  process.exit(0);
}

/** Mismo procesamiento que lib/imagenes.ts: recorta bordes negros y genera grande + miniatura. */
async function procesarFoto(archivo) {
  const ruta = path.join(dirFotos, archivo);
  if (!fs.existsSync(ruta)) {
    console.warn(`  (sin foto: no se encontró images/${archivo})`);
    return null;
  }
  let buf = fs.readFileSync(ruta);
  try {
    buf = await sharp(buf).rotate().trim({ background: "#000000", threshold: 30 }).toBuffer();
  } catch {
    buf = await sharp(buf).rotate().toBuffer();
  }
  const id = crypto.randomUUID();
  fs.mkdirSync(dirImagenes, { recursive: true });
  await sharp(buf).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dirImagenes, `${id}.webp`));
  await sharp(buf).resize(240, 240, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(dirImagenes, `${id}-mini.webp`));
  return id;
}

const categorias = ["Repostería", "Servir y presentar", "Organización", "Conservación"];
const proveedor = "Proveedor de ejemplo";

const productos = [
  {
    nombre: "Bandeja para torta con tapa",
    categoria: "Repostería",
    descripcion: "Base con relieve decorativo y tapa transparente con perilla tipo diamante. Ideal para tortas cuadradas.",
    material: "Acrílico", color: "Transparente",
    medidas: [30, 30, 15], costo: 55, venta: 95, stock: 8, minimo: 3, ubicacion: "Estante A1",
    foto: "bandeja.jpg",
  },
  {
    nombre: "Juego de fuentes octogonales (3 piezas)",
    categoria: "Servir y presentar",
    descripcion: "Incluye 3 fuentes octogonales: grande, mediana y pequeña. Se guardan una dentro de otra. Medidas de la fuente grande.",
    material: "Melamina", color: "Café oscuro",
    medidas: [45, 28, 7], costo: 130, venta: 220, stock: 4, minimo: 2, ubicacion: "Estante B2",
    foto: "fuentes.jpg",
  },
  {
    nombre: "Condimentero giratorio",
    categoria: "Organización",
    descripcion: "Soporte giratorio de dos caras con frascos de vidrio y tapa negra.",
    material: "Metal y vidrio", color: "Negro",
    medidas: [25, 15, 30], costo: 95, venta: 160, stock: 2, minimo: 3, ubicacion: "Estante A3",
    foto: "condimentero.PNG",
  },
  {
    nombre: "Cesta multiuso con tapa para alimentos",
    categoria: "Conservación",
    descripcion: "Cesta con ranuras para escurrir y tapa transparente. Ideal para frutas y verduras. Colores: verde, blanco y mostaza.",
    material: "Plástico", color: "Verde / Blanco / Mostaza",
    medidas: [20, 20, 9], costo: 18, venta: 35, stock: 24, minimo: 10, ubicacion: "Estante C1",
    foto: "cestas.PNG",
  },
  {
    nombre: "Mantequillera con tapa de vidrio",
    categoria: "Servir y presentar",
    descripcion: "Base de bambú y campana de vidrio con perilla.",
    material: "Vidrio y bambú", color: "Natural",
    medidas: [18, 11, 10], costo: 40, venta: 75, stock: 0, minimo: 2, ubicacion: "Estante B1",
    foto: "mantequillera.PNG",
  },
];

console.log("Procesando fotos…");
for (const p of productos) p.imagen = await procesarFoto(p.foto);

const id = (tabla, nombre) => db.prepare(`SELECT id FROM ${tabla} WHERE nombre = ?`).get(nombre).id;

db.transaction(() => {
  for (const n of categorias) db.prepare("INSERT INTO categorias (nombre) VALUES (?)").run(n);
  db.prepare("INSERT INTO proveedores (nombre, notas) VALUES (?, ?)").run(proveedor, "Proveedor creado para la demostración.");

  const insP = db.prepare(`INSERT INTO productos (codigo, nombre, descripcion, categoria_id, proveedor_id, unidad,
    largo, ancho, alto, unidad_medida, color, material, precio_costo, precio_venta, stock, stock_minimo, ubicacion, imagen)
    VALUES (?, ?, ?, ?, ?, 'unidad', ?, ?, ?, 'cm', ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insM = db.prepare(`INSERT INTO movimientos (producto_id, tipo, cantidad, stock_anterior, stock_resultante, nota)
    VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial')`);

  productos.forEach((p, i) => {
    const [l, a, h] = p.medidas;
    const r = insP.run(
      `P-${String(i + 1).padStart(5, "0")}`, p.nombre, p.descripcion, id("categorias", p.categoria), id("proveedores", proveedor),
      l, a, h, p.color, p.material, Math.round(p.costo * 100), Math.round(p.venta * 100), p.stock, p.minimo, p.ubicacion, p.imagen,
    );
    if (p.stock > 0) insM.run(r.lastInsertRowid, p.stock, p.stock);
  });
})();

console.log(`Listo: ${productos.length} artículos de cocina cargados en ${dbPath}`);
