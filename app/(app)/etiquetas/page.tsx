import type { Metadata } from "next";
import { Etiquetas } from "@/components/Etiquetas";
import { Encabezado } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { obtenerEntrada } from "@/lib/data/entradas";
import { productosParaEtiquetas } from "@/lib/data/productos";

export const metadata: Metadata = { title: "Etiquetas" };

export default async function EtiquetasPage({ searchParams }: { searchParams: Promise<{ producto?: string; entrada?: string }> }) {
  const yo = await exigirUsuario();
  const sp = await searchParams;

  // Precarga: un producto (desde su ficha) o lo que llegó en una entrada (una etiqueta por unidad).
  let inicial: { producto: ReturnType<typeof productosParaEtiquetas>[number]; copias: number }[] = [];
  if (sp.entrada && yo.rol === "admin") {
    const e = obtenerEntrada(Number(sp.entrada));
    if (e) {
      const prods = new Map(productosParaEtiquetas(e.detalle.map((d) => d.producto_id)).map((p) => [p.id, p]));
      inicial = e.detalle
        .filter((d) => prods.has(d.producto_id))
        .map((d) => ({ producto: prods.get(d.producto_id)!, copias: Math.max(1, Math.ceil(d.cantidad)) }));
    }
  } else if (sp.producto) {
    inicial = productosParaEtiquetas([Number(sp.producto)]).map((p) => ({ producto: p, copias: 1 }));
  }

  return (
    <>
      <div className="print:hidden">
        <Encabezado
          titulo="Etiquetas con código de barras"
          descripcion="Imprime etiquetas en hojas adhesivas. Si el producto no tiene código de barras de fábrica, se usa su código interno (ej. P-00001), que el lector reconoce al vender."
        />
      </div>
      <Etiquetas inicial={inicial} />
    </>
  );
}
