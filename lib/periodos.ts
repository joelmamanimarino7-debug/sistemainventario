import { isoLocal } from "./format";
import type { Periodo } from "./data/reportes";

export const PERIODOS = [
  { valor: "hoy", texto: "Hoy" },
  { valor: "7dias", texto: "Últimos 7 días" },
  { valor: "mes", texto: "Este mes" },
  { valor: "mes-anterior", texto: "Mes anterior" },
  { valor: "30dias", texto: "Últimos 30 días" },
  { valor: "anio", texto: "Este año" },
  { valor: "personalizado", texto: "Personalizado" },
] as const;

const esFecha = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Traduce los parámetros de la URL (?periodo=mes o ?desde=…&hasta=…) a un rango de fechas. */
export function resolverPeriodo(sp: { periodo?: string; desde?: string; hasta?: string }): Periodo & {
  clave: string;
  texto: string;
} {
  const h = new Date();
  const y = h.getFullYear();
  const m = h.getMonth();
  const d = h.getDate();
  const hoy = isoLocal(h);
  const fmt = (s: string) => s.split("-").reverse().join("/");
  const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (esFecha(sp.desde) || esFecha(sp.hasta)) {
    let desde = esFecha(sp.desde) ? sp.desde : esFecha(sp.hasta) ? sp.hasta : hoy;
    let hasta = esFecha(sp.hasta) ? sp.hasta : hoy;
    if (desde > hasta) [desde, hasta] = [hasta, desde];
    return { clave: "personalizado", desde, hasta, texto: desde === hasta ? fmt(desde) : `${fmt(desde)} al ${fmt(hasta)}` };
  }
  switch (sp.periodo) {
    case "hoy":
      return { clave: "hoy", desde: hoy, hasta: hoy, texto: `Hoy, ${fmt(hoy)}` };
    case "7dias":
      return { clave: "7dias", desde: isoLocal(new Date(y, m, d - 6)), hasta: hoy, texto: "Últimos 7 días" };
    case "30dias":
      return { clave: "30dias", desde: isoLocal(new Date(y, m, d - 29)), hasta: hoy, texto: "Últimos 30 días" };
    case "mes-anterior": {
      const ini = new Date(y, m - 1, 1);
      const nombre = ini.toLocaleDateString("es", { month: "long", year: "numeric" });
      return { clave: "mes-anterior", desde: isoLocal(ini), hasta: isoLocal(new Date(y, m, 0)), texto: mayuscula(nombre) };
    }
    case "anio":
      return { clave: "anio", desde: `${y}-01-01`, hasta: hoy, texto: `Año ${y}` };
    default: {
      const nombre = h.toLocaleDateString("es", { month: "long", year: "numeric" });
      return { clave: "mes", desde: isoLocal(new Date(y, m, 1)), hasta: hoy, texto: mayuscula(nombre) };
    }
  }
}
