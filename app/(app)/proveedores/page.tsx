import type { Metadata } from "next";
import { exigirAdmin } from "@/lib/auth";
import Link from "next/link";
import { cambiarEstadoCatalogo, eliminarItemCatalogo } from "@/app/actions/catalogos";
import { BotonConfirmar, BotonEnviar } from "@/components/botones";
import { btnChico, btnPeligro, btnPrimario, btnSecundario, tdCls, thCls } from "@/components/estilos";
import { Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { listarProveedores } from "@/lib/data/catalogos";

export const metadata: Metadata = { title: "Proveedores" };

export default async function ProveedoresPage() {
  await exigirAdmin();
  const proveedores = listarProveedores();
  return (
    <>
      <Encabezado
        titulo="Proveedores"
        descripcion="A quién le compras la mercancía."
        acciones={
          <Link href="/proveedores/nuevo" className={btnPrimario}>
            + Nuevo proveedor
          </Link>
        }
      />
      <Tarjeta className="overflow-hidden">
        {proveedores.length === 0 ? (
          <Vacio
            titulo="Aún no hay proveedores"
            accion={
              <Link href="/proveedores/nuevo" className={btnPrimario}>
                Agregar el primero
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Nombre</th>
                  <th className={thCls}>Contacto</th>
                  <th className={thCls}>Teléfono</th>
                  <th className={`${thCls} text-right`}>Productos</th>
                  <th className={thCls}>Estado</th>
                  <th className={`${thCls} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} className={p.activo ? "" : "bg-zinc-50/60 text-zinc-500"}>
                    <td className={tdCls}>
                      <Link href={`/proveedores/${p.id}`} className="font-medium text-zinc-900 hover:text-teal-700">
                        {p.nombre}
                      </Link>
                      {p.email && <div className="text-xs text-zinc-500">{p.email}</div>}
                    </td>
                    <td className={tdCls}>{p.contacto ?? "—"}</td>
                    <td className={tdCls}>{p.telefono ?? "—"}</td>
                    <td className={`${tdCls} tabular text-right`}>{p.productos}</td>
                    <td className={tdCls}>
                      {p.activo ? <Etiqueta tono="verde">Activo</Etiqueta> : <Etiqueta>Inactivo</Etiqueta>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex justify-end gap-1.5">
                        <Link href={`/proveedores/${p.id}`} className={`${btnSecundario} ${btnChico}`}>
                          Editar
                        </Link>
                        <form action={cambiarEstadoCatalogo}>
                          <input type="hidden" name="tabla" value="proveedores" />
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="activo" value={p.activo ? "0" : "1"} />
                          <BotonEnviar className={`${btnSecundario} ${btnChico}`} textoCargando="…">
                            {p.activo ? "Desactivar" : "Activar"}
                          </BotonEnviar>
                        </form>
                        {p.productos === 0 && p.entradas === 0 && (
                          <form action={eliminarItemCatalogo}>
                            <input type="hidden" name="tabla" value="proveedores" />
                            <input type="hidden" name="id" value={p.id} />
                            <BotonConfirmar
                              className={`${btnPeligro} ${btnChico}`}
                              mensaje={`¿Eliminar al proveedor "${p.nombre}"? Esta acción no se puede deshacer.`}
                            >
                              Eliminar
                            </BotonConfirmar>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
