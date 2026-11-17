"use client";

import { useEffect, useState, useTransition } from "react";
import { todosParaEtiquetas } from "@/app/actions/etiquetas";
import type { ProductoEtiqueta } from "@/lib/data/productos";
import { FORMATOS_ETIQUETAS, valorCodigoBarras } from "@/lib/etiquetas";
import { cantidad, dinero } from "@/lib/format";
import { BuscadorProductos } from "./BuscadorProductos";
import { CodigoBarras } from "./CodigoBarras";
import { btnFantasma, btnPrimario, btnSecundario, inputCls, tdCls, thCls } from "./estilos";
import { Campo, Tarjeta, Vacio } from "./ui";

type Item = { producto: ProductoEtiqueta; copias: string };
const CLAVE_FORMATO = "inventario:formato-etiquetas";

export function Etiquetas({ inicial }: { inicial: { producto: ProductoEtiqueta; copias: number }[] }) {
  const [items, setItems] = useState<Item[]>(inicial.map((i) => ({ producto: i.producto, copias: String(i.copias) })));
  const [formatoId, setFormatoId] = useState(FORMATOS_ETIQUETAS[0].id);
  const [conPrecio, setConPrecio] = useState(true);
  const [conNombre, setConNombre] = useState(true);
  const [saltar, setSaltar] = useState("0");
  const [cargando, startTransition] = useTransition();

  // Recordar el formato elegido en este navegador.
  useEffect(() => {
    try {
      const f = localStorage.getItem(CLAVE_FORMATO);
      if (f && FORMATOS_ETIQUETAS.some((x) => x.id === f)) setFormatoId(f);
    } catch {
      /* sin almacenamiento */
    }
  }, []);
  function elegirFormato(id: string) {
    setFormatoId(id);
    try {
      localStorage.setItem(CLAVE_FORMATO, id);
    } catch {
      /* no pasa nada */
    }
  }

  const formato = FORMATOS_ETIQUETAS.find((f) => f.id === formatoId) ?? FORMATOS_ETIQUETAS[0];
  const porHoja = formato.columnas * formato.filas;
  const vacias = Math.min(Math.max(0, Math.trunc(Number(saltar) || 0)), porHoja - 1);

  function agregar(p: ProductoEtiqueta, copias = 1) {
    setItems((xs) => {
      const i = xs.findIndex((x) => x.producto.id === p.id);
      if (i >= 0) return xs.map((x, j) => (j === i ? { ...x, copias: String((Number(x.copias) || 0) + copias) } : x));
      return [...xs, { producto: p, copias: String(copias) }];
    });
  }
  function agregarTodos(segunStock: boolean) {
    startTransition(async () => {
      const todos = await todosParaEtiquetas();
      setItems(todos.map((p) => ({ producto: p, copias: String(segunStock ? Math.max(0, Math.ceil(p.stock)) : 1) })).filter((x) => Number(x.copias) > 0));
    });
  }

  // Lista plana de etiquetas (con huecos al inicio para hojas ya usadas) y división en hojas.
  const etiquetas: (ProductoEtiqueta | null)[] = [
    ...Array<null>(vacias).fill(null),
    ...items.flatMap((x) => Array<ProductoEtiqueta>(Math.min(500, Math.max(0, Math.trunc(Number(x.copias) || 0)))).fill(x.producto)),
  ];
  const total = etiquetas.length - vacias;
  const hojas: (ProductoEtiqueta | null)[][] = [];
  for (let i = 0; i < etiquetas.length; i += porHoja) hojas.push(etiquetas.slice(i, i + porHoja));

  return (
    <>
      {/* Al imprimir solo se ven las hojas, sin márgenes del navegador. */}
      <style>{`
        @media print {
          @page { size: ${formato.pagina}; margin: 0; }
          body * { visibility: hidden; }
          .hojas-etiquetas, .hojas-etiquetas * { visibility: visible; }
          .hojas-etiquetas { position: absolute; left: 0; top: 0; gap: 0 !important; padding: 0 !important; background: none !important; }
          .hoja-etiquetas { box-shadow: none !important; outline: none !important; break-after: page; }
          .etiqueta { outline: none !important; }
        }
      `}</style>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] print:hidden">
        <div className="space-y-4">
          <BuscadorProductos onElegir={(p) => agregar(p)} precio="venta" placeholder="Buscar producto para agregar etiquetas…" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => agregarTodos(false)} disabled={cargando} className={btnSecundario}>
              Todos los productos (1 c/u)
            </button>
            <button onClick={() => agregarTodos(true)} disabled={cargando} className={btnSecundario}>
              Todos, una por unidad en stock
            </button>
            {items.length > 0 && (
              <button onClick={() => setItems([])} className={btnFantasma}>
                Vaciar lista
              </button>
            )}
          </div>
          <Tarjeta className="overflow-hidden">
            {items.length === 0 ? (
              <Vacio titulo="Agrega productos" texto="Búscalos arriba o usa «Todos los productos»." />
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0">
                    <tr>
                      <th className={thCls}>Producto</th>
                      <th className={thCls}>Código de barras</th>
                      <th className={`${thCls} w-28 text-right`}>Etiquetas</th>
                      <th className={thCls}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((x, i) => (
                      <tr key={x.producto.id}>
                        <td className={tdCls}>
                          <p className="font-medium text-zinc-900">{x.producto.nombre}</p>
                          <p className="text-xs text-zinc-500">
                            {dinero(x.producto.precio_venta)} · stock {cantidad(x.producto.stock)}
                          </p>
                        </td>
                        <td className={`${tdCls} font-mono text-xs text-zinc-600`}>{valorCodigoBarras(x.producto)}</td>
                        <td className={tdCls}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={x.copias}
                            onChange={(e) => setItems((xs) => xs.map((y, j) => (j === i ? { ...y, copias: e.target.value } : y)))}
                            className={`${inputCls} tabular min-w-16 text-right`}
                            aria-label={`Etiquetas de ${x.producto.nombre}`}
                          />
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <button onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))} className={btnFantasma} aria-label={`Quitar ${x.producto.nombre}`}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>
        </div>

        <Tarjeta titulo="Hoja" className="self-start">
          <div className="space-y-4 p-4">
            <Campo label="Formato de la hoja" htmlFor="formato" ayuda="Revisa la medida en el paquete de tus etiquetas.">
              <select id="formato" value={formatoId} onChange={(e) => elegirFormato(e.target.value)} className={inputCls}>
                {FORMATOS_ETIQUETAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Saltar etiquetas ya usadas" htmlFor="saltar" ayuda="Para aprovechar una hoja usada: cuántas etiquetas del inicio faltan.">
              <input id="saltar" type="number" min="0" max={porHoja - 1} value={saltar} onChange={(e) => setSaltar(e.target.value)} className={`${inputCls} tabular`} />
            </Campo>
            <div className="space-y-1.5 text-sm text-zinc-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={conNombre} onChange={(e) => setConNombre(e.target.checked)} className="accent-teal-700" />
                Mostrar el nombre
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={conPrecio} onChange={(e) => setConPrecio(e.target.checked)} className="accent-teal-700" />
                Mostrar el precio
              </label>
            </div>
            <p className="border-t border-zinc-100 pt-3 text-sm text-zinc-600">
              {total} {total === 1 ? "etiqueta" : "etiquetas"} · {hojas.length} {hojas.length === 1 ? "hoja" : "hojas"}
            </p>
            <button onClick={() => window.print()} disabled={total === 0} className={`${btnPrimario} w-full !py-2.5`}>
              🖨 Imprimir
            </button>
            <p className="text-xs text-zinc-500">
              En la ventana de impresión elige escala «100 %» (o «Tamaño real») y sin márgenes. Prueba primero en una hoja común.
            </p>
          </div>
        </Tarjeta>
      </div>

      {total > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500 print:hidden">Vista previa</h2>
          <div className="hojas-etiquetas flex flex-col items-start gap-6 overflow-x-auto rounded-xl bg-zinc-200/60 p-4">
            {hojas.map((hoja, h) => (
              <div
                key={h}
                className="hoja-etiquetas relative shrink-0 bg-white shadow-md"
                style={{ width: `${formato.anchoPagina}mm`, height: `${formato.altoPagina}mm` }}
              >
                {hoja.map((p, k) => {
                  const col = k % formato.columnas;
                  const fila = Math.floor(k / formato.columnas);
                  return (
                    <div
                      key={k}
                      className="etiqueta absolute flex flex-col items-center justify-center overflow-hidden text-center text-black outline outline-1 outline-dashed outline-zinc-200"
                      style={{
                        left: `${formato.margenIzq + col * (formato.ancho + formato.espacioX)}mm`,
                        top: `${formato.margenSup + fila * (formato.alto + formato.espacioY)}mm`,
                        width: `${formato.ancho}mm`,
                        height: `${formato.alto}mm`,
                        padding: "1.5mm 2.5mm",
                      }}
                    >
                      {p && (
                        <>
                          {conNombre && (
                            <p className="line-clamp-2 w-full font-medium leading-tight" style={{ fontSize: formato.alto < 30 ? "7pt" : "8pt" }}>
                              {p.nombre}
                            </p>
                          )}
                          {conPrecio && (
                            <p className="font-bold leading-tight" style={{ fontSize: formato.alto < 30 ? "9pt" : "11pt" }}>
                              {dinero(p.precio_venta)}
                            </p>
                          )}
                          <CodigoBarras
                            valor={valorCodigoBarras(p)}
                            alto={`${Math.max(7, formato.alto * (conNombre || conPrecio ? 0.36 : 0.6))}mm`}
                            className="mt-0.5 w-full"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
