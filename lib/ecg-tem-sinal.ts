/**
 * "Esta gravação tem traçado?" — sem trazer o traçado (099 T-9).
 *
 * ## Porque isto não é um `select`
 *
 * A pergunta é um booleano. A resposta, com Prisma, custava **as 9.000
 * amostras**: `select: { signal: true }` traz ~40 KB de JSON do banco para a
 * aplicação só para o comparar com `null`. Em três sítios:
 *
 * - na sincronização, por **cada** gravação, a cada passagem — e a passagem
 *   existe precisamente para não pedir outra vez o que já está guardado;
 * - na rota do link, a cada toque no botão do PDF;
 * - e na rota que alimenta a tela, que ainda nem sabia responder.
 *
 * O Prisma não sabe projectar `signal IS NOT NULL`, logo vai em SQL. É uma
 * consulta parametrizada — os valores nunca entram na string.
 *
 * ## E porque não uma coluna `temSinal`
 *
 * Porque seria um segundo sítio a dizer a mesma coisa, que pode ficar a
 * discordar do primeiro. `signal IS NOT NULL` é a verdade, não uma cópia dela.
 */

import { prisma } from "@/lib/db";

/**
 * Das gravações pedidas, quais têm traçado guardado.
 *
 * O `userId` entra na consulta de propósito: quem pergunta por uma gravação que
 * não é sua recebe um conjunto vazio, e não uma resposta sobre a gravação de
 * outra pessoa. A verificação de dono não é obrigação só de quem chama.
 */
export async function quaisTemTracado(userId: string, ids: string[]): Promise<Set<string>> {
  if (!userId || ids.length === 0) return new Set();

  const linhas = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "EcgRecording"
    WHERE "userId" = ${userId}
      AND "id" = ANY(${ids}::text[])
      AND "signal" IS NOT NULL
  `;
  return new Set(linhas.map((l) => l.id));
}

/** A mesma pergunta, para uma gravação só. */
export async function temTracado(userId: string, id: string): Promise<boolean> {
  const comSinal = await quaisTemTracado(userId, [id]);
  return comSinal.has(id);
}

/**
 * Se já temos o traçado desta gravação, pela chave natural.
 *
 * A sincronização não conhece o `id` — acabou de fazer um `upsert` pela chave
 * `(userId, provider, recordedAt)`. Perguntar por aqui evita o segundo
 * `findUnique` só para descobrir o `id` que se vai usar uma vez.
 */
export async function temTracadoPorGravacao(
  userId: string,
  provider: string,
  recordedAt: Date
): Promise<boolean> {
  const linhas = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "EcgRecording"
    WHERE "userId" = ${userId}
      AND "provider" = ${provider}
      AND "recordedAt" = ${recordedAt}
      AND "signal" IS NOT NULL
    LIMIT 1
  `;
  return linhas.length > 0;
}
