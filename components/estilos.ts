// Clases reutilizables para mantener una apariencia uniforme (colores en app/globals.css).

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-500";

export const btnPrimario = `${btnBase} bg-acento-600 text-white shadow-sm shadow-acento-900/15 hover:bg-acento-700`;
export const btnSecundario = `${btnBase} border border-gris-300 bg-papel text-gris-800 hover:border-gris-400 hover:bg-gris-50`;
export const btnPeligro = `${btnBase} border border-red-200 bg-papel text-red-700 hover:bg-red-50`;
export const btnFantasma = `${btnBase} text-gris-600 hover:bg-gris-100 hover:text-gris-900`;
export const btnChico = "!px-2.5 !py-1 !text-xs";

export const inputCls =
  "block w-full rounded-lg border border-gris-300 bg-papel px-3 py-2 text-sm text-gris-900 placeholder:text-gris-400 focus:border-acento-500 focus:outline-none focus:ring-2 focus:ring-acento-500/20 disabled:bg-gris-100";

export const labelCls = "mb-1 block text-sm font-medium text-gris-700";

export const tablaCls = "w-full text-left text-sm";
export const thCls =
  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-gris-500 bg-gris-50 border-b border-gris-200";
export const tdCls = "px-4 py-3 border-b border-gris-100 align-middle";
