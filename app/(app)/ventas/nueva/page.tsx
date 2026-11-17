import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth";
import { NuevaVenta } from "@/components/NuevaVenta";
import { Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage() {
  const yo = await exigirUsuario();
  return (
    <>
      <Encabezado titulo="Nueva venta" />
      <NuevaVenta puedeCambiarPrecio={yo.rol === "admin"} />
    </>
  );
}
