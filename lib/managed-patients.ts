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
}

export interface PessoaLimpa {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: string | null;
  relationship: string | null;
}

const MAX_NOME = 80;
const MAX_RELACAO = 40;

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

  return {
    pessoa: {
      firstName,
      lastName,
      dateOfBirth,
      sex: texto(bruto.sex, 20),
      relationship: texto(bruto.relationship, MAX_RELACAO),
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
}) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    dateOfBirth: u.dateOfBirth,
    sex: u.sex ?? null,
    relationship: u.managedRelationship ?? null,
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
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true },
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
      // Nada chega ao telefone de uma criança: ela não tem aparelho aqui.
      pushEnabled: false,
      // `emailVerified` é uma data, não um sim/não. Marcá-la como verificada
      // agora não é uma conveniência: sem isso a conta cai no estado "esperando
      // confirmar o e-mail", e não há e-mail a confirmar — o endereço é
      // sintético. Seria um limbo permanente, e o login já recusa esta conta
      // por um motivo melhor.
      emailVerified: new Date(),
    },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true },
  });
}

/** A pessoa gerida por este responsável, ou nada. O dono vai junto na busca. */
export async function pessoaGeridaMinha(id: string, guardianId: string) {
  return prisma.user.findFirst({
    where: { id, managedById: guardianId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, dateOfBirth: true, sex: true, managedRelationship: true, clinicId: true },
  });
}
