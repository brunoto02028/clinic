# T-15: A descoberta — como o paciente sabe tudo o que temos

**Status:** pendente
**Depende de:** T-13, T-14

## O pedido

> *"precisamos de uma forma do paciente saber tudo o que temos lá, todos os
> exames disponíveis, como funciona etc... como tem em todo material deles"*

## O que já existe, e é mais do que eu esperava

Não é tela nova. `mobile/app/(app)/(lab)/` já tem catálogo em abas com **busca
por nome e biomarcador** e **chips de categoria**, detalhe do exame, checkout,
pontos de coleta, dependentes, pedido, resultado, e a tela
[`how-it-works`](../../mobile/app/(app)/(lab)/how-it-works.tsx) com os três
caminhos da amostra (T-12, 26/09).

**Foi desenhado para 22 exames.** O que esta tarefa resolve é o que acontece
quando viram 421.

## O que a medição mostrou, e muda o desenho

| | |
|---|---|
| exames de **um só** biomarcador | **313** |
| **painéis** (mais de um) | **108** — o maior tem 63 marcadores |
| saem em **1 dia** | **221** |
| até £50 / £100 / £200 / £500 / acima | 43 / 97 / 188 / 86 / 7 |
| **sem categoria navegável** | **183** (T-14) |

A conclusão é a que eu não tinha antes: **isto não é uma loja de 421 coisas
equivalentes.** São ~100 exames que uma pessoa procuraria sozinha, e ~300 ensaios
especializados que só fazem sentido quando um clínico diz o nome. Uma grelha de
421 cartões enterra os 40 que importam, e a pessoa sai sem comprar nada.

Então: **todos os 421 ficam disponíveis e alcançáveis** — isso é o pedido, e
nada fica escondido — mas a **descoberta é em camadas**.

## O desenho

### 1. A porta de entrada

Hoje a aba abre direto na lista. Passa a abrir numa entrada que responde às três
perguntas que a pessoa tem:

- **"o que eu posso medir?"** → as categorias, com contagem real;
- **"como funciona?"** → o atalho para `how-it-works`, que já existe e hoje está
  escondido (os três caminhos da amostra, o prazo, quem vê o resultado);
- **"quanto custa e quando sai?"** → faixa de preço e a informação de que 221
  saem em 1 dia.

Mais: **os painéis em destaque**. Os 108 painéis são o que o material deles
merchandiza, e é o que uma pessoa compra sem saber o nome de um marcador.

### 2. A busca, que é a peça mais forte e já está pronta pela metade

A busca já olha nome **e** biomarcador. Com 421 isso fica muito mais útil do que
com 22: a coluna `Tests` lista a composição, então procurar `TSH` encontra todos
os painéis que o contêm, não só o exame chamado TSH. É o caminho dos 183
especializados — e o caminho de quem chega com um nome que o médico escreveu.

Falta: dizer **porque** um resultado apareceu ("contém TSH"), senão a pessoa vê
um painel de tiroide ao procurar TSH e não entende a relação.

### 3. "Ver todos", de verdade

Uma lista A–Z dos 421, paginada, alcançável da entrada. É literalmente o pedido:
*saber tudo o que temos lá*. Sem isto, "todos os exames" é uma afirmação que a
tela não cumpre.

### 4. Filtrar pelo que a pessoa decide

Prazo (1 dia / até uma semana / mais) e preço. Os dois saem da planilha, exatos.
Não inventar filtro de "popularidade" sem dado de venda.

### 5. O que **não** fazer

- **Não** carregar 421 numa lista sem paginação — é o defeito de desempenho
  óbvio, e no telefone aparece como tela branca.
- **Não** repetir a categoria como única entrada: 183 exames não têm uma.
- **Não** prometer na lista o caminho da amostra (kit ou coleta) antes de a API
  dizer — é o defeito que a varredura de 26/09 encontrou, e ele volta na hora em
  que a lista crescer.

## O que precisa de decisão do Bruno

A cauda inclui painéis genéticos e de oncologia: **Breast Cancer NGS £2.866**,
**Chromosome Analysis (Karyotype) £1.125**, **Apolipoprotein E genotype £580**.
Vender isso por autoatendimento, sem conversa, é um produto diferente de vender
vitamina D — e encosta na linha que já cuidamos: nós entregamos **relatório
detalhado**, não diagnóstico.

A minha proposta **não** é esconder: é marcar esse grupo como *"fale com o seu
terapeuta antes"*, com o botão a abrir conversa em vez de carrinho. Fica
visível, fica honesto, e não vira compra por impulso de um exame que precisa de
contexto clínico. **Decisão sua.**

## Critérios de aceite

- [ ] Da entrada dá para chegar aos 421 — por categoria, por busca e por A–Z
- [ ] A lista A–Z pagina e não trava no telefone com 421
- [ ] A busca por biomarcador diz **porque** cada resultado apareceu
- [ ] `how-it-works` é alcançável da entrada, não só por link direto
- [ ] Filtros de prazo e preço, com as contagens certas
- [ ] Nenhuma tela afirma o caminho da amostra antes de a API dizer
- [ ] EN e PT, inglês primeiro
- [ ] Nenhuma tela usa a palavra "diagnóstico"
