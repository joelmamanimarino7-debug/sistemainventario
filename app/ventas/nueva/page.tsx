import type { Metadata } from "next";
import { NuevaVenta } from "@/components/NuevaVenta";
import { Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nueva venta" };

export default function NuevaVentaPage() {
  return (
    <>
      <Encabezado titulo="Nueva venta" />
      <NuevaVenta />
    </>
  );
}
