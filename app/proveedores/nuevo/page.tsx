import type { Metadata } from "next";
import { ProveedorForm } from "@/components/ProveedorForm";
import { Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default function NuevoProveedorPage() {
  return (
    <div className="max-w-3xl">
      <Encabezado titulo="Nuevo proveedor" volver={{ href: "/proveedores", texto: "Proveedores" }} />
      <ProveedorForm />
    </div>
  );
}
