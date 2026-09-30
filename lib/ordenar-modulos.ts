/**
 * A ordem alfabética das listas de permissão (110 T-5).
 *
 * Os grupos continuam na ordem de hoje, que tem intenção — principal primeiro,
 * depois clínico, bem-estar, conteúdo e as áreas do app. O que muda é achar um
 * módulo pelo nome sem varrer a lista inteira.
 *
 * Mora aqui, e não dentro de cada tela, porque são **duas** telas com a mesma
 * lista: a do paciente e a do padrão para pacientes novos. Duas cópias da
 * mesma regra são duas ordens diferentes em duas semanas.
 */

export interface TemRotulo {
  label: string;
  labelPt: string;
}

/**
 * Ordena pelo rótulo **da língua exibida**.
 *
 * Em português a lista sai em ordem portuguesa, e não na inglesa traduzida:
 * *Conquistas* vem antes de *Marketplace*, embora *Achievements* também viesse.
 * A diferença aparece em *Avaliação* × *Devices*, que trocam de lugar.
 *
 * `localeCompare` e não `sort()` cru: o cru compara por código, então toda
 * maiúscula vem antes de toda minúscula — e acento vai para o fim da lista,
 * depois do `z`.
 *
 * @param rotulo como a tela resolve o par EN/PT — ela já tem essa função, e
 *   passá-la evita esta lib ter de saber de idioma, de `relabel` e do jargão da
 *   casa.
 */
export function ordenarPorNome<T extends TemRotulo>(
  itens: T[],
  rotulo: (en: string, pt: string) => string,
  emPortugues: boolean
): T[] {
  const locale = emPortugues ? "pt-BR" : "en-GB";
  return [...itens].sort((a, b) =>
    rotulo(a.label, a.labelPt).localeCompare(rotulo(b.label, b.labelPt), locale, {
      // `base` ignora acento e caixa na comparação: "Área" e "area" ficam lado
      // a lado, que é como alguém procurando com os olhos espera.
      sensitivity: "base",
    })
  );
}
