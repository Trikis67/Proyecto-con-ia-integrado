/** Costo estimado en USD de una llamada a Claude Haiku 5.5, que tiene dos tarifas según el largo del prompt. */
export function costoHaiku(tokensEntrada: number, tokensSalida: number) {
  const [entrada, salida] = tokensEntrada <= 100_000 ? [0.1, 0.5] : [0.5, 2.5];
  return (tokensEntrada * entrada + tokensSalida * salida) / 1_000_000;
}
