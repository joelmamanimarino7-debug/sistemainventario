// Clases reutilizables para mantener una apariencia uniforme.

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

export const btnPrimario = `${btnBase} bg-teal-700 text-white hover:bg-teal-800`;
export const btnSecundario = `${btnBase} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50`;
export const btnPeligro = `${btnBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const btnFantasma = `${btnBase} text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900`;
export const btnChico = "!px-2.5 !py-1 !text-xs";

export const inputCls =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-xs focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:bg-zinc-100";

export const labelCls = "mb-1 block text-sm font-medium text-zinc-700";

export const tablaCls = "w-full text-left text-sm";
export const thCls = "px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 bg-zinc-50 border-b border-zinc-200";
export const tdCls = "px-4 py-3 border-b border-zinc-100 align-middle";
