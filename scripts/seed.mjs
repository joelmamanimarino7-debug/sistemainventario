// Carga datos de ejemplo (una tienda de tecnología) para probar el sistema.
// Uso:  INVENTARIO_DB=data/demo.db npm run seed    → recomendado: base separada para pruebas
//       npm run seed                               → usa data/inventario.db
// Solo inserta datos si la base no tiene productos. Las fotos se toman de la carpeta images/.
// Los precios y el stock son inventados, solo para la demostración.

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

const categorias = ["Cámaras", "Audio", "Accesorios", "Seguridad"];
const marcas = ["GoPro", "UGREEN", "Sony", "Insta360"];
const proveedor = "Importadora de ejemplo";

// Fotos de Pexels (licencia libre, uso comercial permitido). Precios y stock inventados.
const productos = [
  {
    nombre: "Cámara de acción",
    categoria: "Cámaras", marca: "GoPro", modelo: null,
    descripcion: "Cámara de acción compacta con pantalla. Ideal para deportes, viajes y contenido para redes.",
    color: "Negro",
    costo: 2400, venta: 3200, stock: 4, minimo: 2, ubicacion: "Vitrina 1",
    foto: "pexels-amar-8799699.jpg",
  },
  {
    nombre: "Cargador rápido USB-C",
    categoria: "Accesorios", marca: "UGREEN", modelo: "Nexode",
    descripcion: "Cargador de pared compacto para celular, tablet y laptop.",
    color: "Gris",
    costo: 180, venta: 290, stock: 15, minimo: 5, ubicacion: "Estante A2",
    foto: "pexels-mintworkspace-19983031.jpg",
  },
  {
    nombre: "Parlante Bluetooth portátil",
    categoria: "Audio", marca: "Sony", modelo: null,
    descripcion: "Parlante inalámbrico pequeño, con correa para llevar.",
    color: "Rojo",
    costo: 320, venta: 480, stock: 2, minimo: 3, ubicacion: "Estante B1",
    foto: "pexels-olenkabohovyk-12021852.jpg",
  },
  {
    nombre: "Cámara de seguridad Wi-Fi",
    categoria: "Seguridad", marca: null, modelo: null,
    descripcion: "Cámara para interiores con base magnética. Se ve desde el celular.",
    color: "Blanco",
    costo: 150, venta: 250, stock: 10, minimo: 4, ubicacion: "Estante C3",
    foto: "pexels-ron-lach-9795001.jpg",
  },
  {
    nombre: "Cámara de mano con estabilizador 8K",
    categoria: "Cámaras", marca: "Insta360", modelo: "Luna Ultra",
    descripcion: "Cámara con estabilizador (gimbal) y doble lente.",
    color: "Negro",
    costo: 3900, venta: 5200, stock: 0, minimo: 1, ubicacion: "Vitrina 2",
    foto: "pexels-sinan-kriya-2162662325-39629710.jpg",
  },
];

console.log("Procesando fotos…");
for (const p of productos) p.imagen = await procesarFoto(p.foto);

const id = (tabla, nombre) => db.prepare(`SELECT id FROM ${tabla} WHERE nombre = ?`).get(nombre).id;

db.transaction(() => {
  for (const n of categorias) db.prepare("INSERT INTO categorias (nombre) VALUES (?)").run(n);
  for (const n of marcas) db.prepare("INSERT INTO marcas (nombre) VALUES (?)").run(n);
  db.prepare("INSERT INTO proveedores (nombre, notas) VALUES (?, ?)").run(proveedor, "Proveedor creado para la demostración.");

  const insP = db.prepare(`INSERT INTO productos (codigo, nombre, descripcion, categoria_id, marca_id, modelo, proveedor_id,
    unidad, color, precio_costo, precio_venta, stock, stock_minimo, ubicacion, imagen)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unidad', ?, ?, ?, ?, ?, ?, ?)`);
  const insM = db.prepare(`INSERT INTO movimientos (producto_id, tipo, cantidad, stock_anterior, stock_resultante, nota)
    VALUES (?, 'entrada', ?, 0, ?, 'Stock inicial')`);

  productos.forEach((p, i) => {
    const r = insP.run(
      `P-${String(i + 1).padStart(5, "0")}`, p.nombre, p.descripcion, id("categorias", p.categoria),
      p.marca ? id("marcas", p.marca) : null, p.modelo, id("proveedores", proveedor),
      p.color, Math.round(p.costo * 100), Math.round(p.venta * 100), p.stock, p.minimo, p.ubicacion, p.imagen,
    );
    if (p.stock > 0) insM.run(r.lastInsertRowid, p.stock, p.stock);
  });
})();

console.log(`Listo: ${productos.length} productos de tecnología cargados en ${dbPath}`);
