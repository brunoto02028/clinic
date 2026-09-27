import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

/**
 * Quem alguém cuida — e que, na clínica, é paciente de verdade (091 T-7).
 *
 * O Bruno, 27/09: *"se o paciente é uma criança, a mãe tem que fazer o
 * cadastro e colocar a criança como uma dependente. E é a criança que está
 * fazendo o tratamento de reabilitação."*
 *
 * ## Por que a criança é um `User`
 *
 * A primeira versão disto era uma tabela `Dependent` separada, e servia para o
 * laboratório — lá o dependente é só o sujeito de um pedido: nome e data de
 * nascimento numa amostra. Na clínica ele é **a paciente**, com consulta,
 * protocolo, exercício prescrito, nota clínica e evolução.
 *
 * Há 144 relações 1-N penduradas em `User`, 45 delas claramente clínicas.
 * Apontá-las para uma tabela separada seria duplicar o sistema inteiro. Então
 * a criança é um `User` com `role: PATIENT`, e tudo funciona sem mudar nada.
 *
 * ## E como se garante que ela não entra
 *
 * Três camadas, porque esta é a promessa que não pode falhar:
 *
 * 1. **Senha nula.** Não há o que conferir.
 * 2. **E-mail sintético em domínio `.invalid`**, reservado pela RFC 2606:
 *    nenhum servidor do mundo entrega para ele. Não há recuperação de senha,
 *    nem link de convite que chegue.
 * 3. **`validateCredentials` recusa `managedById` antes de tudo.** É a camada
 *    que não depende de ninguém lembrar das outras duas.
 *
 * O que chega ao telefone chega ao telefone de quem responde pela criança. Ela
 * não tem aparelho no sistema, e é de propósito.
 */

/**
 * Um endereço que existe para satisfazer a coluna única, e para mais nada.
 *
 * `.invalid` é reservado pela RFC 2606 exatamente para isto. Se algum dia um
 * envio for tentado para um destes, ele falha — e falhar é o comportamento
 * certo: mensagem de paciente gerido vai para quem cuida dele, nunca para ele.
 */
export function emailSintetico(): string {
  return `managed-${randomUUID()}@no-mail.invalid`;
}

/** Este endereço é sintético? Usado para nunca tentar entregar nada nele. */
export function ehEmailSintetico(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith("@no-mail.invalid");
}

/** O que a pessoa digitou, antes de qualquer confiança. */
export interface PessoaBruta {
  firstName?: unknown;
  lastName?: unknown;
  dateOfBirth?: unknown;
  sex?: unknown;
  relationship?: unknown;
  relationshipOther?: unknown;
}

export interface PessoaLimpa {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string | null;
  relationship: string | null;
  /** A descrição, quando `relationship` é `OTHER`. */
  relationshipOther: string | null;
}

const MAX_NOME = 80;
const MAX_RELACAO = 40;

/**
 * O que você é da pessoa que você cuida (095 T-3).
 *
 * ## Por que é obrigatório, e por que é lista
 *
 * Palavras do Bruno: *"precisa ser obrigado a colocar a relação com a criança…
 * pois a responsabilidade é do maior responsável pela criança"*. Quem consente
 * pelo tratamento de um menor é o adulto — os termos 1.3 já dizem isso —, mas
 * até aqui **não se registrava em que qualidade** ele consentiu. Numa dúvida
 * futura sobre quem autorizou o atendimento de uma criança, é essa linha que
 * faz falta.
 *
 * Lista fechada porque campo aberto vira "resp", "mae", "Mãe " — e nenhum
 * deles responde a pergunta depois. O campo era livre e opcional até hoje.
 *
 * ## Por que não virou enum do banco
 *
 * A coluna já existe como texto e **já tem valores livres gravados**. Trocar
 * para enum passaria por um `db push` que o deploy aplica e cuja falha ele
 * engole — o resultado seria produção verde com a coluna quebrada. A garantia
 * aqui é a mesma, porque este arquivo é o único lugar que escreve.
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

/** Como cada uma se lê, nas duas línguas. */
export const RELACAO_ROTULO: Record<Relacao, { en: string; pt: string }> = {
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

/** O parentesco como uma pessoa lê — com a descrição, quando é "outro". */
export function relacaoPorExtenso(
  relacao: string | null | undefined,
  outro: string | null | undefined,
  lang: "en" | "pt" = "en"
): string | null {
  if (!relacao) return null;
  if (relacao === "OTHER") return outro || RELACAO_ROTULO.OTHER[lang];
  const r = RELACAO_ROTULO[relacao as Relacao];
  // Valor antigo, gravado quando o campo era livre: mostra como está, em vez
  // de esconder o que a pessoa escreveu.
  return r ? r[lang] : relacao;
}

/**
 * Idade em anos completos.
 *
 * Por comparação de data e não por divisão de milissegundos: a conta por
 * milissegundo erra o aniversário de quem nasceu em 29 de fevereiro, e "faz 16
 * hoje" é exatamente o caso em que a resposta precisa estar certa.
 */
export function idadeEmAnos(nascimento: Date, quando: Date = new Date()): number {
  let anos = quando.getUTCFullYear() - nascimento.getUTCFullYear();
  const mes = quando.getUTCMonth() - nascimento.getUTCMonth();
  if (mes < 0 || (mes === 0 && quando.getUTCDate() < nascimento.getUTCDate())) anos--;
  return anos;
}

/** No Reino Unido, menor de idade é quem tem menos de 18. */
export function ehMenorDeIdade(nascimento: Date, quando: Date = new Date()): boolean {
  return idadeEmAnos(nascimento, quando) < 18;
}

function texto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const limpo = v.trim().replace(/\s+/g, " ");
  if (!limpo || limpo.length > max) return null;
  return limpo;
}

/**
 * Valida e normaliza. Devolve o erro, ou a pessoa limpa.
 *
 * Nada aqui aceita quem é o responsável: isso vem da sessão, sempre. Um campo
 * desses no corpo seria o caminho para pendurar uma criança na conta de outra
 * pessoa.
 */
export function validarPessoa(
  bruto: PessoaBruta,
  agora: Date = new Date()
): { erro: string; erroPt: string } | { pessoa: PessoaLimpa } {
  const firstName = texto(bruto.firstName, MAX_NOME);
  const lastName = texto(bruto.lastName, MAX_NOME);
  if (!firstName || !lastName) {
    return { erro: "First and last name are required.", erroPt: "Nome e sobrenome são obrigatórios." };
  }

  if (typeof bruto.dateOfBirth !== "string" && !(bruto.dateOfBirth instanceof Date)) {
    return { erro: "Date of birth is required.", erroPt: "A data de nascimento é obrigatória." };
  }
  const dateOfBirth = new Date(bruto.dateOfBirth as string | Date);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return { erro: "That date of birth is not valid.", erroPt: "Essa data de nascimento não é válida." };
  }

  // Data no futuro viraria idade negativa, e é a idade que decide a faixa de
  // referência de um resultado de exame.
  if (dateOfBirth.getTime() > agora.getTime()) {
    return { erro: "The date of birth is in the future.", erroPt: "A data de nascimento está no futuro." };
  }
  if (idadeEmAnos(dateOfBirth, agora) > 120) {
    return { erro: "Please check the date of birth.", erroPt: "Confira a data de nascimento." };
  }

  /**
   * O parentesco, obrigatório para menor de 18.
   *
   * Maior de idade gerido existe — alguém que cuida de um pai idoso, por
   * exemplo — e ali a relação ajuda mas não é o que responde pela pessoa. A
   * exigência acompanha a razão dela: **é sobre quem responde pela criança**.
   */
  const relationship = texto(bruto.relationship, MAX_RELACAO);
  const relationshipOther = texto(bruto.relationshipOther, MAX_RELACAO);
  const menor = ehMenorDeIdade(dateOfBirth, agora);

  if (menor && !relationship) {
    return {
      erro: "Say what you are to this child — it is who answers for them.",
      erroPt: "Diga o que você é desta criança — é quem responde por ela.",
    };
  }

  if (relationship && !RELACOES.includes(relationship as Relacao)) {
    return {
      erro: "That is not one of the relationships we accept.",
      erroPt: "Esse não é um parentesco que aceitamos.",
    };
  }

  // "Outro" sem dizer o quê não é uma resposta: é o campo obrigatório contornado.
  if (relationship === "OTHER" && !relationshipOther) {
    return {
      erro: "Describe the relationship.",
      erroPt: "Descreva o parentesco.",
    };
  }

  return {
    pessoa: {
      firstName,
      lastName,
      dateOfBirth,
      sex: texto(bruto.sex, 20),
      relationship,
      relationshipOther: relationship === "OTHER" ? relationshipOther : null,
    },
  };
}

/** Os campos que o app pode ver. */
export function pessoaPublica(u: {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  sex?: string | null;
  managedRelationship?: string | null;
  managedRelationshipOther?: string | null;
}) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    dateOfBirth: u.dateOfBirth,
    sex: u.sex ?? null,
    relationship: u.managedRelationship ?? null,
    relationshipOther: u.managedRelationshipOther ?? null,
    // Calculada, nunca guardada: idade guardada envelhece em silêncio e um dia
    // manda a faixa de referência errada para o laboratório.
    idade: u.dateOfBirth ? idadeEmAnos(u.dateOfBirth) : null,
    menorDeIdade: u.dateOfBirth ? ehMenorDeIdade(u.dateOfBirth) : false,
  };
}

/** Quem este responsável cuida. */
export async function pessoasGeridasPor(guardianId: string) {
  return prisma.user.findMany({
    where: { managedById: guardianId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true, managedRelationshipOther: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Cria a pessoa gerida.
 *
 * `clinicId` vem do responsável: a criança pertence à mesma clínica da mãe, e
 * herdar isso é o que impede um paciente de nascer fora de qualquer tenant —
 * que é o estado em que as rotas antigas vazavam.
 */
export async function criarPessoaGerida(opts: {
  guardianId: string;
  clinicId: string | null;
  pessoa: PessoaLimpa;
}) {
  const { guardianId, clinicId, pessoa } = opts;
  return prisma.user.create({
    data: {
      email: emailSintetico(),
      password: null,
      role: "PATIENT",
      clinicId,
      managedById: guardianId,
      firstName: pessoa.firstName,
      lastName: pessoa.lastName,
      dateOfBirth: pessoa.dateOfBirth,
      sex: pessoa.sex,
      // Parentesco: a tela coleta e a validação aceita. Até o review de
      // 27/09/2026 este valor era descartado em silêncio, porque a coluna não
      // tinha vindo junto na unificação com `User`.
      managedRelationship: pessoa.relationship,
      managedRelationshipOther: pessoa.relationshipOther,
      // Nada chega ao telefone de uma criança: ela não tem aparelho aqui.
      pushEnabled: false,
      // `emailVerified` é uma data, não um sim/não. Marcá-la como verificada
      // agora não é uma conveniência: sem isso a conta cai no estado "esperando
      // confirmar o e-mail", e não há e-mail a confirmar — o endereço é
      // sintético. Seria um limbo permanente, e o login já recusa esta conta
      // por um motivo melhor.
      emailVerified: new Date(),
    },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true, managedRelationshipOther: true },
  });
}

/** A pessoa gerida por este responsável, ou nada. O dono vai junto na busca. */
export async function pessoaGeridaMinha(id: string, guardianId: string) {
  return prisma.user.findFirst({
    where: { id, managedById: guardianId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true, managedRelationshipOther: true, clinicId: true },
  });
}
