import type { Lang } from "./i18n";

/**
 * O que você é da pessoa que você cuida (095 T-3).
 *
 * ## Por que existe aqui, e não só no servidor
 *
 * A validação que vale é a de `lib/managed-patients.ts`: é ela que grava. Esta
 * cópia existe porque a tela precisa **desenhar** as opções, e buscar uma lista
 * de doze itens fixos por rede seria pedir permissão para mostrar um formulário.
 *
 * As duas têm de andar juntas, e um teste falha se divergirem — o mesmo arranjo
 * que os termos usam entre a página, a rota e o app. Se você acrescentar uma
 * opção aqui, acrescente lá; o teste diz isso antes de qualquer pessoa ver.
 *
 * ## Por que é lista, e não campo livre
 *
 * Porque o campo era livre e opcional, e o que se ganhava era "resp", "mae",
 * "Mãe " — nenhum deles responde, meses depois, a pergunta que importa: **quem
 * respondeu por esta criança**.
 */
export const RELACOES = [
  "MOTHER",
  "FATHER",
  "STEPMOTHER",
  "STEPFATHER",
  "GRANDMOTHER",
  "GRANDFATHER",
  "SISTER",
  "BROTHER",
  "AUNT",
  "UNCLE",
  "LEGAL_GUARDIAN",
  "OTHER",
] as const;

export type Relacao = (typeof RELACOES)[number];

const ROTULO: Record<Relacao, { en: string; pt: string }> = {
  MOTHER: { en: "Mother", pt: "Mãe" },
  FATHER: { en: "Father", pt: "Pai" },
  STEPMOTHER: { en: "Stepmother", pt: "Madrasta" },
  STEPFATHER: { en: "Stepfather", pt: "Padrasto" },
  GRANDMOTHER: { en: "Grandmother", pt: "Avó" },
  GRANDFATHER: { en: "Grandfather", pt: "Avô" },
  SISTER: { en: "Sister", pt: "Irmã" },
  BROTHER: { en: "Brother", pt: "Irmão" },
  AUNT: { en: "Aunt", pt: "Tia" },
  UNCLE: { en: "Uncle", pt: "Tio" },
  LEGAL_GUARDIAN: { en: "Legal guardian", pt: "Guardiã ou guardião legal" },
  OTHER: { en: "Other", pt: "Outro" },
};

export function rotuloDaRelacao(relacao: string | null | undefined, lang: Lang): string | null {
  if (!relacao) return null;
  const r = ROTULO[relacao as Relacao];
  // Valor antigo, de quando o campo era livre: mostra o que a pessoa escreveu,
  // em vez de esconder por não reconhecer.
  return r ? r[lang === "pt" ? "pt" : "en"] : relacao;
}

/** Como a relação se lê, já com a descrição quando é "outro". */
export function relacaoPorExtenso(
  relacao: string | null | undefined,
  outro: string | null | undefined,
  lang: Lang
): string | null {
  if (!relacao) return null;
  if (relacao === "OTHER") return outro || rotuloDaRelacao("OTHER", lang);
  return rotuloDaRelacao(relacao, lang);
}
