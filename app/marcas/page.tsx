import type { Metadata } from "next";
import { CatalogoSimple } from "@/components/CatalogoSimple";
import { Encabezado } from "@/components/ui";
import { listarCatalogo } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Marcas" };

export default function MarcasPage() {
  const items = listarCatalogo("marcas");
  return (
    <>
      <Encabezado
        titulo="Marcas"
        descripcion="Las marcas que ya tienen productos no se pueden eliminar, solo desactivar."
      />
      <CatalogoSimple tabla="marcas" items={items} singular="Marca" />
    </>
  );
}
