# T-5: O `&nbsp;` e a tabela achatada

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que o conteúdo em português seja legível no telefone.

## Contexto — achado ao medir a T-3

Não era o que eu tinha ido procurar. Medindo o TODO em produção, apareceram
outras duas coisas no mesmo conteúdo:

| | campos em produção |
|---|---|
| com `&nbsp;` no lugar de espaço | **38** |
| com tabela de markdown achatada num parágrafo | **43** |

### A tabela que virou parágrafo

O paciente lê, corrido, dentro de um `<p>`:

> | Teste | O que um resultado positivo indica | |---|---| | Regra canadense
> para coluna cervical | descarta ou sinaliza necessidade de exame de imagem
> (fratura) | | Triagem de insuficiência vertebrobasilar (IVB) | avalia risco
> vascular ANTES de qualquer mobilização | …

A conversão de markdown para HTML não trata tabela, então a tabela inteira —
cabeçalho, linha de traços e todas as células — sai como um parágrafo de pipes.
É ilegível, e é conteúdo clínico.

### O espaço teimoso

Parágrafos inteiros com `&nbsp;` entre **todas** as palavras. Além de feio no
código, `&nbsp;` **impede a quebra de linha**: numa tela de telefone o texto
pode vazar ou esticar a linha em vez de quebrar.

Os dois vieram provavelmente do mesmo lugar — a tradução automática para
português, que devolveu HTML com entidades e não soube o que fazer com a tabela.

## Passos

1. Achar quem gerou: a rota/serviço de tradução, e se o defeito ainda acontece
   em texto novo. **Consertar a origem antes do histórico**, senão volta.
2. Converter as tabelas achatadas em `<table>` de verdade — ou, se o aplicativo
   não desenhar tabela bem em tela estreita, em lista de pares rotulados, que
   num telefone lê melhor que uma tabela de duas colunas espremida.
3. Trocar `&nbsp;` por espaço normal, preservando os poucos lugares em que ele
   é intencional (entre número e unidade, por exemplo).
4. Medir antes e depois, no banco, como na T-3.
5. Teste que reprove se conteúdo novo chegar com pipes de tabela ou com
   `&nbsp;` em série.

## Arquivos afetados
- a origem da tradução (a achar)
- `scripts/` — um saneador do histórico, nos moldes da T-3
- `mobile/src/components/ArtigoEmBlocos.tsx`, se a saída virar tabela
- `__tests__/education/tabela-e-espaco.test.ts`

## Critérios de aceite
- [ ] A origem não produz mais pipes nem `&nbsp;` em série.
- [ ] O histórico foi saneado, medido no banco.
- [ ] A tabela é legível num telefone.
- [ ] O texto quebra linha normalmente.
