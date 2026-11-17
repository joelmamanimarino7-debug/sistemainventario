"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { importarProductos, revisarArchivo, revisarDeNuevo, type RespuestaRevision } from "@/app/actions/importar";
import { cantidad } from "@/lib/format";
import { btnPrimario, btnSecundario, tdCls, thCls } from "./estilos";
import { Aviso, Etiqueta, Tarjeta } from "./ui";

type Revision = Extract<RespuestaRevision, { ok: true }>;
type Resultado = { creados: number; actualizados: number; omitidos: number; ajusteId: number | null };

const FILTROS = [
  { valor: "todas", texto: "Todas" },
  { valor: "crear", texto: "Nuevos" },
  { valor: "actualizar", texto: "A actualizar" },
  { valor: "error", texto: "Con errores" },
] as const;

export function ImportarProductos() {
  const archivoRef = useRef<HTMLInputElement>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [ajustarStock, setAjustarStock] = useState(false);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["valor"]>("todas");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function revisar(archivo: File) {
    setError(null);
    setResultado(null);
    setRevision(null);
    setNombreArchivo(archivo.name);
    const fd = new FormData();
    fd.set("archivo", archivo);
    startTransition(async () => {
      const r = await revisarArchivo(fd, ajustarStock);
      if (r.ok) {
        setRevision(r);
        setFiltro(r.resumen.conError ? "error" : "todas");
      } else setError(r.error);
    });
  }

  function cambiarAjuste(valor: boolean) {
    setAjustarStock(valor);
    if (!revision) return;
    startTransition(async () => {
      const r = await revisarDeNuevo(revision.filas, valor);
      if (r.ok) setRevision(r);
      else setError(r.error);
    });
  }

  function importar() {
    if (!revision) return;
    setError(null);
    startTransition(async () => {
      const r = await importarProductos(revision.filas, ajustarStock);
      if (r.ok) {
        setResultado(r);
        setRevision(null);
        if (archivoRef.current) archivoRef.current.value = "";
      } else setError(r.error);
    });
  }

  const res = revision?.resumen;
  const validas = res ? res.crear + res.actualizar : 0;
  const nuevos = res?.catalogosNuevos;
  const filas = res?.filas.filter((f) => filtro === "todas" || f.accion === filtro) ?? [];

  return (
    <div className="space-y-6">
      <Tarjeta titulo="1. Elige el archivo">
        <div className="space-y-4 p-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gris-300 bg-gris-50 px-4 py-8 text-center text-sm text-gris-600 hover:border-acento-600 hover:bg-acento-50/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) revisar(f);
            }}
          >
            <span className="text-2xl" aria-hidden>
              ⇪
            </span>
            <span className="font-medium text-gris-900">{nombreArchivo || "Haz clic o arrastra aquí tu Excel (.xlsx)"}</span>
            <span className="text-xs text-gris-500">Se revisa primero: nada cambia hasta que confirmes.</span>
            <input
              ref={archivoRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) revisar(f);
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-sm text-gris-700">
            <input
              type="checkbox"
              checked={ajustarStock}
              onChange={(e) => cambiarAjuste(e.target.checked)}
              className="mt-0.5 accent-acento-700"
            />
            <span>
              Ajustar el stock de los productos existentes al valor de la columna «Stock»
              <span className="block text-xs text-gris-500">
                Útil después de un conteo físico. Queda registrado como un ajuste de inventario. Si no lo marcas, el stock de
                los productos existentes no cambia.
              </span>
            </span>
          </label>
          {pendiente && !revision && <p className="text-sm text-gris-500">Leyendo el archivo…</p>}
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
      </Tarjeta>

      {resultado && (
        <Aviso tipo="ok">
          Importación terminada: {resultado.creados} {resultado.creados === 1 ? "producto nuevo" : "productos nuevos"},{" "}
          {resultado.actualizados} {resultado.actualizados === 1 ? "actualizado" : "actualizados"}
          {resultado.omitidos > 0 && `, ${resultado.omitidos} omitidos por errores`}.{" "}
          {resultado.ajusteId && (
            <Link href={`/ajustes/${resultado.ajusteId}`} className="font-medium underline">
              Ver el ajuste de stock
            </Link>
          )}{" "}
          <Link href="/productos" className="font-medium underline">
            Ir a productos
          </Link>
        </Aviso>
      )}

      {revision && res && (
        <Tarjeta titulo="2. Revisa y confirma" className="overflow-hidden">
          <div className="space-y-3 border-b border-gris-100 p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Etiqueta tono="verde">{res.crear} nuevos</Etiqueta>
              <Etiqueta tono="azul">{res.actualizar} a actualizar</Etiqueta>
              {res.ajustesStock > 0 && <Etiqueta tono="ambar">{res.ajustesStock} con ajuste de stock</Etiqueta>}
              {res.conError > 0 && <Etiqueta tono="rojo">{res.conError} con errores (se omiten)</Etiqueta>}
            </div>
            {nuevos && nuevos.categorias.length + nuevos.marcas.length + nuevos.proveedores.length > 0 && (
              <p className="text-gris-600">
                Se crearán:{" "}
                {[
                  nuevos.categorias.length && `categorías ${nuevos.categorias.join(", ")}`,
                  nuevos.marcas.length && `marcas ${nuevos.marcas.join(", ")}`,
                  nuevos.proveedores.length && `proveedores ${nuevos.proveedores.join(", ")}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={importar} disabled={pendiente || validas === 0} className={btnPrimario}>
                {pendiente ? "Procesando…" : `Importar ${validas} ${validas === 1 ? "producto" : "productos"}`}
              </button>
              <button
                onClick={() => {
                  setRevision(null);
                  setNombreArchivo("");
                  if (archivoRef.current) archivoRef.current.value = "";
                }}
                className={btnSecundario}
              >
                Cancelar
              </button>
            </div>
          </div>
          <nav className="flex gap-1 border-b border-gris-100 px-4 py-2" aria-label="Filtrar filas">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                onClick={() => setFiltro(f.valor)}
                className={`rounded-full px-3 py-1 text-xs ${filtro === f.valor ? "bg-acento-700 text-white" : "bg-gris-100 text-gris-700"}`}
              >
                {f.texto}
              </button>
            ))}
          </nav>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0">
                <tr>
                  <th className={thCls}>Fila</th>
                  <th className={thCls}>Producto</th>
                  <th className={thCls}>Acción</th>
                  <th className={thCls}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gris-500">
                      No hay filas en este filtro.
                    </td>
                  </tr>
                ) : (
                  filas.map((f) => (
                    <tr key={f.fila} className={f.accion === "error" ? "bg-red-50/40" : ""}>
                      <td className={`${tdCls} tabular text-gris-500`}>{f.fila}</td>
                      <td className={tdCls}>
                        <span className="font-medium text-gris-900">{f.nombre}</span>
                        <span className="block font-mono text-xs text-gris-500">{f.codigo ?? "código automático"}</span>
                      </td>
                      <td className={tdCls}>
                        {f.accion === "crear" && <Etiqueta tono="verde">Nuevo</Etiqueta>}
                        {f.accion === "actualizar" && <Etiqueta tono="azul">Actualizar</Etiqueta>}
                        {f.accion === "error" && <Etiqueta tono="rojo">Error</Etiqueta>}
                      </td>
                      <td className={`${tdCls} text-xs`}>
                        {f.errores.map((e, i) => (
                          <p key={i} className="text-red-700">
                            {e}
                          </p>
                        ))}
                        {f.stockDespues !== undefined && (
                          <p className="text-amber-800">
                            Stock {cantidad(f.stockAntes)} → {cantidad(f.stockDespues)}
                          </p>
                        )}
                        {f.avisos.map((a, i) => (
                          <p key={i} className="text-gris-500">
                            {a}
                          </p>
                        ))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}
