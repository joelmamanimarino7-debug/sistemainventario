import "server-only";
import Database from "better-sqlite3";
import { strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { db, DIR_IMAGENES, ErrorNegocio, prepararEsquema, RUTA_DB } from "./db";

// Respaldos: un solo archivo .zip con la base de datos (copia segura aunque el sistema esté en uso)
// y las fotos de los productos. Se crean a diario, al cerrar la caja y cuando se pide desde la pantalla.

export type TipoRespaldo = "auto" | "manual" | "cierre" | "previo";
export const TIPOS_RESPALDO: Record<TipoRespaldo, string> = {
  auto: "Automático",
  manual: "Manual",
  cierre: "Cierre de caja",
  previo: "Antes de restaurar",
};

export type InfoRespaldo = { archivo: string; fecha: string; tipo: TipoRespaldo; bytes: number };
export type AjustesRespaldo = { carpeta: string; conservar: number; automatico: boolean; porDefecto: boolean };

const NOMBRE = /^inventario_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})_(auto|manual|cierre|previo)\.zip$/;
const IMAGEN = /^[a-f0-9-]{36}(-mini)?\.webp$/;
const CLAVE = {
  carpeta: "respaldo_carpeta",
  conservar: "respaldo_conservar",
  automatico: "respaldo_automatico",
  ultimo: "respaldo_ultimo",
  error: "respaldo_ultimo_error",
};
const CONSERVAR_POR_DEFECTO = 30;

// ---------- Ajustes ----------

function leer(clave: string): string | null {
  const f = db.prepare("SELECT valor FROM configuracion WHERE clave = ?").get(clave) as { valor: string | null } | undefined;
  return f?.valor ?? null;
}

function escribir(clave: string, valor: string) {
  db.prepare(
    "INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
  ).run(clave, valor);
}

/** Junto a la base: data/respaldos para inventario.db; data/respaldos-demo para demo.db (no se mezclan). */
export function carpetaPorDefecto() {
  const base = path.basename(RUTA_DB, path.extname(RUTA_DB));
  return path.join(path.dirname(path.resolve(RUTA_DB)), base === "inventario" ? "respaldos" : `respaldos-${base}`);
}

export function ajustesRespaldo(): AjustesRespaldo {
  const carpeta = leer(CLAVE.carpeta)?.trim();
  const conservar = Number(leer(CLAVE.conservar));
  return {
    carpeta: carpeta || carpetaPorDefecto(),
    porDefecto: !carpeta,
    conservar: Number.isInteger(conservar) && conservar >= 3 ? conservar : CONSERVAR_POR_DEFECTO,
    automatico: leer(CLAVE.automatico) !== "0",
  };
}

/** "~/Documentos/x" → ruta absoluta. */
function expandir(ruta: string) {
  const r = ruta.trim();
  return r === "~" || r.startsWith("~/") ? path.join(os.homedir(), r.slice(1)) : r;
}

/** Revisa que se pueda escribir en la carpeta (la crea si no existe). Devuelve el problema o null. */
export function problemaCarpeta(carpeta: string): string | null {
  if (!path.isAbsolute(carpeta)) return "Escribe la ruta completa de la carpeta (empieza con / o con ~/).";
  try {
    fs.mkdirSync(carpeta, { recursive: true });
    const prueba = path.join(carpeta, `.prueba-${process.pid}-${Date.now()}`);
    fs.writeFileSync(prueba, "ok");
    fs.rmSync(prueba);
    return null;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") return "El sistema no tiene permiso para escribir en esa carpeta.";
    if (code === "ENOENT") return "Esa ubicación no existe (¿está conectado el USB?).";
    return `No se puede usar esa carpeta: ${(e as Error).message}`;
  }
}

export function guardarAjustesRespaldo(a: { carpeta: string; conservar: number; automatico: boolean }) {
  const carpeta = expandir(a.carpeta);
  // Una ruta relativa se interpretaría desde la carpeta del programa: se exige la ruta completa.
  if (carpeta && !path.isAbsolute(carpeta)) throw new ErrorNegocio("Escribe la ruta completa de la carpeta (empieza con / o con ~/).");
  const usarDefecto = !carpeta || path.resolve(carpeta) === carpetaPorDefecto();
  const problema = problemaCarpeta(usarDefecto ? carpetaPorDefecto() : path.resolve(carpeta));
  if (problema) throw new ErrorNegocio(problema);
  if (!Number.isInteger(a.conservar) || a.conservar < 3 || a.conservar > 365)
    throw new ErrorNegocio("Conserva entre 3 y 365 respaldos.");
  db.transaction(() => {
    escribir(CLAVE.carpeta, usarDefecto ? "" : path.resolve(carpeta));
    escribir(CLAVE.conservar, String(a.conservar));
    escribir(CLAVE.automatico, a.automatico ? "1" : "0");
  })();
}

/** Lugares donde conviene guardar respaldos, si existen en esta computadora. */
export function ubicacionesSugeridas(): { nombre: string; ruta: string; detalle: string }[] {
  const casa = os.homedir();
  const sub = "Respaldos Inventario";
  const res: { nombre: string; ruta: string; detalle: string }[] = [];
  const existe = (p: string) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  };

  const icloud = path.join(casa, "Library", "Mobile Documents", "com~apple~CloudDocs");
  if (existe(icloud)) res.push({ nombre: "iCloud Drive", ruta: path.join(icloud, sub), detalle: "Se sube a la nube de Apple" });

  const nube = path.join(casa, "Library", "CloudStorage");
  if (existe(nube)) {
    for (const d of fs.readdirSync(nube)) {
      const base = path.join(nube, d);
      if (d.startsWith("GoogleDrive-")) {
        const unidad = ["Mi unidad", "My Drive"].map((u) => path.join(base, u)).find(existe);
        if (unidad) res.push({ nombre: "Google Drive", ruta: path.join(unidad, sub), detalle: d.replace("GoogleDrive-", "") });
      } else if (d.startsWith("OneDrive")) {
        res.push({ nombre: "OneDrive", ruta: path.join(base, sub), detalle: "Se sube a la nube de Microsoft" });
      } else if (d.startsWith("Dropbox")) {
        res.push({ nombre: "Dropbox", ruta: path.join(base, sub), detalle: "Se sube a Dropbox" });
      }
    }
  }
  if (existe(path.join(casa, "Dropbox")) && !res.some((r) => r.nombre === "Dropbox"))
    res.push({ nombre: "Dropbox", ruta: path.join(casa, "Dropbox", sub), detalle: "Se sube a Dropbox" });

  // Discos externos y memorias USB (en Mac aparecen en /Volumes). Se omiten el disco del sistema,
  // los volúmenes internos de macOS (Recovery, Preboot…) y los que no permiten escribir.
  if (process.platform === "darwin" && existe("/Volumes")) {
    for (const v of fs.readdirSync("/Volumes")) {
      if (v.startsWith(".") || /^(Recovery|Preboot|VM|Update|xarts|iSCPreboot|Hardware)$/i.test(v)) continue;
      const ruta = path.join("/Volumes", v);
      try {
        if (fs.realpathSync(ruta) === "/" || !existe(ruta)) continue;
        fs.accessSync(ruta, fs.constants.W_OK);
      } catch {
        continue;
      }
      res.push({ nombre: `Disco externo «${v}»`, ruta: path.join(ruta, sub), detalle: "USB o disco conectado" });
    }
  }
  return res;
}

/** ¿La carpeta está en el mismo disco de la computadora (sin nube ni disco externo)? */
export function esCarpetaLocal(carpeta: string) {
  return !/\/Volumes\/|com~apple~CloudDocs|\/CloudStorage\/|\/Dropbox(\/|$)/.test(carpeta);
}

// ---------- Listado ----------

export function listarRespaldos(): InfoRespaldo[] {
  const { carpeta } = ajustesRespaldo();
  let nombres: string[];
  try {
    nombres = fs.readdirSync(/* turbopackIgnore: true */ carpeta); // carpeta elegida por el usuario
  } catch {
    return [];
  }
  const lista: InfoRespaldo[] = [];
  for (const archivo of nombres) {
    const m = NOMBRE.exec(archivo);
    if (!m) continue;
    try {
      const bytes = fs.statSync(path.join(carpeta, archivo)).size;
      lista.push({ archivo, fecha: `${m[1]} ${m[2]}:${m[3]}:${m[4]}`, tipo: m[5] as TipoRespaldo, bytes });
    } catch {
      /* se borró mientras leíamos */
    }
  }
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function estadoRespaldos(): { ultimo: string | null; error: string | null } {
  return { ultimo: leer(CLAVE.ultimo) || null, error: leer(CLAVE.error) || null };
}

/** Ruta completa de un respaldo de la carpeta, o null si el nombre no es válido. */
export function rutaRespaldo(archivo: string): string | null {
  if (!NOMBRE.test(archivo)) return null;
  const ruta = path.join(ajustesRespaldo().carpeta, archivo);
  return fs.existsSync(ruta) ? ruta : null;
}

// ---------- Crear ----------

function ahoraLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const g = globalThis as unknown as { __respaldoEnCurso?: Promise<InfoRespaldo> };

/** Crea un respaldo. Si ya hay uno en curso, espera a que termine y crea el siguiente. */
export async function crearRespaldo(tipo: TipoRespaldo): Promise<InfoRespaldo> {
  const previo = g.__respaldoEnCurso;
  const tarea = (async () => {
    if (previo) await previo.catch(() => undefined);
    return hacerRespaldo(tipo);
  })();
  g.__respaldoEnCurso = tarea;
  try {
    return await tarea;
  } finally {
    if (g.__respaldoEnCurso === tarea) g.__respaldoEnCurso = undefined;
  }
}

async function hacerRespaldo(tipo: TipoRespaldo): Promise<InfoRespaldo> {
  const { carpeta, conservar } = ajustesRespaldo();
  let ahora = ahoraLocal();
  let archivo = `inventario_${ahora.replace(" ", "_").replace(/:/g, "-")}_${tipo}.zip`;
  // Dos respaldos en el mismo segundo: esperamos al siguiente para no pisar el archivo.
  while (fs.existsSync(path.join(carpeta, archivo))) {
    await new Promise((r) => setTimeout(r, 1000));
    ahora = ahoraLocal();
    archivo = `inventario_${ahora.replace(" ", "_").replace(/:/g, "-")}_${tipo}.zip`;
  }
  const temporal = await fsp.mkdtemp(path.join(os.tmpdir(), "inventario-respaldo-"));
  try {
    const problema = problemaCarpeta(carpeta);
    if (problema) throw new ErrorNegocio(`Carpeta de respaldos: ${problema}`);

    // Copia consistente de la base aunque haya ventas en curso (API de respaldo de SQLite).
    const copia = path.join(temporal, "inventario.db");
    await db.backup(copia);

    const contenido: Zippable = {
      "inventario.db": [new Uint8Array(await fsp.readFile(copia)), { level: 6 }],
    };
    let imagenes = 0;
    if (fs.existsSync(DIR_IMAGENES)) {
      for (const f of await fsp.readdir(DIR_IMAGENES)) {
        if (!IMAGEN.test(f)) continue;
        // Las fotos ya están comprimidas (WebP): se guardan sin volver a comprimir.
        contenido[`imagenes/${f}`] = [new Uint8Array(await fsp.readFile(path.join(DIR_IMAGENES, f))), { level: 0 }];
        imagenes++;
      }
    }
    const cuenta = (t: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as { n: number }).n;
    contenido["respaldo.json"] = strToU8(
      JSON.stringify(
        { sistema: "inventario", version: 1, fecha: ahora, tipo, productos: cuenta("productos"), ventas: cuenta("ventas"), imagenes },
        null,
        2,
      ),
    );

    const zip = zipSync(contenido);
    const destino = path.join(carpeta, archivo);
    // Se escribe con otro nombre y se renombra al final: nunca queda un respaldo a medias.
    await fsp.writeFile(destino + ".parcial", zip);
    await fsp.rename(destino + ".parcial", destino);

    escribir(CLAVE.ultimo, ahora);
    escribir(CLAVE.error, "");
    podar(carpeta, conservar);
    return { archivo, fecha: ahora, tipo, bytes: zip.byteLength };
  } catch (e) {
    escribir(CLAVE.error, `${ahora} · ${(e as Error).message}`);
    throw e;
  } finally {
    await fsp.rm(temporal, { recursive: true, force: true });
  }
}

/** Borra los respaldos más antiguos, dejando solo los últimos `conservar`. */
function podar(carpeta: string, conservar: number) {
  for (const r of listarRespaldos().slice(conservar)) {
    fs.rmSync(path.join(carpeta, r.archivo), { force: true });
  }
}

// ---------- Restaurar ----------

export type ResultadoRestauracion = { productos: number; ventas: number; imagenes: number; fecha: string | null };

/**
 * Reemplaza todos los datos por los del respaldo. Antes guarda un respaldo del estado actual.
 * Las sesiones se cierran (los usuarios y contraseñas pasan a ser los del respaldo) y se
 * conservan los ajustes de respaldos de esta computadora.
 */
export async function restaurarRespaldo(zip: Uint8Array): Promise<ResultadoRestauracion> {
  let archivos: Record<string, Uint8Array>;
  try {
    archivos = unzipSync(zip);
  } catch {
    throw new ErrorNegocio("No se pudo abrir el archivo. Debe ser un respaldo .zip de este sistema.");
  }
  const base = archivos["inventario.db"];
  if (!base) throw new ErrorNegocio("Ese archivo no es un respaldo de este sistema (no contiene la base de datos).");
  let meta: { fecha?: string } = {};
  try {
    if (archivos["respaldo.json"]) meta = JSON.parse(new TextDecoder().decode(archivos["respaldo.json"]));
  } catch {
    /* sin datos extra */
  }

  const temporal = await fsp.mkdtemp(path.join(os.tmpdir(), "inventario-restaurar-"));
  try {
    const ruta = path.join(temporal, "respaldo.db");
    await fsp.writeFile(ruta, base);

    // 1) Revisar el respaldo y llevarlo a la versión actual del sistema (en una copia aparte).
    let productos = 0;
    let ventas = 0;
    let r: Database.Database | null = null;
    try {
      r = new Database(ruta);
      if (r.pragma("quick_check", { simple: true }) !== "ok") throw new ErrorNegocio("La base de datos del respaldo está dañada.");
      const tablas = new Set((r.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name));
      if (!tablas.has("productos") || !tablas.has("ventas"))
        throw new ErrorNegocio("Ese archivo no es un respaldo de este sistema.");
      r.transaction(() => prepararEsquema(r!))();
      productos = (r.prepare("SELECT COUNT(*) AS n FROM productos").get() as { n: number }).n;
      ventas = (r.prepare("SELECT COUNT(*) AS n FROM ventas").get() as { n: number }).n;
    } catch (e) {
      if (e instanceof ErrorNegocio) throw e;
      throw new ErrorNegocio(`El respaldo no se pudo leer: ${(e as Error).message}`);
    } finally {
      r?.close();
    }

    // 2) Respaldo de seguridad de lo que hay ahora, por si hay que volver atrás.
    await crearRespaldo("previo");

    // 3) Copiar los datos (todo o nada).
    copiarTablas(ruta);

    // 4) Fotos: se agregan las del respaldo (las que ya existen se reemplazan).
    fs.mkdirSync(DIR_IMAGENES, { recursive: true });
    let imagenes = 0;
    for (const [nombre, datos] of Object.entries(archivos)) {
      if (!nombre.startsWith("imagenes/")) continue;
      const f = nombre.slice("imagenes/".length);
      if (!IMAGEN.test(f)) continue;
      await fsp.writeFile(path.join(DIR_IMAGENES, f), datos);
      imagenes++;
    }
    return { productos, ventas, imagenes, fecha: meta.fecha ?? null };
  } finally {
    await fsp.rm(temporal, { recursive: true, force: true });
  }
}

const q = (nombre: string) => `"${nombre.replace(/"/g, '""')}"`;

function copiarTablas(rutaRespaldo: string) {
  // Ajustes de respaldos de esta computadora: no vienen del respaldo.
  const propios = db.prepare("SELECT clave, valor FROM configuracion WHERE clave LIKE 'respaldo\\_%' ESCAPE '\\'").all() as {
    clave: string;
    valor: string | null;
  }[];

  db.prepare("ATTACH DATABASE ? AS respaldo").run(rutaRespaldo);
  db.pragma("foreign_keys = OFF");
  try {
    db.transaction(() => {
      const tablas = (
        db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]
      ).map((t) => t.name);
      const enRespaldo = new Set(
        (db.prepare("SELECT name FROM respaldo.sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((t) => t.name),
      );
      for (const t of tablas) {
        db.exec(`DELETE FROM main.${q(t)}`);
        if (!enRespaldo.has(t)) continue;
        const colsMain = (db.prepare(`PRAGMA main.table_info(${q(t)})`).all() as { name: string }[]).map((c) => c.name);
        const colsResp = new Set((db.prepare(`PRAGMA respaldo.table_info(${q(t)})`).all() as { name: string }[]).map((c) => c.name));
        const cols = colsMain.filter((c) => colsResp.has(c)).map(q).join(", ");
        if (cols) db.exec(`INSERT INTO main.${q(t)} (${cols}) SELECT ${cols} FROM respaldo.${q(t)}`);
      }
      // Contadores de AUTOINCREMENT, para que los folios sigan desde donde iban en el respaldo.
      if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE name = 'sqlite_sequence'").get()) {
        db.exec("DELETE FROM main.sqlite_sequence");
        if (enRespaldo.has("sqlite_sequence"))
          db.exec("INSERT INTO main.sqlite_sequence (name, seq) SELECT name, seq FROM respaldo.sqlite_sequence");
      }
      // Nadie queda con sesión abierta: los usuarios ahora son los del respaldo.
      db.exec("DELETE FROM main.sesiones");
      const ins = db.prepare(
        "INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
      );
      db.exec("DELETE FROM main.configuracion WHERE clave LIKE 'respaldo\\_%' ESCAPE '\\'");
      for (const p of propios) ins.run(p.clave, p.valor);
    }).immediate();
  } finally {
    db.pragma("foreign_keys = ON");
    db.exec("DETACH DATABASE respaldo");
  }
}
