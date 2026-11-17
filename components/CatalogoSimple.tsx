"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  cambiarEstadoCatalogo,
  crearItemCatalogo,
  eliminarItemCatalogo,
  renombrarItemCatalogo,
} from "@/app/actions/catalogos";
import type { ItemCatalogo, TablaCatalogo } from "@/lib/data/catalogos";
import type { EstadoForm } from "@/lib/forms";
import { BotonConfirmar, BotonEnviar } from "./botones";
import { btnChico, btnFantasma, btnPeligro, btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "./estilos";
import { Aviso, Etiqueta, Tarjeta, Vacio } from "./ui";

export function CatalogoSimple({
  tabla,
  items,
  singular,
}: {
  tabla: TablaCatalogo;
  items: ItemCatalogo[];
  singular: string;
}) {
  const [estado, accion] = useActionState<EstadoForm, FormData>(crearItemCatalogo, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Tarjeta className="order-2 overflow-hidden xl:order-1">
        {items.length === 0 ? (
          <Vacio titulo={`Aún no hay ${tabla}`} texto={`Agrega la primera ${singular.toLowerCase()} con el formulario.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Nombre</th>
                  <th className={`${thCls} text-right`}>Productos</th>
                  <th className={thCls}>Estado</th>
                  <th className={`${thCls} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <Fila key={it.id} tabla={tabla} item={it} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Agregar ${singular.toLowerCase()}`} className="order-1 self-start xl:order-2">
        <form ref={formRef} action={accion} className="space-y-3 p-4">
          <input type="hidden" name="tabla" value={tabla} />
          <input name="nombre" className={inputCls} placeholder="Nombre" required autoComplete="off" />
          {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
          {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
          <BotonEnviar className={`${btnPrimario} w-full`}>Agregar</BotonEnviar>
        </form>
      </Tarjeta>
    </div>
  );
}

function Fila({ tabla, item }: { tabla: TablaCatalogo; item: ItemCatalogo }) {
  const [editando, setEditando] = useState(false);
  const [estado, accion] = useActionState<EstadoForm, FormData>(renombrarItemCatalogo, {});

  useEffect(() => {
    if (estado.ok) setEditando(false);
  }, [estado]);

  return (
    <tr className={item.activo ? "" : "bg-tierra-50/60 text-tierra-500"}>
      <td className={tdCls}>
        {editando ? (
          <form action={accion} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="tabla" value={tabla} />
            <input type="hidden" name="id" value={item.id} />
            <input name="nombre" defaultValue={item.nombre} className={`${inputCls} max-w-56 !py-1`} autoFocus />
            <BotonEnviar className={`${btnPrimario} ${btnChico}`}>Guardar</BotonEnviar>
            <button type="button" className={`${btnFantasma} ${btnChico}`} onClick={() => setEditando(false)}>
              Cancelar
            </button>
            {estado.error && <span className="w-full text-xs text-red-600">{estado.error}</span>}
          </form>
        ) : (
          <span className="font-medium">{item.nombre}</span>
        )}
      </td>
      <td className={`${tdCls} tabular text-right`}>{item.productos}</td>
      <td className={tdCls}>
        {item.activo ? <Etiqueta tono="verde">Activo</Etiqueta> : <Etiqueta>Inactivo</Etiqueta>}
      </td>
      <td className={`${tdCls} text-right`}>
        <div className="flex justify-end gap-1.5">
          {!editando && (
            <button className={`${btnSecundario} ${btnChico}`} onClick={() => setEditando(true)}>
              Renombrar
            </button>
          )}
          <form action={cambiarEstadoCatalogo}>
            <input type="hidden" name="tabla" value={tabla} />
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="activo" value={item.activo ? "0" : "1"} />
            <BotonEnviar className={`${btnSecundario} ${btnChico}`} textoCargando="…">
              {item.activo ? "Desactivar" : "Activar"}
            </BotonEnviar>
          </form>
          {item.productos === 0 && (
            <form action={eliminarItemCatalogo}>
              <input type="hidden" name="tabla" value={tabla} />
              <input type="hidden" name="id" value={item.id} />
              <BotonConfirmar
                className={`${btnPeligro} ${btnChico}`}
                mensaje={`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`}
              >
                Eliminar
              </BotonConfirmar>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
