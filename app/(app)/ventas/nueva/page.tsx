import type { Metadata } from "next";
import Link from "next/link";
import { FormAbrirCaja } from "@/components/Caja";
import { NuevaVenta } from "@/components/NuevaVenta";
import { Encabezado, Tarjeta } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { cajaAbierta } from "@/lib/caja";
import { fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage() {
  const yo = await exigirUsuario();
  const caja = cajaAbierta();

  if (!caja) {
    return (
      <>
        <Encabezado titulo="Nueva venta" />
        <Tarjeta titulo="La caja está cerrada" className="max-w-md">
          <div className="p-4">
            <p className="mb-4 text-sm text-gris-600">
              Para vender hay que abrir la caja: así cada venta queda en el turno y al final del día se puede cuadrar el
              efectivo.
            </p>
            <FormAbrirCaja />
          </div>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Encabezado
        titulo="Nueva venta"
        descripcion={
          <>
            Caja abierta desde el {fecha(caja.abierta_en)} ·{" "}
            <Link href="/caja" className="text-acento-700 hover:underline">
              ver caja
            </Link>
          </>
        }
      />
      <NuevaVenta puedeCambiarPrecio={yo.rol === "admin"} />
    </>
  );
}
