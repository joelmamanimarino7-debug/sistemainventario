import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { NuevaEntrada } from "@/components/NuevaEntrada";
import { Encabezado } from "@/components/ui";
import { listarProveedores } from "@/lib/data/catalogos";
import { obtenerParaOperacion } from "@/lib/data/productos";

export const metadata: Metadata = { title: "Nueva entrada" };

export default async function NuevaEntradaPage({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const productoInicial = sp.producto ? obtenerParaOperacion(Number(sp.producto)) : undefined;
  const proveedores = listarProveedores(true).map((p) => ({ id: p.id, nombre: p.nombre }));
  return (
    <>
      <Encabezado
        titulo="Nueva entrada de mercancía"
        descripcion="Registra lo que llegó de un proveedor o un reabastecimiento. El stock se suma automáticamente."
        volver={{ href: "/entradas", texto: "Entradas" }}
      />
      <NuevaEntrada proveedores={proveedores} productoInicial={productoInicial} />
    </>
  );
}
