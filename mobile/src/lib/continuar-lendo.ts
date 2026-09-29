// Relativo: o `@/` significa coisas diferentes no aplicativo e na web, e o
// transformador o resolve antes de qualquer configuração de teste ver.
import type { EduContent } from "../api/education";

/**
 * O que oferecer a quem terminou de ler (107 T-2).
 *
 * O Bruno: *"ao final de cada artigo, dá pra colocar atalhos para outros, algo
 * assim?"*
 *
 * ## Por que não é "relacionado"
 *
 * A clínica tem poucas dezenas de textos. Recomendar por semelhança de conteúdo
 * exigiria saber o que se parece com o quê, e com esse volume a conta erra mais
 * do que acerta. Num texto clínico, sugestão errada não é só irrelevante: é
 * estranha — alguém que acabou de ler sobre dor lombar recebendo túnel do carpo
 * pensa que o app entendeu algo sobre ele.
 *
 * A relação que **existe de verdade** é a categoria. É essa que se usa, e o
 * título na tela diz qual das duas coisas está sendo mostrada, em vez de
 * prometer parentesco que não foi medido.
 */

export type MotivoDaSugestao = "mesma-categoria" | "recentes";

export interface ContinuarLendo {
  itens: EduContent[];
  motivo: MotivoDaSugestao;
}

/**
 * Devolve até `limite` sugestões, ou uma lista vazia.
 *
 * Lista vazia quer dizer **não desenhe a seção**. Uma seção "Continue lendo"
 * sem nada dentro é pior que seção nenhuma: promete e não entrega.
 */
export function continuarLendo(
  todos: EduContent[] | null | undefined,
  atualId: string,
  categoriaId?: string | null,
  limite = 3
): ContinuarLendo {
  const candidatos = (todos ?? []).filter((c) => c && c.id && c.id !== atualId);

  if (categoriaId) {
    const irmaos = candidatos.filter((c) => c.category?.id === categoriaId);
    if (irmaos.length > 0) {
      return { itens: irmaos.slice(0, limite), motivo: "mesma-categoria" };
    }
  }

  // Sem categoria, ou único na dele: os mais recentes. A lista já chega na
  // ordem que o servidor escolheu; reordenar aqui seria inventar um critério.
  return { itens: candidatos.slice(0, limite), motivo: "recentes" };
}

/**
 * O título diz qual relação está sendo mostrada.
 *
 * "More in this topic" quando há parentesco real; "More to read" quando é só o
 * que existe. A diferença importa: a primeira afirma algo, a segunda não.
 */
export const TEXTO_CONTINUAR = {
  "mesma-categoria": { en: "More in this topic", pt: "Mais sobre este tema" },
  recentes: { en: "More to read", pt: "Mais para ler" },
  voltar: { en: "See all materials", pt: "Ver todos os materiais" },
} as const;
