import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonesTicket, ImprimirAlCargar } from "@/components/ImprimirAlCargar";
import { exigirUsuario } from "@/lib/auth";
import { etiquetaMetodo } from "@/lib/config";
import { obtenerVenta } from "@/lib/data/ventas";
import { cantidad, dinero, fecha } from "@/lib/format";
import { obtenerNegocio } from "@/lib/negocio";

export const metadata: Metadata = { title: "Ticket" };

// Ticket para impresora térmica de 80 mm (área imprimible ~72 mm).
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imprimir?: string }>;
}) {
  await exigirUsuario();
  const { id } = await params;
  const sp = await searchParams;
  const datos = obtenerVenta(Number(id));
  if (!datos) notFound();
  const { venta: v, detalle } = datos;
  const n = obtenerNegocio();
  const anulada = v.estado === "cancelada";

  return (
    <div className="min-h-screen bg-gris-100 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          html, body { background: #fff !important; }
        }
      `}</style>
      <ImprimirAlCargar activo={sp.imprimir === "1" && !anulada} />
      <BotonesTicket />

      <article
        className="mx-auto bg-white font-mono text-[11.5px] leading-snug text-black shadow-sm print:shadow-none"
        style={{ width: "72mm", padding: "4mm 0" }}
      >
        <header className="text-center">
          <p className="text-[15px] font-bold leading-tight">{n.nombre}</p>
          {n.direccion && <p>{n.direccion}</p>}
          {n.telefono && <p>Tel.: {n.telefono}</p>}
          {n.nit && <p>NIT: {n.nit}</p>}
        </header>

        <Linea />
        <p className="text-center font-bold">NOTA DE VENTA N° {String(v.id).padStart(6, "0")}</p>
        {anulada && <p className="text-center font-bold">*** ANULADA ***</p>}
        <p>Fecha: {fecha(v.creado_en)}</p>
        {v.vendedor && <p>Atendió: {v.vendedor}</p>}
        {v.cliente && <p>Cliente: {v.cliente}</p>}
        <Linea />

        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left">
              <th className="font-bold">Descripción</th>
              <th className="text-right font-bold">Importe</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map((d) => (
              <tr key={d.id} className="align-top">
                <td className="pr-1 pt-1">
                  {d.producto}
                  <br />
                  {cantidad(d.cantidad)} × {dinero(d.precio_unitario)}
                </td>
                <td className="whitespace-nowrap pt-1 text-right align-bottom">{dinero(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Linea />
        {v.descuento > 0 && (
          <>
            <Fila izq="Subtotal" der={dinero(v.subtotal)} />
            <Fila izq="Descuento" der={`-${dinero(v.descuento)}`} />
          </>
        )}
        <Fila izq="TOTAL" der={dinero(v.total)} grande />
        <Fila izq="Pago" der={etiquetaMetodo(v.metodo_pago)} />
        {v.pago_con != null && (
          <>
            <Fila izq="Recibido" der={dinero(v.pago_con)} />
            <Fila izq="Cambio" der={dinero(v.pago_con - v.total)} />
          </>
        )}
        {v.devuelto > 0 && <Fila izq="Devuelto" der={`-${dinero(v.devuelto)}`} />}
        <Linea />
        <p className="text-center">{n.mensajeTicket}</p>
        <p className="mt-1 text-center text-[10px]">Artículos: {cantidad(v.unidades)}</p>
      </article>
    </div>
  );
}

function Linea() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Fila({ izq, der, grande }: { izq: string; der: string; grande?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${grande ? "text-[14px] font-bold" : ""}`}>
      <span>{izq}</span>
      <span className="text-right">{der}</span>
    </div>
  );
}
