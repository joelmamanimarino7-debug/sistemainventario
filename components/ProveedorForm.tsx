"use client";

import Link from "next/link";
import { guardarProveedor } from "@/app/actions/catalogos";
import type { Proveedor } from "@/lib/data/catalogos";
import { btnPrimario, btnSecundario, inputCls } from "./estilos";
import { Aviso, Campo, Tarjeta } from "./ui";
import { useFormAccion } from "./useFormAccion";

export function ProveedorForm({ proveedor }: { proveedor?: Proveedor }) {
  const { estado, onSubmit, pendiente } = useFormAccion(guardarProveedor);
  const p = proveedor;

  return (
    <form onSubmit={onSubmit}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Tarjeta>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo label="Nombre o razón social" htmlFor="nombre" requerido error={estado.campos?.nombre} className="sm:col-span-2">
            <input id="nombre" name="nombre" defaultValue={p?.nombre} className={inputCls} required />
          </Campo>
          <Campo label="Persona de contacto" htmlFor="contacto">
            <input id="contacto" name="contacto" defaultValue={p?.contacto ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Teléfono" htmlFor="telefono">
            <input id="telefono" name="telefono" type="tel" defaultValue={p?.telefono ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Correo" htmlFor="email">
            <input id="email" name="email" type="email" defaultValue={p?.email ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Dirección" htmlFor="direccion">
            <input id="direccion" name="direccion" defaultValue={p?.direccion ?? ""} className={inputCls} />
          </Campo>
          <Campo label="Notas" htmlFor="notas" className="sm:col-span-2">
            <textarea id="notas" name="notas" rows={3} defaultValue={p?.notas ?? ""} className={inputCls} />
          </Campo>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gris-100 px-5 py-3">
          {estado.error && (
            <div className="mr-auto">
              <Aviso tipo="error">{estado.error}</Aviso>
            </div>
          )}
          <Link href="/proveedores" className={btnSecundario}>
            Cancelar
          </Link>
          <button type="submit" disabled={pendiente} className={btnPrimario}>
            {pendiente ? "Guardando…" : p ? "Guardar cambios" : "Crear proveedor"}
          </button>
        </div>
      </Tarjeta>
    </form>
  );
}
