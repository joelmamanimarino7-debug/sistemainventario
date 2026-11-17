// Llena una base de PRUEBA de la demo con datos realistas usando la aplicación de verdad
// (abre caja, vende, cierra con faltante, crea una vendedora) y toma capturas en tamaño celular.
//
//   node scripts/capturas.mjs http://localhost:3013
//
// La aplicación debe estar corriendo con INVENTARIO_DB apuntando a una COPIA de la demo, sin usuarios.
// Las capturas quedan en public/pantallas/ (1170×2532, celular a 3x).

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3013";
const SALIDA = path.join(import.meta.dirname, "..", "public", "pantallas");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// Usuarios de la base de prueba (solo existen en esa copia).
const ADMIN = { nombre: "Joel", usuario: "admin", clave: "demo-reel-2026" };
const VENDEDORA = { nombre: "Ana Quispe", usuario: "ana", clave: "demo-reel-ana" };

fs.mkdirSync(SALIDA, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--hide-scrollbars", "--lang=es-BO"],
});

async function nuevaPagina() {
  const ctx = await navegador.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  page.on("dialog", (d) => d.accept());
  page.setDefaultTimeout(90_000);
  return page;
}

async function ir(page, ruta) {
  await page.goto(BASE + ruta, { waitUntil: "networkidle0", timeout: 120_000 });
  // Oculta el indicador de Next.js (modo desarrollo) en las capturas.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

async function clicTexto(page, selector, texto) {
  await page.waitForFunction(
    (s, t) => [...document.querySelectorAll(s)].some((e) => e.textContent.trim().startsWith(t) && !e.disabled),
    {},
    selector,
    texto,
  );
  await page.evaluate(
    (s, t) => [...document.querySelectorAll(s)].find((e) => e.textContent.trim().startsWith(t) && !e.disabled).click(),
    selector,
    texto,
  );
}

async function escribir(page, selector, texto) {
  await page.waitForSelector(selector, { visible: true });
  // Enfocar y vaciar el campo directamente (más fiable que hacer clic en pantallas de celular).
  await page.$eval(selector, (el) => {
    el.scrollIntoView({ block: "center" });
    el.focus();
    el.select?.();
  });
  await page.keyboard.press("Backspace");
  await page.type(selector, texto);
}

async function captura(page, nombre, { alto, desplazar } = {}) {
  if (desplazar) {
    await page.evaluate((t) => {
      const el = [...document.querySelectorAll("h2, h1")].find((e) => e.textContent.includes(t));
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80);
    }, desplazar);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await esperar(500);
  const archivo = path.join(SALIDA, `${nombre}.png`);
  await page.screenshot({ path: archivo, ...(alto ? { clip: { x: 0, y: 0, width: 390, height: alto } } : {}) });
  console.log("  captura:", nombre);
}

async function vender(page, codigos, metodo, pagaCon) {
  await ir(page, "/ventas/nueva");
  for (const c of codigos) {
    await escribir(page, 'input[role="combobox"]', c);
    await page.keyboard.press("Enter");
    await esperar(900);
  }
  await clicTexto(page, "button", metodo);
  if (pagaCon) await escribir(page, "#pago_con", pagaCon);
  await clicTexto(page, "button", "Cobrar");
  await page.waitForFunction(() => document.body.innerText.includes("registrada por"));
}

// Si algo falla, guarda cómo se veía la pantalla para poder revisarlo.
process.on("unhandledRejection", async (e) => {
  console.error("Error:", e.message);
  for (const [i, p] of (await navegador.pages()).entries()) await p.screenshot({ path: path.join(SALIDA, `_error_${i}.png`) }).catch(() => {});
  await navegador.close();
  process.exit(1);
});

// ---------- Datos ----------
const admin = await nuevaPagina();
await ir(admin, "/configurar");
await escribir(admin, "#nombre", ADMIN.nombre);
await escribir(admin, "#usuario", ADMIN.usuario);
await escribir(admin, "#clave", ADMIN.clave);
await escribir(admin, "#clave2", ADMIN.clave);
await clicTexto(admin, "button", "Crear administrador");
await admin.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
console.log("Administrador de prueba creado");

// Turno de caja del día con ventas, una salida de efectivo y cierre con faltante.
await ir(admin, "/caja");
await escribir(admin, "#monto_inicial", "200");
await clicTexto(admin, "button", "Abrir caja");
await admin.waitForFunction(() => document.body.innerText.includes("Caja abierta"));
await vender(admin, ["P-00002", "P-00002"], "Transferencia QR");
await vender(admin, ["P-00004"], "Efectivo", "300");
await vender(admin, ["P-00001"], "Transferencia QR");
await vender(admin, ["P-00002", "P-00004"], "Efectivo", "600");
console.log("Ventas registradas");
await ir(admin, "/caja");
// Esperado: 200 inicial + 790 en ventas en efectivo = 990. Se cuentan 985 → "Faltan Bs 5,00".
await escribir(admin, 'input[aria-label="Efectivo contado"]', "985");
await escribir(admin, "#nota_cierre", "Conteo del día");
await clicTexto(admin, "button", "Cerrar caja");
await admin.waitForFunction(() => location.pathname.startsWith("/caja/"));
await esperar(1500);
const cierre = admin.url().replace(BASE, "").split("?")[0];
console.log("Caja cerrada:", cierre);

// Vendedora y caja abierta otra vez (para la pantalla de venta).
await ir(admin, "/usuarios/nuevo");
await escribir(admin, "#nombre", VENDEDORA.nombre);
await escribir(admin, "#usuario", VENDEDORA.usuario);
await escribir(admin, "#clave", VENDEDORA.clave);
await admin.click('input[name="rol"][value="vendedor"]');
await clicTexto(admin, "button", "Crear usuario");
await admin.waitForFunction(() => location.pathname === "/usuarios");
await ir(admin, "/caja");
await escribir(admin, "#monto_inicial", "200");
await clicTexto(admin, "button", "Abrir caja");
await admin.waitForFunction(() => document.body.innerText.includes("Caja abierta"));
await ir(admin, "/respaldos");
await clicTexto(admin, "button", "Respaldar ahora");
await admin.waitForFunction(() => document.body.innerText.includes("Respaldo creado"));
console.log("Datos listos. Tomando capturas…");

// ---------- Capturas (administrador) ----------
await ir(admin, "/");
await captura(admin, "inicio");
await captura(admin, "reabastecer", { desplazar: "Productos por reabastecer" });
await ir(admin, "/productos");
await captura(admin, "productos", { desplazar: "Productos" });
await ir(admin, "/ventas/nueva");
for (const c of ["P-00001", "P-00003"]) {
  await escribir(admin, 'input[role="combobox"]', c);
  await admin.keyboard.press("Enter");
  await esperar(900);
}
await captura(admin, "venta_carrito");
await clicTexto(admin, "button", "Transferencia QR");
await admin.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) => e.textContent.trim().startsWith("Cobrar"));
  b?.scrollIntoView({ block: "center" });
});
await esperar(500);
await admin.screenshot({ path: path.join(SALIDA, "venta_cobro.png") });
console.log("  captura: venta_cobro");
await ir(admin, cierre);
await captura(admin, "cierre_caja");
await ir(admin, "/reportes");
await captura(admin, "reportes");
await ir(admin, "/respaldos");
await captura(admin, "respaldos", { desplazar: "Respaldos guardados" });
await ir(admin, "/productos/1");
await captura(admin, "producto_admin");

// ---------- Capturas (vendedora: no ve costos ni ganancias) ----------
const ana = await nuevaPagina();
await ir(ana, "/login");
await escribir(ana, "#usuario", VENDEDORA.usuario);
await escribir(ana, "#clave", VENDEDORA.clave);
await clicTexto(ana, "button", "Entrar");
await ana.waitForFunction(() => location.pathname === "/");
await ir(ana, "/productos/1");
await captura(ana, "producto_vendedora");
await ir(ana, "/");
await captura(ana, "inicio_vendedora");

await navegador.close();
console.log("Listo:", SALIDA);
