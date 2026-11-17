import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.INVENTARIO_DB ?? path.join(DATA_DIR, "inventario.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

/** Carpeta de las fotos de productos: siempre junto a la base de datos, para respaldarlas juntas. */
export const DIR_IMAGENES = path.join(path.dirname(DB_PATH), "imagenes");

function abrir(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
  // Ajuste de datos: la unidad "pieza" pasó a llamarse "unidad".
  db.prepare("UPDATE productos SET unidad = 'unidad' WHERE unidad = 'pieza'").run();
  migrar(db);
  return db;
}

/** Agrega a bases creadas en la fase 1 las columnas nuevas (CREATE TABLE IF NOT EXISTS no las agrega). */
function migrar(db: Database.Database) {
  const columnas = (db.prepare("PRAGMA table_info(movimientos)").all() as { name: string }[]).map((c) => c.name);
  if (!columnas.includes("ajuste_id")) db.exec("ALTER TABLE movimientos ADD COLUMN ajuste_id INTEGER REFERENCES ajustes(id)");
  if (!columnas.includes("devolucion_id"))
    db.exec("ALTER TABLE movimientos ADD COLUMN devolucion_id INTEGER REFERENCES devoluciones(id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_movimientos_venta ON movimientos(venta_id)");

  // Fase 3: quién registró cada operación.
  for (const tabla of ["ventas", "entradas", "ajustes", "devoluciones"]) {
    const cols = (db.prepare(`PRAGMA table_info(${tabla})`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes("usuario_id")) db.exec(`ALTER TABLE ${tabla} ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)`);
  }
}

// En desarrollo Next recarga módulos; guardamos la conexión en globalThis
// para no abrir una nueva en cada recarga.
const g = globalThis as unknown as { __inventarioDb?: Database.Database };
export const db = g.__inventarioDb ?? (g.__inventarioDb = abrir());

/** Redondea cantidades a 3 decimales para evitar basura de punto flotante (ej. 0.1 + 0.2). */
export function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export type TipoMovimiento = "entrada" | "venta" | "ajuste" | "devolucion";

/**
 * Único punto del sistema que cambia el stock.
 * Debe llamarse dentro de una transacción (db.transaction).
 */
export function registrarMovimiento(params: {
  productoId: number;
  tipo: TipoMovimiento;
  cantidad: number; // positivo suma, negativo resta
  ventaId?: number | null;
  entradaId?: number | null;
  ajusteId?: number | null;
  devolucionId?: number | null;
  nota?: string | null;
  /** Nombre de quien hizo la operación (queda en el historial). */
  usuario?: string | null;
}) {
  const prod = db
    .prepare("SELECT id, nombre, stock FROM productos WHERE id = ?")
    .get(params.productoId) as { id: number; nombre: string; stock: number } | undefined;
  if (!prod) throw new ErrorNegocio(`El producto #${params.productoId} no existe.`);

  const anterior = prod.stock;
  const resultante = redondear(anterior + params.cantidad);
  if (resultante < 0) {
    throw new ErrorNegocio(
      `Stock insuficiente para "${prod.nombre}": hay ${anterior} y se intentan sacar ${Math.abs(params.cantidad)}.`,
    );
  }

  db.prepare(
    "UPDATE productos SET stock = ?, actualizado_en = datetime('now','localtime') WHERE id = ?",
  ).run(resultante, prod.id);

  db.prepare(
    `INSERT INTO movimientos (producto_id, tipo, cantidad, stock_anterior, stock_resultante,
       venta_id, entrada_id, ajuste_id, devolucion_id, nota, usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    prod.id,
    params.tipo,
    redondear(params.cantidad),
    anterior,
    resultante,
    params.ventaId ?? null,
    params.entradaId ?? null,
    params.ajusteId ?? null,
    params.devolucionId ?? null,
    params.nota ?? null,
    params.usuario ?? null,
  );
  return { anterior, resultante };
}

/** Error con mensaje pensado para mostrarse al usuario. */
export class ErrorNegocio extends Error {}
