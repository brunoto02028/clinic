/**
 * Os blocos do menu do paciente (112 T-1).
 *
 * O Bruno, 30/09/2026: *"a gente estar organizando a forma que o paciente ve as
 * liberdades da clinica, para que ele fique debaixo das subcategorias, assim
 * como esta nas permissoes la na area web da clinica."*
 *
 * Esta funcao vive fora do componente por um motivo pratico: **o que importa
 * aqui nao e agrupar, e o que acontece com quem nao entra em grupo nenhum** — e
 * isso precisa de teste, nao de inspecao visual. Dentro do render, a unica forma
 * de cobrar seria ler o arquivo como texto.
 *
 * Tres casos reais em que uma linha nao tem grupo:
 *
 * - o **laboratorio** passa pelo mesmo componente com quatro linhas sem modulo;
 * - um app atualizado pode falar com um **servidor antigo**, que nao manda grupos;
 * - uma linha nova pode nascer sem chave, ou com a chave escrita errado.
 *
 * Em todos, a linha cai no ultimo bloco, **sem cabecalho** — que e exatamente a
 * tela de antes de agrupar. Perder linha e o unico desfecho inaceitavel: some
 * sem erro, e ninguem descobre.
 */

export interface GrupoLido {
  key: string;
  en: string;
  pt: string;
  modulos: string[];
}

export interface SecaoAgrupavel {
  href: string;
  module?: string;
  grupo?: string;
}

export interface BlocoDoMenu<T> {
  chave: string;
  /** `null` no bloco de sobra — e a ausencia de cabecalho que o desenha. */
  grupo: GrupoLido | null;
  itens: T[];
}

/**
 * Distribui as secoes pelos grupos, na ordem em que o servidor os mandou.
 *
 * A ordem **dentro** de cada bloco e a que entrou: quem chama ja ordenou
 * alfabeticamente, e reordenar aqui seria decidir duas vezes a mesma coisa.
 */
export function agruparSecoes<T extends SecaoAgrupavel>(
  secoes: T[],
  grupos: GrupoLido[]
): Array<BlocoDoMenu<T>> {
  const grupoDa = (s: T): string | null => {
    if (s.grupo) return s.grupo;
    if (!s.module) return null;
    return grupos.find((g) => g.modulos.includes(s.module!))?.key ?? null;
  };

  const blocos: Array<BlocoDoMenu<T>> = [];
  const colocadas = new Set<string>();
  for (const g of grupos) {
    const itens = secoes.filter((s) => grupoDa(s) === g.key);
    if (itens.length === 0) continue; // cabecalho sozinho e pior que grupo nenhum
    for (const s of itens) colocadas.add(s.href);
    blocos.push({ chave: g.key, grupo: g, itens });
  }

  const sobrando = secoes.filter((s) => !colocadas.has(s.href));
  if (sobrando.length > 0) blocos.push({ chave: "resto", grupo: null, itens: sobrando });
  return blocos;
}
