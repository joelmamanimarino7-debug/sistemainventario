-- Esquema del Sistema de Control de Inventario
-- Reglas generales:
--   * Los importes de dinero se guardan en CENTAVOS (enteros) para evitar errores de redondeo.
--   * Las fechas se guardan en hora local con formato 'YYYY-MM-DD HH:MM:SS'.
--   * Nada se borra de verdad si tiene historial: se marca activo = 0.
--   * El stock de un producto NUNCA se edita a mano: solo cambia a través de un movimiento.

CREATE TABLE IF NOT EXISTS categorias (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS marcas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS proveedores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  contacto   TEXT,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT,
  notas      TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  creado_en  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS productos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT    NOT NULL UNIQUE COLLATE NOCASE,  -- SKU interno
  codigo_barras   TEXT    UNIQUE,
  nombre          TEXT    NOT NULL,
  descripcion     TEXT,
  marca_id        INTEGER REFERENCES marcas(id),
  modelo          TEXT,
  categoria_id    INTEGER REFERENCES categorias(id),
  proveedor_id    INTEGER REFERENCES proveedores(id),
  unidad          TEXT    NOT NULL DEFAULT 'unidad',       -- unidad, caja, metro, kilo...
  largo           REAL,
  ancho           REAL,
  alto            REAL,
  unidad_medida   TEXT    NOT NULL DEFAULT 'cm',           -- cm, mm, m, pulg
  color           TEXT,
  material        TEXT,
  peso            REAL,                                    -- en kg
  precio_costo    INTEGER NOT NULL DEFAULT 0,              -- centavos
  precio_venta    INTEGER NOT NULL DEFAULT 0,              -- centavos
  stock           REAL    NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo    REAL    NOT NULL DEFAULT 0,
  ubicacion       TEXT,
  imagen          TEXT,                                    -- reservado para la fase 3
  activo          INTEGER NOT NULL DEFAULT 1,
  creado_en       TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
  actualizado_en  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_productos_nombre    ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca     ON productos(marca_id);

-- Venta: encabezado
CREATE TABLE IF NOT EXISTS ventas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente      TEXT,
  metodo_pago  TEXT    NOT NULL DEFAULT 'efectivo'
               CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro')),
  subtotal     INTEGER NOT NULL,          -- centavos
  descuento    INTEGER NOT NULL DEFAULT 0, -- centavos
  total        INTEGER NOT NULL,          -- centavos
  pago_con     INTEGER,                   -- centavos (efectivo recibido, opcional)
  nota         TEXT,
  estado       TEXT    NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'cancelada')),
  creado_en    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Venta: renglones (precio y costo se congelan al momento de vender)
CREATE TABLE IF NOT EXISTS venta_detalle (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id         INTEGER NOT NULL REFERENCES ventas(id),
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  cantidad         REAL    NOT NULL CHECK (cantidad > 0),
  precio_unitario  INTEGER NOT NULL,
  costo_unitario   INTEGER NOT NULL,
  subtotal         INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_detalle_venta ON venta_detalle(venta_id);

-- Entrada de mercancía (compra / reabastecimiento): encabezado
CREATE TABLE IF NOT EXISTS entradas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  proveedor_id  INTEGER REFERENCES proveedores(id),
  referencia    TEXT,                   -- número de factura o remisión
  total         INTEGER NOT NULL DEFAULT 0, -- centavos
  nota          TEXT,
  creado_en     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS entrada_detalle (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entrada_id      INTEGER NOT NULL REFERENCES entradas(id),
  producto_id     INTEGER NOT NULL REFERENCES productos(id),
  cantidad        REAL    NOT NULL CHECK (cantidad > 0),
  costo_unitario  INTEGER NOT NULL,
  subtotal        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entrada_detalle_entrada ON entrada_detalle(entrada_id);

-- Historial: cada cambio de stock queda registrado aquí
CREATE TABLE IF NOT EXISTS movimientos (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id      INTEGER NOT NULL REFERENCES productos(id),
  tipo             TEXT    NOT NULL CHECK (tipo IN ('entrada', 'venta', 'ajuste', 'devolucion')),
  cantidad         REAL    NOT NULL,   -- positivo suma al stock, negativo resta
  stock_anterior   REAL    NOT NULL,
  stock_resultante REAL    NOT NULL,
  venta_id         INTEGER REFERENCES ventas(id),
  entrada_id       INTEGER REFERENCES entradas(id),
  nota             TEXT,
  usuario          TEXT,               -- se llenará cuando existan usuarios (fase 3)
  creado_en        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha    ON movimientos(creado_en);
