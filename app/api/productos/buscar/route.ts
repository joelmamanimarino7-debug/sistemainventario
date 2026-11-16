import { NextResponse } from "next/server";
import { buscarParaOperacion } from "@/lib/data/productos";

// Buscador usado por las pantallas de Nueva venta y Nueva entrada.
export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(buscarParaOperacion(q));
}
