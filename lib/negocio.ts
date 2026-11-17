import "server-only";
import { CONFIG } from "./config";
import { db } from "./db";

// Datos del negocio editables desde Configuración (se guardan en la tabla configuracion).

export type Negocio = {
  nombre: string;
  direccion: string;
  telefono: string;
  nit: string;
  mensajeTicket: string;
};

const CLAVES: Record<keyof Negocio, string> = {
  nombre: "nombre_negocio",
  direccion: "direccion",
  telefono: "telefono",
  nit: "nit",
  mensajeTicket: "mensaje_ticket",
};

const POR_DEFECTO: Negocio = {
  nombre: CONFIG.nombreNegocio,
  direccion: "",
  telefono: "",
  nit: "",
  mensajeTicket: "¡Gracias por su compra!",
};

export function obtenerNegocio(): Negocio {
  const filas = db.prepare("SELECT clave, valor FROM configuracion").all() as { clave: string; valor: string | null }[];
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));
  const n = { ...POR_DEFECTO };
  for (const [campo, clave] of Object.entries(CLAVES) as [keyof Negocio, string][]) {
    const v = mapa.get(clave);
    if (v != null && (v.trim() !== "" || campo !== "nombre")) n[campo] = v;
  }
  return n;
}

export function guardarNegocio(datos: Negocio) {
  const ins = db.prepare(
    "INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
  );
  db.transaction(() => {
    for (const [campo, clave] of Object.entries(CLAVES) as [keyof Negocio, string][]) ins.run(clave, datos[campo].trim());
  })();
}
