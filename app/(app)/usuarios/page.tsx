import type { Metadata } from "next";
import Link from "next/link";
import { btnPrimario, tdCls, thCls } from "@/components/estilos";
import { Aviso, Encabezado, Etiqueta, Tarjeta } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth";
import { listarUsuarios } from "@/lib/data/usuarios";
import { fecha } from "@/lib/format";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const yo = await exigirAdmin();
  const sp = await searchParams;
  const usuarios = listarUsuarios();
  return (
    <>
      <Encabezado
        titulo="Usuarios"
        descripcion="Quién puede entrar al sistema y qué puede hacer."
        acciones={
          <Link href="/usuarios/nuevo" className={btnPrimario}>
            + Nuevo usuario
          </Link>
        }
      />
      {sp.guardado && (
        <div className="mb-4">
          <Aviso tipo="ok">Usuario guardado.</Aviso>
        </div>
      )}
      <Tarjeta className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className={thCls}>Nombre</th>
                <th className={thCls}>Usuario</th>
                <th className={thCls}>Rol</th>
                <th className={`${thCls} text-right`}>Ventas</th>
                <th className={thCls}>Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? "hover:bg-gris-50" : "bg-gris-50/60 text-gris-500"}>
                  <td className={tdCls}>
                    <Link href={`/usuarios/${u.id}`} className="font-medium text-acento-700 hover:underline">
                      {u.nombre}
                    </Link>
                    {u.id === yo.id && <span className="ml-2 text-xs text-gris-500">(tú)</span>}
                    {!u.activo && (
                      <span className="ml-2">
                        <Etiqueta>Desactivado</Etiqueta>
                      </span>
                    )}
                  </td>
                  <td className={`${tdCls} font-mono text-xs`}>{u.usuario}</td>
                  <td className={tdCls}>
                    {u.rol === "admin" ? <Etiqueta tono="acento">Administrador</Etiqueta> : <Etiqueta tono="azul">Vendedor</Etiqueta>}
                  </td>
                  <td className={`${tdCls} tabular text-right`}>{u.ventas}</td>
                  <td className={`${tdCls} whitespace-nowrap text-gris-600`}>{u.ultimo_acceso ? fecha(u.ultimo_acceso) : "Nunca"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </>
  );
}
