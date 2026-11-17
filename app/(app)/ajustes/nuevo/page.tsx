import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { NuevoAjuste } from "@/components/NuevoAjuste";
import { Encabezado } from "@/components/ui";
import { obtenerParaOperacion } from "@/lib/data/productos";

export const metadata: Metadata = { title: "Nuevo ajuste" };

export default async function NuevoAjustePage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const productoInicial = sp.producto ? obtenerParaOperacion(Number(sp.producto)) : undefined;
  return (
    <>
      <Encabezado
        titulo="Ajuste de inventario"
        descripcion="Corrige el stock cuando no coincide con lo que hay de verdad: conteos, roturas, pérdidas o uso interno."
        volver={{ href: "/ajustes", texto: "Ajustes" }}
      />
      <NuevoAjuste productoInicial={productoInicial} />
    </>
  );
}
