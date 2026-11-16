# Sistema de Control de Inventario

Aplicación web para registrar productos, controlar el stock, registrar entradas de mercancía y vender.

**Tecnología:** Next.js 16 + React 19 + Tailwind CSS 4 + SQLite (archivo local, sin servidor de base de datos).

## Cómo usarlo

```bash
npm install        # solo la primera vez
npm run dev        # abre http://localhost:3000
```

Para usarlo en el negocio (más rápido que el modo desarrollo):

```bash
npm run build
npm start
```

Los datos se guardan en `data/inventario.db` y las fotos de los productos en `data/imagenes/`.
**Respalda la carpeta `data/` completa** (cópiala a otro lugar) con frecuencia.

### Datos de ejemplo

Carga 5 artículos de cocina con las fotos de la carpeta `images/` (precios y medidas inventados).
Para probar sin tocar tu base real:

```bash
INVENTARIO_DB=data/demo.db npm run seed
INVENTARIO_DB=data/demo.db npm run dev
```

## Configuración

En `lib/config.ts` puedes cambiar el nombre del negocio, la moneda (por defecto bolivianos: `Bs 1.234,50`),
el formato regional, las unidades de venta y los métodos de pago.

En los campos de precio se puede escribir con coma o con punto decimal (`12,50` o `12.50`).

## Fotos de productos

- Se suben desde el formulario del producto (también arrastrando la imagen).
- Al subirlas se recortan automáticamente las franjas negras (capturas de pantalla del celular),
  se corrige la orientación y se reducen de tamaño (de ~3 MB a ~100 KB).
- Al cambiar o quitar una foto, la anterior se borra del disco.

## Fase 2: control y análisis

- **Ajustes de inventario** (menú *Ajustes*, o «± Ajustar stock» en cada producto): corrigen el stock cuando no
  coincide con lo que hay de verdad. Se puede escribir el stock real contado o sumar/restar (ej. `-2` si se rompieron 2).
  Cada ajuste guarda el motivo y su valor a costo (las pérdidas aparecen en Reportes).
- **Devoluciones** (botón «↩ Registrar devolución» en el detalle de una venta): parciales o totales. Lo devuelto
  descuenta el descuento de la venta en proporción. Si el producto vuelve en buen estado, se suma al stock; si está
  dañado, no.
- **Anular venta**: solo para ventas registradas por error y sin devoluciones. Todo vuelve al stock y la venta deja de
  contar en los totales.
- **Reportes** (menú *Análisis*): ventas netas, ganancia, margen, devoluciones, pérdidas por ajustes, ventas por día,
  por método de pago, por categoría y por producto, productos sin ventas y valor del inventario. Se exporta a Excel.
- **Excel** (menú *Importar / exportar*): descarga productos, ventas, movimientos y reportes. Importa productos con
  vista previa: crea los nuevos y actualiza los existentes (por código). La plantilla trae instrucciones. Opcionalmente
  ajusta el stock al valor del archivo (útil tras un conteo físico).

Las ventas netas del Inicio y de Reportes ya descuentan devoluciones y no cuentan ventas anuladas.

## Estructura

```
app/                 Pantallas (cada carpeta es una ruta)
  actions/           Operaciones que modifican datos (crear, vender, etc.)
  api/               Buscador de productos, fotos y descargas de Excel (api/exportar/…)
components/          Piezas de interfaz reutilizables
lib/
  schema.sql         Estructura de la base de datos
  db.ts              Conexión, migraciones y registrarMovimiento(): único lugar que cambia el stock
  ajustes.ts         Lógica de ajustes de inventario (la usan la pantalla y la importación)
  excel.ts           Herramientas para generar y leer .xlsx
  productosExcel.ts  Columnas, lectura, revisión e importación de productos
  exportaciones.ts   Libros de Excel de ventas, movimientos y reportes
  imagenes.ts        Procesamiento y guardado de fotos
  data/              Consultas de lectura
scripts/seed.mjs     Datos de ejemplo
```

## Reglas del sistema

- **El stock nunca se edita a mano.** Solo cambia con entradas, ventas, ajustes y devoluciones.
  Cada cambio queda en *Movimientos* con stock anterior y resultante.
- **Eliminar = desactivar.** Los productos eliminados se ocultan pero conservan su historial y se pueden reactivar.
  Categorías, marcas y proveedores solo se borran de verdad si nadie los usa.
- **Precio y costo se congelan en cada venta**, así la ganancia histórica no cambia si después modificas precios.
- Una venta no se registra si algún producto no tiene stock suficiente.
- Los importes se guardan en centavos para evitar errores de redondeo.

## Fases

- [x] **Fase 1:** productos, catálogos, entradas, ventas, movimientos, alertas de stock bajo.
- [x] **Fase 2:** reportes, devoluciones, ajustes de inventario, importar/exportar Excel.
- [ ] **Fase 3:** usuarios y roles, códigos de barras, ticket de venta. (Las fotos ya se adelantaron.)
