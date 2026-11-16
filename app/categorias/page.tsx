import type { Metadata } from "next";
import { CatalogoSimple } from "@/components/CatalogoSimple";
import { Encabezado } from "@/components/ui";
import { listarCatalogo } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Categorías" };

export default function CategoriasPage() {
  const items = listarCatalogo("categorias");
  return (
    <>
      <Encabezado
        titulo="Categorías"
        descripcion="Tipos de producto. Las que ya tienen productos no se pueden eliminar, solo desactivar."
      />
      <CatalogoSimple tabla="categorias" items={items} singular="Categoría" />
    </>
  );
}
