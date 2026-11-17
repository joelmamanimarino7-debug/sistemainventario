import { NextResponse } from "next/server";
import { usuarioActual } from "@/lib/auth";
import { buscarParaOperacion } from "@/lib/data/productos";

// Buscador usado por las pantallas de Nueva venta, Entrada, Ajuste y Etiquetas.
export async function GET(req: Request) {
  const yo = await usuarioActual();
  if (!yo) return NextResponse.json({ error: "Sesión terminada" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const resultados = buscarParaOperacion(q);
  // El costo solo lo ven los administradores.
  return NextResponse.json(yo.rol === "admin" ? resultados : resultados.map((p) => ({ ...p, precio_costo: 0 })));
}
