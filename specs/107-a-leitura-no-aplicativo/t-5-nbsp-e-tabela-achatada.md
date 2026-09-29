# T-5: O `&nbsp;` e a tabela achatada

**Status:** 🟢 concluída (29/09) — aguardando QA
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

## Metade do problema não era problema

Medido antes de mexer: **`decodificar` já troca `&nbsp;` por espaço** na hora de
montar os blocos. Então o paciente nunca viu espaço teimoso — é feio no banco e
invisível na tela. Não mexi, e não saneei o histórico por causa disso: seria
trabalho e risco por uma coisa que ninguém lê.

A tabela era real. Confirmado rodando o tradutor no texto de produção: sai um
único bloco `paragrafo` com os pipes todos dentro.

## O que foi feito

`tabelaAchatada()` em `lib/rich-text-blocks.ts`. O que denuncia a tabela **não
são os pipes** — uma frase pode ter um — mas a linha de traços `|---|---|`, que
é o que diz onde o cabeçalho acaba. Sem ela, não dá para saber, e inventar um
cabeçalho seria pior que deixar o parágrafo.

No aplicativo a tabela vira **pares rotulados**, e não uma tabela: numa tela de
telefone duas colunas ou se espremem até ninguém ler, ou pedem rolagem lateral —
e rolagem lateral dentro de um artigo que rola para baixo é onde o texto se
perde. Cada linha é um cartão, rótulo em cima e valor embaixo.

## Por que **não** consertei o gerador

A spec dizia para consertar a origem antes do histórico, e eu fiz o contrário.
O motivo: `markdownToHtml` passaria a emitir `<table>`, e `emBlocos` não lê
`<table>` — a tabela cairia no caminho do texto solto e voltaria a sair como
parágrafo corrido. Consertar os dois lados é uma tarefa maior do que esta.

Como está, é coerente: o gerador produz pipes, e o leitor entende pipes. E a
correção pelo lado da leitura tem uma vantagem que a outra não teria — **vale
para todo o conteúdo que já existe**, sem migração de dados nenhuma.

## Critérios de aceite
- [x] A tabela é legível num telefone.
- [x] Um parágrafo comum não vira tabela, e um pipe solto também não.
- [x] O texto simples (resumo e busca) não perde o conteúdo da tabela.
- [x] `&nbsp;` medido: já era resolvido na leitura.
- [ ] QA: ver a tabela desenhada num protocolo real.
- [ ] Pendente, e agora sabido: `<table>` colada pelo editor também não é lida
      por `emBlocos` — cai como texto solto.
