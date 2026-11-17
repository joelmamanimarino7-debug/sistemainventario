// Generador de códigos de barras Code 128 (sin librerías externas).
// Usa el juego B (letras, números y signos) y cambia al juego C (pares de dígitos) en tramos
// numéricos largos para que el código salga más corto. Cualquier lector de códigos lo entiende.

// Anchos de barra/espacio de cada símbolo (0–106). Cada uno suma 11 módulos; el de parada, 13.
const PATRONES = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const INICIO_B = 104;
const INICIO_C = 105;
const CAMBIO_A_B = 100;
const CAMBIO_A_C = 99;
const PARADA = 106;

/** ¿Se puede codificar? Solo caracteres ASCII imprimibles (espacio a ~). */
export function esCodificable(texto: string): boolean {
  return texto.length > 0 && texto.length <= 48 && /^[\x20-\x7E]+$/.test(texto);
}

/** Cantidad de dígitos seguidos desde la posición i. */
function digitosDesde(texto: string, i: number): number {
  let n = 0;
  while (i + n < texto.length && texto.charCodeAt(i + n) >= 48 && texto.charCodeAt(i + n) <= 57) n++;
  return n;
}

/** Convierte el texto en la lista de símbolos Code 128 (con inicio, control y parada). */
export function simbolos(texto: string): number[] {
  if (!esCodificable(texto)) throw new Error("El código solo puede tener letras sin tilde, números y signos simples.");
  const s: number[] = [];
  let i = 0;
  // Empieza en C si el texto arranca con 4 o más dígitos.
  let juego: "B" | "C" = digitosDesde(texto, 0) >= 4 ? "C" : "B";
  s.push(juego === "C" ? INICIO_C : INICIO_B);

  while (i < texto.length) {
    const dig = digitosDesde(texto, i);
    if (juego === "C") {
      if (dig >= 2) {
        s.push(Number(texto.slice(i, i + 2)));
        i += 2;
        continue;
      }
      s.push(CAMBIO_A_B);
      juego = "B";
    }
    // Juego B: conviene pasar a C si vienen 4+ dígitos (6+ en medio del texto) en cantidad par.
    const alFinal = i + dig === texto.length;
    if (dig >= (alFinal ? 4 : 6) && dig % 2 === 0) {
      s.push(CAMBIO_A_C);
      juego = "C";
      continue;
    }
    s.push(texto.charCodeAt(i) - 32);
    i++;
  }

  // Dígito de control: (inicio + Σ símbolo × posición) módulo 103.
  let suma = s[0];
  for (let k = 1; k < s.length; k++) suma += s[k] * k;
  s.push(suma % 103, PARADA);
  return s;
}

/** Anchos alternados barra/espacio (en módulos), empezando por una barra. */
export function anchos(texto: string): number[] {
  return simbolos(texto).flatMap((v) => PATRONES[v].split("").map(Number));
}

/** Barras como rectángulos {x, w} en módulos, más el ancho total (sin márgenes). */
export function barras(texto: string): { rects: { x: number; w: number }[]; total: number } {
  const rects: { x: number; w: number }[] = [];
  let x = 0;
  anchos(texto).forEach((w, k) => {
    if (k % 2 === 0) rects.push({ x, w });
    x += w;
  });
  return { rects, total: x };
}
