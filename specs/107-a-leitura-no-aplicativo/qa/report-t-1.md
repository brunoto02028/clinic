# QA — 107 T-1: o cartão que não decide entre foto e texto

**Data:** 29/09/2026
**Onde:** aplicativo do paciente, build web em `http://localhost:8090`
(`expo start --web --port 8090`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`), API local em
`127.0.0.1:4020` subida deste mesmo worktree. Viewport 414x896 (tamanho de
telefone).
**Resultado geral:** aprovado com uma ressalva — os 5 cenários passaram, todos
medidos em pixels. A ressalva é sobre **de onde vem o corte** da descrição, não
sobre o corte estar errado.

**Paciente:** `Qa107 PacienteTeste` (`qa107.paciente@example.test`), clínica de
teste `QA107 Clinica de Teste`. Nenhum paciente real foi tocado.

**Como medi:** `getBoundingClientRect()` de cada cartão, da capa e de cada bloco
de texto; `getComputedStyle` para cor, peso e entrelinha; e um `Range` caractere
a caractere para achar **onde a linha visível acaba de verdade**. Contraste pela
fórmula WCAG, com o fundo composto subindo a árvore até uma cor opaca. Nada foi
julgado a olho.

## O conteúdo medido

Nove materiais copiados do **texto real dos protocolos da clínica** (título,
resumo e corpo saem dos artigos `chronic-lower-back-pain`, `whiplash`,
`frozen-shoulder`, `snapping-hip`, `runner-s-knee-itb-syndrome`,
`trochanteric-bursitis`, `hamstring-tendinosis`, `carpal-tunnel-syndrome`,
`patellofemoral-pain`), mais um material de fixture da T-4. Três com capa (as
imagens reais da biblioteca da clínica), sete sem.

## Resumo

| # | cenário | resultado |
|---|---|---|
| 1.1 | imagem na largura do cartão, medida em pixels | aprovado — 380,67 de 380,67 |
| 1.2 | o título mais longo da clínica cabe em 2 linhas | aprovado — 92 caracteres, 2,000 linhas |
| 1.3 | artigo sem imagem, sem buraco cinza | aprovado — 107px de cartão, ícone 36x36 |
| 1.4 | claro e escuro, contraste medido | aprovado — mínimo 4,57 (claro) e 6,08 (escuro) |
| 1.5 | "Required" e "article" distinguíveis | aprovado — deltaE 52,6 entre os textos |
| extra | a seta de "abre" saiu | aprovado — 0 chevrons em 10 cartões |
| extra | nenhum corte no meio de palavra | aprovado — 9 de 9, com ressalva |

---

## 1.1 — a imagem ocupa a largura do cartão

O cartão tem **382,00px** de largura externa e uma borda de **0,666667px** de
cada lado, então a caixa de conteúdo mede **380,67px**. Os três cartões com
capa:

| cartão | largura do cartão | conteúdo do cartão | **largura da imagem** |
|---|---|---|---|
| Carpal Tunnel Syndrome | 382,00 | 380,67 | **380,67** |
| Kneecap Pain | 382,00 | 380,67 | **380,67** |
| Snapping Hip | 382,00 | 380,67 | **380,67** |

**380,67 = 380,67.** A imagem ocupa a largura inteira do cartão. O 1,33px que
falta para os 382 é a borda do próprio cartão, não folga: `overflow: hidden`
recorta dentro dela.

Antes era uma miniatura de 44px encostada na esquerda. Agora a foto tem
**8,65 vezes** a largura que tinha.

### A proporção é 16:9, e a foto original não manda nisso

| cartão | caixa medida | razão medida | razão **natural** do arquivo |
|---|---|---|---|
| Carpal Tunnel | 380,67 x 214,13 | **1,7778** | 1214x692 = 1,754 |
| Kneecap Pain | 380,67 x 214,13 | **1,7778** | 1766x1179 = **1,498** |
| Snapping Hip | 380,67 x 214,13 | **1,7778** | 1200x655 = 1,832 |

16/9 = 1,77778. Os três dão **1,7778** — e as três fotos de origem têm
proporções diferentes, uma delas quase 3:2. A caixa impõe a proporção e o
`cover` recorta. É isto que faz a lista parecer uma lista, e não uma colagem.

Screenshot: `screenshots/t-1-lista-claro.png`

---

## 1.2 — o título mais longo da clínica cabe em 2 linhas

Nove títulos reais, medidos pela altura do bloco dividida pela entrelinha
(20px), e pela diferença entre `scrollHeight` e `clientHeight` (que denuncia
texto cortado):

| título | caracteres | altura | **linhas** | cortado? |
|---|---|---|---|---|
| Kneecap Pain (Patellofemoral Pain): The Truth About "Runner's Knee" at the Front of the Knee | **92** | 40px | **2,000** | **não** |
| Carpal Tunnel Syndrome: Why Your Hand Goes Numb at Night, and What Helps | 72 | 40px | 2,000 | não |
| Runner's Knee (ITB Syndrome) | 28 | 20px | 1,000 | não |
| Chronic Lower Back Pain | 23 | 20px | 1,000 | não |
| Trochanteric Bursitis | 21 | 20px | 1,000 | não |
| Hamstring Tendinosis | 20 | 20px | 1,000 | não |
| Frozen Shoulder | 15 | 20px | 1,000 | não |
| Snapping Hip | 12 | 20px | 1,000 | não |
| Whiplash | 8 | 20px | 1,000 | não |

**O mais longo que existe na clínica — 92 caracteres — cabe em exatamente 2
linhas, inteiro, sem reticência.** `scrollHeight` igual a `clientHeight` nos
nove: nenhum título perdeu uma letra.

A T-1 partiu de um título quebrando em **três** linhas numa coluna estreita. Ele
agora cabe em duas porque a coluna passou de ~280px para 354,67px (com capa) —
a miniatura devolveu ao título o espaço que estava roubando.

---

## Nenhuma descrição cortada no meio de palavra

Este era o pedido explícito, e foi medido **caractere a caractere**: para cada
descrição, achei o último caractere cujo retângulo ainda cai dentro da altura
visível, e olhei o caractere seguinte.

| cartão | capa | visíveis / total | fim visível | próximo | corte no meio de palavra |
|---|---|---|---|---|---|
| Carpal Tunnel | sim | 108/108 | `...Learn what causes it...` | (fim) | **não** |
| Kneecap Pain | sim | 111/111 | `...sitting. Learn what...` | (fim) | **não** |
| Snapping Hip | sim | 108/108 | `...trochanter), internal...` | (fim) | **não** |
| Chronic Lower Back Pain | não | 103/103 | `...physical deconditioning...` | (fim) | **não** |
| Hamstring Tendinosis | não | 99/103 | `...the ischium is a ` | `"k"` | **não** |
| Trochanteric Bursitis | não | 96/111 | `...(medius/minimus) ` | `"t"` | **não** |
| Runner's Knee | não | 101/109 | `...against the lateral ` | `"f"` | **não** |
| Frozen Shoulder | não | 107/110 | `...a capsular pattern ` | `"o"` | **não** |
| Whiplash | não | 103/110 | `...acceleration-deceleration. ` | `"S"` | **não** |

**Nove de nove: nenhuma palavra partida.** Em todos os casos o último caractere
visível é um espaço e o seguinte é a primeira letra da palavra seguinte — o
corte cai exatamente entre palavras.

Era o defeito que a T-1 descreve (*"History is full of treatments that
doctor..."*). Não se repete.

### A ressalva: em 5 de 9 cartões, quem corta não é `cortarEmPalavra`

Olhando a coluna "visíveis / total": nos quatro cartões onde tudo cabe, o texto
que `cortarEmPalavra(desc, 110)` produziu aparece **inteiro**, com a reticência
dela. Nos outros cinco, o texto pré-cortado ainda precisa de **três** linhas e o
`numberOfLines={2}` descarta a terceira.

A causa é de largura, e é medível:

| coluna de texto | largura | cabe em 2 linhas |
|---|---|---|
| cartão **com** capa | **354,67px** | ~110 caracteres |
| cartão **sem** capa | **308,67px** | ~95 caracteres |

O ícone de tipo (36px) mais o espaço (10px) tiram 46px da coluna, e o orçamento
de 110 caracteres foi calibrado para a coluna larga.

Na prática **não produz corte no meio de palavra** — nem no navegador, que
quebra em espaço por padrão, nem no aparelho, onde o `numberOfLines` do React
Native também quebra em palavra. O que se perde é a intenção declarada no
`cortarEmPalavra` (*"quem corta somos nós — e no lugar certo"*): nesses cinco
cartões quem corta é a rede, não a régua. Um efeito visível é a reticência ficar
depois de um espaço (`...lateral ...` em vez de `...lateral...`).

**Sugestão, se valer mexer:** passar o limite conforme o cartão tem capa ou não
— 110 com capa, ~95 sem. É um argumento a mais na chamada, não uma abstração.

---

## 1.3 — o cartão sem imagem não vira buraco cinza

Dez cartões na lista, medidos:

| | quantidade | ícone de tipo | altura do cartão |
|---|---|---|---|
| com capa | 3 | nenhum | 321 a 362px |
| **sem capa** | **7** | **36x36px, todos** | **107px** |

Nenhum dos sete desenha capa. O cartão inteiro tem 107px de altura: título,
descrição e etiquetas, e nada mais. Um retângulo cinza de 214px no lugar de uma
imagem que não existe custaria o dobro da altura para não dizer nada.

Screenshot: `screenshots/t-1-lista-claro-sem-capa.png`

### A seta saiu

Procurei `chevron` no HTML dos dez cartões — glifo do Ionicons incluído.
**0 de 10.** O cartão inteiro é o alvo do toque e nada repete isso tirando
largura do título.

---

## 1.4 — contraste medido, nos dois temas

### Claro (fundo do cartão `rgb(255,255,255)`, da tela `rgb(245,244,241)`)

| elemento | texto | fundo | tamanho/peso | **contraste** |
|---|---|---|---|---|
| título | `rgb(32,36,45)` | `rgb(255,255,255)` | 15,5px / 700 | **15,54** |
| descrição | `rgb(74,79,89)` | `rgb(255,255,255)` | 12px / 400 | **8,22** |
| cabeçalho de seção | `rgb(74,79,89)` | `rgb(245,244,241)` | 11px / 700 | **7,48** |
| etiqueta "Solo topic" | `rgb(74,79,89)` | `rgb(237,243,239)` | 10px / 400 | **7,31** |
| etiqueta "article" | `rgb(70,88,122)` | `rgb(237,240,245)` | 10px / 400 | **6,26** |
| etiqueta "Required" | `rgb(130,102,55)` | `rgb(243,236,221)` | 10px / 600 | **4,57** |

### Escuro (fundo do cartão `rgb(32,36,45)`, da tela `rgb(25,28,35)`)

| elemento | texto | fundo | tamanho/peso | **contraste** |
|---|---|---|---|---|
| título | `rgb(245,244,241)` | `rgb(32,36,45)` | 15,5px / 700 | **14,13** |
| cabeçalho de seção | `rgb(201,203,209)` | `rgb(25,28,35)` | 11px / 700 | **10,51** |
| descrição | `rgb(201,203,209)` | `rgb(32,36,45)` | 12px / 400 | **9,58** |
| etiquetas de categoria | `rgb(201,203,209)` | `rgb(30,42,36)` | 10px / 400 | **9,17** |
| etiqueta "Required" | `rgb(198,162,106)` | `rgb(42,36,24)` | 10px / 600 | **6,44** |
| etiqueta "article" | `rgb(143,163,196)` | `rgb(30,36,48)` | 10px / 400 | **6,08** |

**Todos passam o AA (4,5:1).** O pior valor da tela inteira é **4,57**, na
etiqueta "Required" no tema claro — passa, mas com 0,07 de folga. Se algum dia
esse amarelo mudar, é o primeiro a cair; vale medir o novo antes de trocar.

No escuro o pior é 6,08 e a maioria passa também o AAA (7:1).

Screenshots: `screenshots/t-1-lista-escuro.png` e
`screenshots/t-1-lista-escuro-topo.png`

---

## 1.5 — "Required" e "article" distinguíveis entre si

Uma é obrigação, a outra é formato. Medi a distância entre elas, não a
impressão:

| tema | contraste "Required" | contraste "article" | **distância entre os dois textos** | distância entre os dois fundos |
|---|---|---|---|---|
| claro | 4,57 | 6,26 | **deltaE76 = 52,6** | deltaE76 = 10,9 |
| escuro | 6,44 | 6,08 | **deltaE76 = 53,6** | deltaE76 = 17,8 |

O limiar em que a maioria das pessoas percebe diferença de cor é deltaE ~2,3.
**52,6 e 53,6** são mais de vinte vezes isso — uma é âmbar, a outra é azul, e
não há como confundir. E a diferença não é só de cor: "Required" vem em peso
600, "article" em 400.

O fundo das duas está mais próximo (10,9 e 17,8), mas continua acima do limiar,
e não é o fundo que carrega a informação.

---

## Erros de console

Do app, na sessão inteira: 4 erros. Um é a minha sonda de login antes de a API
estar de pé; os outros três são capas que o servidor tentou servir de
`localhost:3000` (ver o relatório da T-3, achado 3). **Nenhum vem do desenho do
cartão.**

Avisos: só dois únicos, ambos do build web (`expo-notifications` na web,
`props.pointerEvents` obsoleto no React Native Web).

---

## Falhas e recomendações

Nenhum cenário reprovou.

1. **O orçamento de corte não acompanha a largura da coluna** (detalhado acima).
   Não produz corte no meio de palavra, mas em 5 de 9 cartões a régua deixa de
   ser a nossa. Um limite por variante de cartão resolve.

2. **"Required" com 4,57 no tema claro** é o valor mais apertado da tela. Passa.
   Fica anotado porque é o que quebra primeiro se o âmbar mudar.
