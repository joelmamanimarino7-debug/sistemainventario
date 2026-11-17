import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { ProductoForm } from "@/components/ProductoForm";
import { Encabezado } from "@/components/ui";
import { listarCatalogo, listarProveedores } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NuevoProductoPage() {
  await exigirAdmin();
  return (
    <div className="max-w-4xl">
      <Encabezado titulo="Nuevo producto" volver={{ href: "/productos", texto: "Productos" }} />
      <ProductoForm
        categorias={listarCatalogo("categorias")}
        marcas={listarCatalogo("marcas")}
        proveedores={listarProveedores()}
      />
    </div>
  );
}
