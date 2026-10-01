/**
 * A conta da tendência, sem tela (099 T-2).
 *
 * Vive num módulo próprio, sem JSX, por duas razões: a lógica é a parte que
 * tem como errar — e um ficheiro com JSX não é transformado pelo jest da raiz,
 * então a conta ficaria sem teste justamente por morar junto do desenho.
 */
export interface PontoDaSerie {
  /** `YYYY-MM-DD`. */
  dia: string;
  /** `null` quando não houve leitura nesse dia — e isso é informação. */
  valor: number | null;
}

/**
 * A variação do período, ou `null` quando não há dias que cheguem.
 *
 * Compara a média do terço mais recente com a do terço mais antigo, em vez de
 * duas leituras soltas: um dia mau de sono não é uma tendência. Exportada
 * porque é a parte que o teste exerce.
 */
export function variacaoDoPeriodo(
  pontos: PontoDaSerie[]
): { delta: number; recente: number; antigo: number; diasComparados: number } | null {
  const comValor = pontos.filter((p) => p.valor !== null) as Array<{ dia: string; valor: number }>;
  if (comValor.length < 6) return null;

  const tamanho = Math.max(2, Math.floor(comValor.length / 3));
  const antigos = comValor.slice(0, tamanho);
  const recentes = comValor.slice(-tamanho);
  const media = (xs: Array<{ valor: number }>) => xs.reduce((s, x) => s + x.valor, 0) / xs.length;

  const antigo = media(antigos);
  const recente = media(recentes);
  return { delta: recente - antigo, recente, antigo, diasComparados: tamanho };
}
