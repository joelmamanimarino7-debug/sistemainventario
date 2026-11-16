import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProveedorForm } from "@/components/ProveedorForm";
import { Encabezado } from "@/components/ui";
import { obtenerProveedor } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Editar proveedor" };

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proveedor = obtenerProveedor(Number(id));
  if (!proveedor) notFound();
  return (
    <div className="max-w-3xl">
      <Encabezado titulo={proveedor.nombre} descripcion="Editar proveedor" volver={{ href: "/proveedores", texto: "Proveedores" }} />
      <ProveedorForm proveedor={proveedor} />
    </div>
  );
}
