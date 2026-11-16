import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NuevaDevolucion } from "@/components/NuevaDevolucion";
import { Encabezado } from "@/components/ui";
import { obtenerVenta } from "@/lib/data/ventas";
import { dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Devolución" };

export default async function DevolucionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = obtenerVenta(Number(id));
  if (!datos) notFound();
  const { venta: v, detalle } = datos;
  if (v.estado !== "completada") redirect(`/ventas/${v.id}`);

  return (
    <>
      <Encabezado
        titulo={`Devolución de la venta #${v.id}`}
        descripcion={`Venta del ${fecha(v.creado_en)} · total cobrado ${dinero(v.total)}${
          v.devuelto > 0 ? ` · ya devuelto ${dinero(v.devuelto)}` : ""
        }`}
        volver={{ href: `/ventas/${v.id}`, texto: `Venta #${v.id}` }}
      />
      <NuevaDevolucion
        ventaId={v.id}
        factor={v.subtotal > 0 ? v.total / v.subtotal : 0}
        lineas={detalle.map((d) => ({
          id: d.id,
          producto: d.producto,
          codigo: d.codigo,
          unidad: d.unidad,
          imagen: d.imagen,
          cantidad: d.cantidad,
          devuelto: d.devuelto,
          precio_unitario: d.precio_unitario,
        }))}
      />
    </>
  );
}
