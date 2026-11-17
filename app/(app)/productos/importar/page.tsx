import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import { btnSecundario } from "@/components/estilos";
import { ImportarProductos } from "@/components/ImportarProductos";
import { Encabezado, Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Importar / exportar" };

const DESCARGAS = [
  { href: "/api/exportar/productos", titulo: "Productos", texto: "Todos los productos con stock, precios y valor. Sirve para editar y volver a importar." },
  { href: "/api/exportar/ventas", titulo: "Ventas", texto: "Todas las ventas, su detalle por producto y las devoluciones." },
  { href: "/api/exportar/movimientos", titulo: "Movimientos", texto: "Historial completo de cambios de stock." },
  { href: "/api/exportar/plantilla", titulo: "Plantilla vacía", texto: "Para cargar productos nuevos desde cero, con instrucciones." },
];

export default async function ImportarPage() {
  await exigirAdmin();
  return (
    <>
      <Encabezado
        titulo="Importar y exportar"
        descripcion="Carga o actualiza muchos productos a la vez desde Excel, o descarga tus datos."
        volver={{ href: "/productos", texto: "Productos" }}
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tierra-500">Descargar en Excel</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DESCARGAS.map((d) => (
          <Tarjeta key={d.href} className="flex flex-col justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-tierra-900">{d.titulo}</p>
              <p className="mt-1 text-sm text-tierra-500">{d.texto}</p>
            </div>
            <a href={d.href} download className={`${btnSecundario} self-start`}>
              ⇩ Descargar
            </a>
          </Tarjeta>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tierra-500">Importar productos</h2>
      <ImportarProductos />
    </>
  );
}
