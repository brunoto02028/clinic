# T-3: O TODO que chegou ao paciente

**Status:** 🟢 concluída (29/09) — QA aprovado, achados corrigidos
**Depende de:** nenhuma

## Objetivo

Que ninguém leia uma anotação minha achando que é uma referência.

## Contexto

No fim dos **dez** protocolos (o 11º arquivo é o `00_INDEX_and_SCHEMA.md`,
que documenta a convenção e não vira artigo), na seção *References*:

> • TODO: add a condition-specific loading-protocol reference (from module
> notes), Harvard format.

Fonte: `recovered-content/protocols/protocol_*.md`, semeados como artigo por
`scripts/seed-recovered-articles.js`. O Bruno viu num print do aplicativo,
29/09/2026 — eu não achei, foi mostrado.

Uma referência que não existe é pior que referência nenhuma: as cinco de cima,
que são reais, passam a ser lidas com a mesma desconfiança.

## Passos

1. Medir onde está: os arquivos, e **o banco** — se alguém editou pelo painel
   depois da semeadura, corrigir o arquivo não conserta o que o paciente lê.
2. Tirar a linha dos arquivos.
3. Tirar do banco, no ambiente em que estiver, com a mesma medida antes e depois.
4. Varrer o resto do conteúdo do paciente atrás de outras marcas de rascunho —
   `TODO`, `FIXME`, `XXX`, `[inserir`, `Lorem`.
5. Um teste que reprove se marca de rascunho voltar ao conteúdo semeado.

## O que esta tarefa **não** faz

Escrever a referência que faltava. Ela depende das anotações do módulo do Bruno,
e inventar uma citação Harvard plausível seria trocar um problema visível por um
invisível.

## Arquivos afetados
- `recovered-content/protocols/protocol_*.md`
- `__tests__/education/nada-de-rascunho-no-conteudo.test.ts`
- o banco (local e produção), por medição

## O que a medição mostrou

Muito maior que o print sugeria, e o local não servia de amostra.

| | local | **produção** |
|---|---|---|
| artigos com a marca | 9 | **9** |
| conteúdos de Education | 0 | **8** |
| campos afetados | 18 | **40** |

Duas surpresas:

1. **A linha foi traduzida junto**, em **seis redações diferentes** — a tradução
   automática rodou por linha. Procurar por texto fixo pegaria uma só.
2. Algumas versões têm `&nbsp;` no lugar de **cada** espaço.

Por isso a regra não procura a frase: procura **item de lista que começa com a
marca**, sobre o texto visível (sem marcação, sem espaço teimoso). O falso
positivo que isso evita é o meu próprio: ao medir, busquei sem diferenciar
maiúsculas e "todos os planos" casou com "TODO".

## O que foi feito

- Os 10 arquivos de origem, uma linha a menos cada.
- `scripts/limpar-marcas-de-rascunho.js` — idempotente, com `--dry-run`, ligado
  ao `start.sh` depois da semeadura. A semeadura cria o artigo uma vez e não
  volta nele; sem isto, consertar o markdown não conserta o que já está lá.
- `__tests__/education/nada-de-rascunho-no-conteudo.test.ts` — 15 casos,
  incluindo o falso positivo do "todos" e a idempotência.
- Simulação em produção: **40 itens em 17 registros**. Nada escrito ainda.

## Critérios de aceite
- [x] Medido no banco, não só nos arquivos — local **e** produção.
- [x] O teste reprova se voltar.
- [x] O Bruno sabe quais protocolos ficaram com uma referência a menos.
- [x] A fonte está limpa, e a semeadura de um banco novo não traz a marca.
- [x] Produção limpa: 40 itens em 17 registros, e **0** na conferência.
- [x] QA confirmou de forma independente: 35/35 artigos publicados, 0 marcas.
- [x] O índice dos protocolos não manda mais usar `TODO` (achado do QA).
