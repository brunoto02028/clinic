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
 * discordar do primeiro. O sinal é a verdade, não uma cópia dela.
 *
 * ## Duas perguntas, e não uma
 *
 * **`quaisTemTracado`**: *"isto desenha?"* — a régua do papel, amplitude e
 * número de amostras incluídos. É o que a lista e a sondagem mostram.
 *
 * **`temTracadoPorGravacao`**: *"já tenho o sinal guardado?"* — `IS NOT NULL`, e
 * de propósito. É o que a ingestão usa para não pedir outra vez as 9.000
 * amostras, e se usasse a régua do papel um sinal plano seria rebuscado a cada
 * passagem, para sempre.
 *
 * São perguntas diferentes com respostas diferentes, e ficam com nomes
 * diferentes. O que não pode haver é **duas respostas para a mesma pergunta**,
 * que era o caso: a lista dizia *"tem traçado"* e o papel dizia que não.
 */

import { prisma } from "@/lib/db";
import { AMPLITUDE_MINIMA_UV } from "@/lib/ecg-tracado";

/**
 * Das gravações pedidas, quais têm traçado guardado.
 *
 * O `userId` entra na consulta de propósito: quem pergunta por uma gravação que
 * não é sua recebe um conjunto vazio, e não uma resposta sobre a gravação de
 * outra pessoa. A verificação de dono não é obrigação só de quem chama.
 */
export async function quaisTemTracado(userId: string, ids: string[]): Promise<Set<string>> {
  if (!userId || ids.length === 0) return new Set();

  /**
   * **A mesma régua do papel, aplicada no banco** (120 T-5).
   *
   * Isto respondia `signal IS NOT NULL` — *"há um JSON lá"*. O papel recusa
   * desenhar com menos de duas amostras numéricas ou com amplitude abaixo de
   * `AMPLITUDE_MINIMA_UV`, porque uma reta em papel milimetrado lê-se como
   * assistolia. Duas réguas: a lista dizia *"tem traçado"* e o papel saía com
   * *"o traçado ainda não foi obtido"*.
   *
   * A conta vai em SQL e **não transfere** as amostras. O `jsonb_typeof` filtra
   * os buracos (`null` dentro da lista) e protege contra um `signal` que não
   * seja lista; sem rows, o `count(*)` é falso e o `AND` com o `null` do
   * `max()` dá falso também.
   *
   * **A frequência entra na conta**, e isso foi um achado do QA: a 300 Hz cada
   * coluna do papel come 3 amostras e são precisas 2 colunas, logo o mínimo é
   * 6 — não 2. Sem `samplingHz` o papel recusa (não há escala de tempo), e aqui
   * também. `GREATEST(1, round(hz/100))*2` é a mesma conta do `amostrasMinimas`.
   *
   * ## O que isto custa, medido
   *
   * O docblock no topo deste ficheiro diz que a resposta *"custava as 9.000
   * amostras"*. **Deixou de ser verdade**, e o QA mediu-o: com 10 gravações de
   * 9.000 amostras esta consulta leva ~60 ms, contra ~17 ms do
   * `select: { signal: true }` que o módulo existe para evitar — 3,5×. A troca
   * é ~43 ms de CPU do Postgres por 281 KB que não atravessam a rede; em
   * `localhost` a rede é grátis e a conta fica pessimista, com o banco noutro
   * contentor muda de sinal.
   *
   * Está escrito aqui porque a premissa do topo era a justificação do módulo, e
   * uma justificação que já não se mede é um comentário que mente. A saída
   * verdadeira — guardar a resposta numa coluna no momento da escrita — é a
   * T-10 da 120.
   *
   * Medido em 02/10/2026 contra o banco local, 12 casos: 9.000 amostras reais,
   * tudo `null`, constante, pico de 49/50/51 µV, uma amostra, objecto em vez de
   * lista, coluna `null`, lista vazia, buracos pelo meio e amostras negativas.
   */
  const linhas = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT e."id" FROM "EcgRecording" e
    WHERE e."userId" = ${userId}
      AND e."id" = ANY(${ids}::text[])
      AND e."signal" IS NOT NULL
      AND jsonb_typeof(e."signal") = 'array'
      AND e."samplingHz" IS NOT NULL
      AND e."samplingHz" > 0
      AND (
        SELECT (
          count(*) >= GREATEST(1, round(e."samplingHz" / 100.0))::int * 2
          AND (max(s.n) - min(s.n)) >= ${AMPLITUDE_MINIMA_UV}
        )
        FROM (
          SELECT (v #>> '{}')::numeric AS n
          FROM jsonb_array_elements(e."signal") AS t(v)
          WHERE jsonb_typeof(v) = 'number'
        ) s
      )
  `;
  return new Set(linhas.map((l) => l.id));
}

/** A mesma pergunta, para uma gravação só. */
export async function temTracado(userId: string, id: string): Promise<boolean> {
  const comSinal = await quaisTemTracado(userId, [id]);
  return comSinal.has(id);
}

/**
 * **Se o sinal já está guardado** — a outra pergunta, pela chave natural.
 *
 * `IS NOT NULL`, e **de propósito**: é o que a ingestão usa para não voltar a
 * pedir as 9.000 amostras. Se usasse a régua do papel, um sinal guardado mas
 * não desenhável — plano, ou sem `samplingHz` — seria pedido outra vez a cada
 * passagem, para sempre, e a Withings cobraria por isso.
 *
 * O QA chamou a isto *"um terceiro leitor com a régua antiga"*. Não é: é uma
 * pergunta diferente, e o nome di-lo. Ver a secção *"Duas perguntas"* no topo.
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
