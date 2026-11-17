import { barras, esCodificable } from "@/lib/code128";

/**
 * Código de barras Code 128 en SVG (nítido al imprimir). Sirve en servidor y en cliente.
 * `alto` en unidades CSS (px o mm); el ancho se ajusta solo con preserveAspectRatio.
 */
export function CodigoBarras({
  valor,
  alto = 48,
  conTexto = true,
  className = "",
}: {
  valor: string;
  alto?: number | string;
  conTexto?: boolean;
  className?: string;
}) {
  if (!esCodificable(valor)) {
    return <span className={`text-xs text-red-600 ${className}`}>Código no imprimible: {valor}</span>;
  }
  const { rects, total } = barras(valor);
  const margen = 10; // zona en blanco a cada lado (mínimo 10 módulos)
  return (
    <span className={`inline-flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${total + margen * 2} 50`}
        preserveAspectRatio="none"
        style={{ height: alto, width: "100%" }}
        role="img"
        aria-label={`Código de barras ${valor}`}
        shapeRendering="crispEdges"
      >
        <rect width={total + margen * 2} height="50" fill="#fff" />
        {rects.map((r, i) => (
          <rect key={i} x={r.x + margen} y="0" width={r.w} height="50" fill="#000" />
        ))}
      </svg>
      {conTexto && <span className="mt-0.5 font-mono text-[0.7em] leading-none tracking-wider">{valor}</span>}
    </span>
  );
}
