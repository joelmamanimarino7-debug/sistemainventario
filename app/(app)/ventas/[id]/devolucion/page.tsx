import type { Metadata } from "next";
import { exigirUsuario } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { NuevaDevolucion } from "@/components/NuevaDevolucion";
import { btnPrimario } from "@/components/estilos";
import { Tarjeta } from "@/components/ui";
import { cajaAbierta } from "@/lib/caja";
import { Encabezado } from "@/components/ui";
import { obtenerVenta } from "@/lib/data/ventas";
import { dinero, fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Devolución" };

export default async function DevolucionPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirUsuario();
  const { id } = await params;
  const datos = obtenerVenta(Number(id));
  if (!datos) notFound();
  const { venta: v, detalle } = datos;
  if (v.estado !== "completada") redirect(`/ventas/${v.id}`);
  const hayCaja = !!cajaAbierta();

  return (
    <>
      <Encabezado
        titulo={`Devolución de la venta #${v.id}`}
        descripcion={`Venta del ${fecha(v.creado_en)} · total cobrado ${dinero(v.total)}${
          v.devuelto > 0 ? ` · ya devuelto ${dinero(v.devuelto)}` : ""
        }`}
        volver={{ href: `/ventas/${v.id}`, texto: `Venta #${v.id}` }}
      />
      {!hayCaja ? (
        <Tarjeta titulo="La caja está cerrada" className="max-w-md">
          <div className="space-y-4 p-4">
            <p className="text-sm text-tierra-600">
              El dinero de una devolución sale de la caja, así que hay que abrirla primero.
            </p>
            <Link href="/caja" className={btnPrimario}>
              Ir a Caja
            </Link>
          </div>
        </Tarjeta>
      ) : (
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
      )}
    </>
  );
}
