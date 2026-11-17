import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ProductoForm } from "@/components/ProductoForm";
import { Encabezado } from "@/components/ui";
import { listarCatalogo, listarProveedores } from "@/lib/data/catalogos";
import { obtenerProducto } from "@/lib/data/productos";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  const producto = obtenerProducto(Number(id));
  if (!producto) notFound();
  return (
    <div className="max-w-4xl">
      <Encabezado
        titulo="Editar producto"
        descripcion={producto.nombre}
        volver={{ href: `/productos/${producto.id}`, texto: producto.nombre }}
      />
      <ProductoForm
        producto={producto}
        categorias={listarCatalogo("categorias")}
        marcas={listarCatalogo("marcas")}
        proveedores={listarProveedores()}
      />
    </div>
  );
}
