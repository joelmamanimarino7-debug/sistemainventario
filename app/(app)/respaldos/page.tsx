import type { Metadata } from "next";
import { BotonRespaldarAhora, BotonRestaurar, FormAjustesRespaldo, TarjetaRestaurarArchivo } from "@/components/Respaldos";
import { btnChico, btnSecundario, tdCls, thCls } from "@/components/estilos";
import { Aviso, Dato, Encabezado, Etiqueta, Tarjeta, Vacio } from "@/components/ui";
import { exigirAdmin } from "@/lib/auth";
import { fecha } from "@/lib/format";
import {
  ajustesRespaldo,
  carpetaPorDefecto,
  esCarpetaLocal,
  estadoRespaldos,
  listarRespaldos,
  TIPOS_RESPALDO,
  ubicacionesSugeridas,
} from "@/lib/respaldos";

export const metadata: Metadata = { title: "Respaldos" };

function tamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

const TONO = { auto: "verde", manual: "gris", cierre: "acento", previo: "ambar" } as const;

export default async function RespaldosPage() {
  await exigirAdmin();
  const ajustes = ajustesRespaldo();
  const { ultimo, error } = estadoRespaldos();
  const lista = listarRespaldos();
  const local = esCarpetaLocal(ajustes.carpeta);

  return (
    <>
      <Encabezado
        titulo="Respaldos"
        descripcion="Copias de seguridad de todos los datos y fotos, en un archivo .zip. Con un respaldo puedes recuperar el sistema si la computadora se daña o se pierde."
      />

      {error && (
        <div className="mb-4">
          <Aviso tipo="error">El último intento de respaldo falló: {error}</Aviso>
        </div>
      )}
      {local && (
        <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Los respaldos se están guardando en esta misma computadora.</p>
          <p className="mt-0.5">
            Si se daña, se pierde o se la roban, se pierden también los respaldos. Elige abajo una carpeta de iCloud Drive,
            Google Drive o un disco USB, o descarga un respaldo de vez en cuando y guárdalo en otro lugar.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Tarjeta titulo="Estado" className="self-start">
          <dl className="grid grid-cols-2 gap-4 p-4">
            <Dato etiqueta="Último respaldo">{ultimo ? fecha(ultimo) : <span className="text-red-700">Nunca</span>}</Dato>
            <Dato etiqueta="Automático">{ajustes.automatico ? "Diario y al cerrar caja" : "Desactivado"}</Dato>
            <div className="col-span-2">
              <Dato etiqueta="Carpeta">
                <span className="break-all font-mono text-xs">{ajustes.carpeta}</span>
              </Dato>
            </div>
            <Dato etiqueta="Se conservan">Los últimos {ajustes.conservar}</Dato>
            <Dato etiqueta="Respaldos guardados">{lista.length}</Dato>
          </dl>
          <div className="border-t border-tierra-100 p-4">
            <BotonRespaldarAhora />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Ajustes" className="self-start">
          <FormAjustesRespaldo
            carpeta={ajustes.carpeta}
            porDefecto={ajustes.porDefecto}
            carpetaPorDefecto={carpetaPorDefecto()}
            conservar={ajustes.conservar}
            automatico={ajustes.automatico}
            sugerencias={ubicacionesSugeridas()}
          />
        </Tarjeta>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Tarjeta titulo="Respaldos guardados" className="self-start overflow-hidden">
          {lista.length === 0 ? (
            <Vacio titulo="Todavía no hay respaldos" texto="Crea el primero con «Respaldar ahora»." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thCls}>Fecha</th>
                    <th className={thCls}>Tipo</th>
                    <th className={`${thCls} text-right`}>Tamaño</th>
                    <th className={`${thCls} text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.archivo}>
                      <td className={`${tdCls} whitespace-nowrap`}>{fecha(r.fecha)}</td>
                      <td className={tdCls}>
                        <Etiqueta tono={TONO[r.tipo]}>{TIPOS_RESPALDO[r.tipo]}</Etiqueta>
                      </td>
                      <td className={`${tdCls} tabular whitespace-nowrap text-right text-tierra-600`}>{tamano(r.bytes)}</td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-start justify-end gap-1.5">
                          <a href={`/api/respaldos/${encodeURIComponent(r.archivo)}`} className={`${btnSecundario} ${btnChico}`} download>
                            Descargar
                          </a>
                          <BotonRestaurar archivo={r.archivo} fecha={fecha(r.fecha)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <div className="space-y-6 self-start">
          <TarjetaRestaurarArchivo />
          <Tarjeta titulo="¿Qué incluye un respaldo?">
            <ul className="list-disc space-y-1 py-4 pl-9 pr-4 text-sm text-tierra-700">
              <li>Productos, catálogos, stock y movimientos.</li>
              <li>Ventas, devoluciones, entradas, ajustes y cierres de caja.</li>
              <li>Usuarios (con sus contraseñas cifradas) y configuración del negocio.</li>
              <li>Las fotos de los productos.</li>
            </ul>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
