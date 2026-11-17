// Clases reutilizables para mantener una apariencia uniforme (colores en app/globals.css).

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-500";

export const btnPrimario = `${btnBase} bg-acento-600 text-white shadow-sm shadow-acento-900/15 hover:bg-acento-700`;
export const btnSecundario = `${btnBase} border border-tierra-300 bg-papel text-tierra-800 hover:border-tierra-400 hover:bg-tierra-50`;
export const btnPeligro = `${btnBase} border border-red-200 bg-papel text-red-700 hover:bg-red-50`;
export const btnFantasma = `${btnBase} text-tierra-600 hover:bg-tierra-100 hover:text-tierra-900`;
export const btnChico = "!px-2.5 !py-1 !text-xs";

export const inputCls =
  "block w-full rounded-lg border border-tierra-300 bg-papel px-3 py-2 text-sm text-tierra-900 placeholder:text-tierra-400 focus:border-acento-500 focus:outline-none focus:ring-2 focus:ring-acento-500/20 disabled:bg-tierra-100";

export const labelCls = "mb-1 block text-sm font-medium text-tierra-700";

export const tablaCls = "w-full text-left text-sm";
export const thCls =
  "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-tierra-500 bg-tierra-50 border-b border-tierra-200";
export const tdCls = "px-4 py-3 border-b border-tierra-100 align-middle";
