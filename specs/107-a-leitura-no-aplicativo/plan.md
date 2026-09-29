# Atividade 107 — A leitura no aplicativo

## Objetivo

> O Bruno, 29/09/2026, com dois prints do aplicativo:
>
> *"Tem como melhorar esse UX? Deixar a foto maior por ex."*
>
> *"Ao final de cada artigo, dá pra colocar atalhos para outros, algo assim?"*

Duas perguntas de UX. Ao ir olhar, achei duas coisas que não são de UX e são
piores — o paciente está lendo um **TODO** meu e marcação de markdown crua.

## O que eu encontrei

### 1. O cartão desperdiça a tela toda para caber em 64 pixels

Na lista de Education, a miniatura tem ~64×64 encostada na esquerda, e o título
quebra em **três linhas** ao lado dela. A descrição corta no meio de uma palavra
(*"History is full of treatments that doctor…"*). Abaixo dos dois cartões,
dois terços da tela ficam vazios.

É o pior dos dois mundos: a foto é pequena demais para dizer alguma coisa, e o
espaço que ela rouba é o que faltou para o título.

### 2. Quem termina um artigo não tem para onde ir

O artigo acaba nas Referências e termina. Não há próximo, não há relacionado,
não há voltar para a lista — a pessoa que gostou de ler não recebe nada.

### 3. **O paciente está lendo um TODO meu**

No fim de dez dos onze protocolos, na seção *References*:

> • TODO: add a condition-specific loading-protocol reference (from module
> notes), Harvard format.

Está em `recovered-content/protocols/protocol_*.md`, que
`scripts/seed-recovered-articles.js` semeia como artigo. Quem abre o protocolo
de dor lombar crônica lê isso.

Uma referência que não existe é pior que nenhuma: o resto da lista passa a ser
lida com desconfiança.

### 4. O markdown chega cru na tela

`_Maitland's Peripheral Manipulation Management._` aparece com os sublinhados.
`ArtigoEmBlocos` trata os blocos — título, parágrafo, lista, citação — mas nada
dentro do parágrafo: itálico e negrito passam como texto.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O cartão que não decide entre foto e texto](t-1-o-cartao-da-lista.md) | 🟢 concluída (29/09) |
| T-2 | [Quem terminou de ler quer o próximo](t-2-o-fim-do-artigo.md) | 🟢 concluída (29/09) |
| T-3 | [O TODO que chegou ao paciente](t-3-o-todo-no-artigo.md) | 🟢 concluída (29/09) — produção limpa |
| T-4 | [O markdown que o paciente lê cru](t-4-markdown-cru.md) | 🟢 concluída (29/09) |
| T-5 | [O `&nbsp;` e a tabela achatada](t-5-nbsp-e-tabela-achatada.md) | pendente — achado ao medir a T-3 |

**T-3 primeiro.** As outras são melhorias; esta é conteúdo errado na mão de
quem confia na clínica, e sai com uma linha a menos.

## O que o QA encontrou, 29/09/2026

Quatro relatórios em `qa/`, com 9 screenshots. **As quatro passaram**, nenhuma
reprovação. Seis achados saíram junto:

| # | achado | o que foi feito |
|---|---|---|
| 1 | o "See all materials" sumia junto com as sugestões | **corrigido** — o pior deles, e irônico: quem tem um material só ficava sem saída nenhuma, que é o que a T-2 foi corrigir |
| 2 | na citação o itálico era invisível (itálico dentro de itálico) | **corrigido** — ênfase dentro de texto inclinado volta ao normal, que é a convenção tipográfica e a única que se enxerga |
| 3 | `cortarEmPalavra(desc, 110)` calibrado para a coluna larga | **corrigido** — sem capa o ícone come 46px, e o limite passou a acompanhar |
| 4 | `00_INDEX_and_SCHEMA.md` ainda mandava usar marcas `TODO` | **corrigido** — quem semeasse um protocolo novo reintroduziria a marca |
| 5 | `urlAbsoluta` usa `NEXTAUTH_URL` e não o host do pedido | só atrapalha QA local; em produção não aparece. **Não mexido** |
| 6 | a porta 4020 estava morta no ambiente local | ambiente, não código |

As medidas que valem citar: imagem **380,67px** contra conteúdo do cartão de
**380,67px**; razão **1,7778** nos três cartões, inclusive com foto de origem em
1,498 — a caixa é que manda. Contraste no pior caso **4,57** no claro e **6,08**
no escuro. Título mais longo da clínica (92 caracteres) em **2,000 linhas**.
Nenhuma das nove descrições cortada no meio de palavra. Nas referências,
**0 sublinhados** e **0 underscores** visíveis.

## Decisões de design

### A foto grande ou nenhuma

Miniatura de 64px não informa e ocupa. Ou a imagem é a capa do cartão — largura
inteira, proporção fixa — ou o cartão é só texto e ganha a largura toda. O meio
termo é o que está na tela hoje.

### O fim do artigo não inventa relevância

"Relacionado" exige saber o que se parece com o quê, e a clínica tem poucas
dezenas de textos. O que existe e é honesto: **o próximo da mesma categoria**, e
**voltar para a lista**. Recomendação por semelhança fica para quando houver
volume que a justifique.

### O TODO sai; a referência não se inventa

Remover a linha é certo e não inventa nada. **Escrever** a referência que
faltava depende das suas anotações do módulo — isso fica para você.

## Suposições — para você validar

1. Os onze protocolos em `recovered-content/protocols/` são a fonte, e o que
   está no banco de produção veio deles. Se alguém editou pelo painel depois, o
   conserto tem de passar pelo banco também — vou medir antes.
2. "Atalhos para outros" é o **próximo da mesma categoria**, não recomendação
   por semelhança de conteúdo.
3. A foto maior vale para as duas listas — "For you" e "From the clinic".
4. Nada disso muda o que já está publicado no site; é tela do aplicativo.
