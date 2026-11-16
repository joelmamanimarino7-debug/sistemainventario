import { Etiqueta } from "./ui";

export function EstadoStock({ stock, minimo }: { stock: number; minimo: number }) {
  if (stock <= 0) return <Etiqueta tono="rojo">Agotado</Etiqueta>;
  if (stock <= minimo) return <Etiqueta tono="ambar">Stock bajo</Etiqueta>;
  return null;
}
