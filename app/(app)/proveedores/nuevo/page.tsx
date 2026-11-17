import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { ProveedorForm } from "@/components/ProveedorForm";
import { Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo proveedor" };

export default async function NuevoProveedorPage() {
  await exigirAdmin();
  return (
    <div className="max-w-3xl">
      <Encabezado titulo="Nuevo proveedor" volver={{ href: "/proveedores", texto: "Proveedores" }} />
      <ProveedorForm />
    </div>
  );
}
