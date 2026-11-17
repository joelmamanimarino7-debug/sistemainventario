import Link from "next/link";
import { btnChico, btnSecundario } from "./estilos";

/** Paginación simple que conserva los filtros actuales de la URL. */
export function Paginacion({
  ruta,
  params,
  pagina,
  total,
  porPagina,
}: {
  ruta: string;
  params: Record<string, string | undefined>;
  pagina: number;
  total: number;
  porPagina: number;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;

  const url = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("pagina", String(p));
    return `${ruta}?${sp.toString()}`;
  };

  return (
    <div className="flex items-center justify-between gap-2 border-t border-tierra-100 px-4 py-3 text-sm text-tierra-600">
      <span>
        Página {pagina} de {paginas}
      </span>
      <div className="flex gap-2">
        {pagina > 1 && (
          <Link href={url(pagina - 1)} className={`${btnSecundario} ${btnChico}`}>
            ← Anterior
          </Link>
        )}
        {pagina < paginas && (
          <Link href={url(pagina + 1)} className={`${btnSecundario} ${btnChico}`}>
            Siguiente →
          </Link>
        )}
      </div>
    </div>
  );
}
