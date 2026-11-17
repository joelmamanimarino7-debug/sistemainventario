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
El sistema hace **respaldos automáticos** (ver *Respaldos* más abajo); elige en esa pantalla una carpeta de
iCloud Drive, Google Drive o un USB para que no queden solo en esta computadora.

### Desde el celular (y escanear con la cámara)

```bash
npm run movil              # en lugar de npm run dev
npm run movil:produccion   # versión optimizada (antes: npm run build)
```

En la computadora se sigue entrando por http://localhost:3000. Al arrancar, la terminal muestra la dirección
para los celulares conectados al **mismo wifi**, por ejemplo `https://192.168.1.3:3443`.

- La primera vez, el navegador del celular avisa que la conexión no es privada, porque el certificado lo
  generó esta computadora (carpeta `certificados/`, no se sube a git). Acepta y continúa: en Safari,
  «Mostrar detalles → visitar este sitio web»; en Chrome, «Configuración avanzada → Continuar».
- Para quitar el aviso del todo, abre en el celular `https://<dirección>:3443/certificado-inventario.crt`,
  instálalo y márcalo como de confianza (iPhone: *Ajustes → General → Información → Ajustes de confianza de
  certificados*).
- Si la dirección de la computadora cambia (otro wifi), el sistema sigue funcionando con el aviso. Para un
  certificado nuevo, borra la carpeta `certificados/` y vuelve a arrancar.
- **Escanear:** en Nueva venta (y en Entradas, Ajustes y Etiquetas) toca el botón de la cámara junto al
  buscador, apunta al código y el producto se agrega solo. Puedes escanear varios seguidos; toca «Listo» al
  terminar. Funciona con códigos de fábrica (EAN, UPC, Code 128…) y con las etiquetas del sistema.

### Datos de ejemplo

Carga 5 artículos de cocina con las fotos de la carpeta `images/` (precios y medidas inventados).
Para probar sin tocar tu base real:

```bash
INVENTARIO_DB=data/demo.db npm run seed
INVENTARIO_DB=data/demo.db npm run dev
```

## Configuración

El nombre del negocio, la dirección, el teléfono, el NIT y el mensaje del ticket se cambian desde
**Configuración** (menú *Administración*). En `lib/config.ts` se cambian la moneda (por defecto bolivianos:
`Bs 1.234,50`), el formato regional, las unidades de venta y los métodos de pago.

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

## Fase 3: usuarios, códigos de barras y ticket

- **Usuarios** (menú *Administración → Usuarios*). La primera vez que se abre el sistema pide crear el usuario
  administrador. Hay dos roles:
  - **Administrador:** todo.
  - **Vendedor:** vende (sin poder cambiar precios), registra devoluciones, consulta productos y movimientos e
    imprime etiquetas. No ve costos ni ganancias, ni entra a entradas, ajustes, reportes, catálogos, Excel,
    usuarios o configuración.

  Cada venta, entrada, ajuste, devolución y movimiento guarda quién lo hizo. Reportes muestra ventas por vendedor.
  Cada usuario cambia su contraseña en *Mi cuenta*; si alguien la olvida, un administrador le pone una nueva.
  Las contraseñas se guardan cifradas (scrypt) y la sesión dura 30 días.
- **Etiquetas con código de barras** (menú *Etiquetas*, o botón «▥ Etiquetas» en cada producto y en cada
  entrada): hojas adhesivas A4 o carta en 4 formatos, con nombre, precio y código Code 128. Si el producto no
  tiene código de fábrica se usa su código interno (P-00001), que el buscador de ventas reconoce con el lector.
  Se pueden saltar etiquetas ya usadas de una hoja.
- **Escáner con la cámara** del celular o la computadora (botón junto al buscador de productos). En Android usa
  el lector del navegador; en iPhone, la librería ZXing. Requiere entrar por HTTPS (`npm run movil`).
- **Ticket de venta** para impresora térmica de 80 mm: botón «🖨 Imprimir ticket» en la venta, o marca
  «Imprimir el ticket al cobrar» en Nueva venta (se recuerda en ese equipo). En la ventana de impresión elige la
  impresora de tickets y márgenes «Ninguno».

## Caja

Menú *Operación → Caja*. Hay una sola caja para todo el negocio y **no se puede vender ni registrar devoluciones
con la caja cerrada** (Nueva venta ofrece abrirla ahí mismo).

- **Abrir:** con el efectivo inicial (el cambio del día). Puede hacerlo un vendedor o un administrador.
- **Durante el turno:** ventas por método de pago, lo cobrado por QR (para revisarlo en la app del banco),
  devoluciones y **entradas o salidas de efectivo** que no son ventas (pago de pasaje, pago a un proveedor, retiro
  del dueño, más cambio…), cada una con su motivo y quién la registró.
- **Cerrar:** se cuenta el efectivo, escribiendo el total o **por billetes y monedas** (Bs 200 a 0,10). El sistema
  compara con lo que debería haber (inicial + ventas en efectivo − devoluciones en efectivo + entradas − salidas) y
  muestra si cuadra, sobra o falta. El vendedor cuenta **a ciegas**: no ve lo esperado antes de cerrar.
- El cierre queda guardado (no cambia aunque después se anule una venta), se puede imprimir y aparece en el
  **Historial de cierres** (solo administradores), con faltantes y sobrantes por turno.
- Las devoluciones salen de la caja abierta en ese momento, aunque la venta sea de otro día, con el mismo método de
  pago de la venta.

## Respaldos

Menú *Administración → Respaldos* (solo administradores). Cada respaldo es un archivo `.zip` con la base de datos
(copia segura aunque el sistema esté en uso) y las fotos.

- **Automáticos:** uno al día (mientras el sistema esté encendido revisa cada 30 minutos; si la computadora estuvo
  apagada, lo hace al encenderla) y otro **cada vez que se cierra la caja**.
- **Carpeta:** por defecto `data/respaldos/` (la demo usa `data/respaldos-demo/`). La pantalla sugiere iCloud Drive,
  Google Drive, OneDrive, Dropbox o un disco USB si los encuentra, y avisa cuando los respaldos están en la misma
  computadora. Se conservan los últimos 30 (configurable) y los más antiguos se borran solos.
- **Descargar** cualquier respaldo, o **Respaldar ahora**.
- **Restaurar** uno de la lista o un `.zip` subido (por ejemplo, para pasar los datos a otra computadora). Antes se
  guarda automáticamente un respaldo «Antes de restaurar», así que se puede deshacer. Todo se copia de una vez (si
  algo falla, no cambia nada), los respaldos de versiones anteriores se actualizan solos, y después todos vuelven a
  iniciar sesión con los usuarios del respaldo. Los ajustes de respaldo de la computadora se conservan.
- Los respaldos contienen los datos del negocio: `data/respaldos*/` no se sube a git.

## Estructura

```
app/                 Pantallas (cada carpeta es una ruta)
  (app)/             Pantallas con menú; cada página revisa la sesión y el rol
  login/, configurar/  Iniciar sesión y primer uso (sin menú)
  ticket/            Ticket de venta para imprimir
  actions/           Operaciones que modifican datos (crear, vender, etc.)
  api/               Buscador de productos, fotos y descargas de Excel (api/exportar/…)
components/          Piezas de interfaz reutilizables
lib/
  schema.sql         Estructura de la base de datos
  auth.ts            Usuarios, contraseñas, sesiones y permisos (exigirUsuario / exigirAdmin)
  negocio.ts         Datos del negocio editables desde Configuración
  code128.ts         Generador de códigos de barras Code 128 (sin librerías)
  etiquetas.ts       Formatos de hojas de etiquetas
  db.ts              Conexión, migraciones y registrarMovimiento(): único lugar que cambia el stock
  ajustes.ts         Lógica de ajustes de inventario (la usan la pantalla y la importación)
  excel.ts           Herramientas para generar y leer .xlsx
  productosExcel.ts  Columnas, lectura, revisión e importación de productos
  exportaciones.ts   Libros de Excel de ventas, movimientos y reportes
  imagenes.ts        Procesamiento y guardado de fotos
  caja.ts            Turnos de caja: totales por método, efectivo esperado, historial
  respaldos.ts       Crear, listar, podar y restaurar respaldos (.zip)
  respaldosAuto.ts   Respaldo automático diario (lo arranca instrumentation.ts al iniciar el servidor)
  data/              Consultas de lectura
scripts/seed.mjs     Datos de ejemplo
scripts/movil.mjs    HTTPS para celulares de la red local (npm run movil)
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
- [x] **Fase 3:** usuarios y roles, códigos de barras, ticket de venta. (Las fotos ya se adelantaron.)
