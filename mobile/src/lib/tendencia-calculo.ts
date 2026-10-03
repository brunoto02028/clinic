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

/**
 * **Quantos dias sem leitura há para contar** (120 T-11).
 *
 * O Bruno, 03/10/2026, sobre os *"27 dias sem leitura"* que a tela lhe mostrava:
 *
 * > *"é irrelevante, porque faz dois dias que chegou o relógio e eu comecei a
 * > fazer as medições. O mais importante é estar sincronizado com o dia atual e
 * > hora atual."*
 *
 * Para um paciente novo é pior: no dia em que liga o aparelho, a janela de
 * trinta dias tem vinte e nove buracos, e a tela abre com uma frase que se lê
 * como avaria. **Um dia anterior à ligação não é ausência de dado — é ausência
 * de aparelho.**
 *
 * Vive aqui, e não no JSX, pela razão de sempre nesta base: uma regra provada
 * dentro da função e desfeita no desenho passa em todos os testes e mente na
 * tela.
 *
 * `desde` é o dia (`YYYY-MM-DD`) em que a ligação passou a existir. Sem ele
 * conta-se tudo, que é o comportamento que havia.
 */
export function diasSemLeitura(pontos: PontoDaSerie[], desde?: string | null): number {
  return pontos.filter((p) => p.valor === null && (!desde || p.dia >= desde)).length;
}
