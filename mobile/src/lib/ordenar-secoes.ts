/**
 * A ordem alfabética do menu do app.
 *
 * O Bruno, 30/09/2026: *"quero ordem no app também… na clinic e no app precisa
 * refletir a mesma ordem."*
 *
 * A mesma regra do painel de permissões (`lib/ordenar-modulos.ts`, do lado da
 * web). **É código duplicado de propósito e não dá para evitar:** o `@/` do
 * mobile aponta para `mobile/src`, o da web para a raiz, e nenhum dos dois
 * alcança o outro. Duas cópias de dez linhas, com o mesmo comportamento
 * descrito nos dois lugares, é melhor que um pacote partilhado para uma função
 * de ordenação.
 *
 * O que as duas têm de manter igual, e é o que um teste cobra:
 *
 * - ordenar pelo rótulo **da língua exibida**, e não pelo inglês traduzido;
 * - `localeCompare` e não `<`, porque o cru compara por código — põe toda
 *   maiúscula antes de toda minúscula e manda acento para depois do `z`;
 * - `sensitivity: "base"`, para acento e caixa não separarem o que a vista
 *   junta.
 */

export interface TemTitulo {
  title: { en: string; pt: string };
}

/**
 * Ordena as entradas do menu pelo título que o paciente está lendo.
 *
 * A lista de origem não é tocada: ela é definida uma vez por área, no módulo, e
 * ordenar no lugar mudaria a ordem para todo mundo que a importasse depois.
 */
export function ordenarSecoes<T extends TemTitulo>(secoes: T[], lang: string): T[] {
  const pt = String(lang || "").toLowerCase().startsWith("pt");
  const locale = pt ? "pt-BR" : "en-GB";
  return [...secoes].sort((a, b) =>
    (pt ? a.title.pt : a.title.en).localeCompare(pt ? b.title.pt : b.title.en, locale, {
      sensitivity: "base",
    })
  );
}
