import type { Metadata } from "next";
import { ProductoForm } from "@/components/ProductoForm";
import { Encabezado } from "@/components/ui";
import { listarCatalogo, listarProveedores } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NuevoProductoPage() {
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
