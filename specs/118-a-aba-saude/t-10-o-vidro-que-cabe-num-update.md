# T-10: A pegada da referência, dentro de um update

**Status:** concluído (04/10/2026)
**Depende de:** T-9

## O pedido, e como ele mudou a meio

> *"lembra daquela característica vidrificada?"* — Bruno, 04/10/2026

Comecei pelo vidro translúcido (a prévia de 01/10 dizia *"escuro, cartões de
vidro, hierarquia tipográfica"*). Montei as duas versões num HTML para ele ver,
clara e escura, e a resposta foi outra coisa:

> *"quero essa pegada"* — com uma imagem de referência. E depois: *"isso mesmo,
> implementa e publica"*.

A referência não era vidro. Era **fundo quase preto, cartões com aresta, anéis
de meta e um ladrilho com ícone por métrica**. A tarefa passou a ser essa.

## A restrição que não mudou: isto tem de caber num `eas update`

`expo-blur` e `react-native-svg` **não estão instalados**. Instalar qualquer um
deles é dependência nativa, e isso **muda o fingerprint do runtime**: a partir
daí os `eas update` deixam de chegar ao binário que o Bruno tem no telemóvel —
só a um build novo.

Então: zero dependências novas. O anel de progresso é feito de `View`,
`overflow: hidden` e `transform`.

## O que foi feito

| peça | ficheiro |
|---|---|
| paleta escura para quase preto, clara um degrau abaixo do branco | `mobile/src/theme/index.ts` |
| a aritmética e os estados do anel | `mobile/src/lib/anel-calculo.ts` |
| o anel | `mobile/src/components/AnelDeMeta.tsx` |
| fila "Metas de hoje" + ficha de ícone em cada ladrilho | `(tabs)/saude.tsx` |
| a vista raiz deixa de cravar cor | `mobile/app/_layout.tsx` |

## Como o anel desenha sem biblioteca de desenho

Duas metades, cada uma um recorte de meio plano (`overflow: hidden`) com meio
anel lá dentro, rodado. A metade direita cobre 0–50 % do progresso; a esquerda,
50–100 %.

**Meio anel são dois lados adjacentes da borda, não um.** Num quadrado com
`borderRadius` de 50 %, as junções entre cores de lado correm nas diagonais:
cada lado pinta 90° de arco. `top`+`right` dão 180°, e levam `+45°` de rotação
para o arco começar nas 12 horas.

Eu escrevi a primeira versão com **um** lado por metade. Ver mais abaixo.

## O que o review de 04/10 achou, e o que mudou por causa dele

### 1. O anel desenhava um quarto de volta (ALTO)

Pintava um lado da borda por metade: 90° em vez de 180°. Três defeitos
visíveis — de 0 a 12,5 % não aparecia nada; entre 37,5 % e 50 % o arco descolava
do topo e deslizava para baixo; e a 100 % desenhava **dois quartos opostos**,
uns parênteses rodados, que se leem como metade.

Os cinco testes dos ângulos estavam verdes, e estavam certos: o que estava
errado não eram os ângulos. Passou a haver `arcoVisivel(a)`, que mede **graus de
anel que sobrevivem ao recorte**, e a régua é `progresso × 360` em 101 pontos. E
os lados saíram do JSX para `ladosPintados()`.

### 2. A fila dizia "hoje" com o valor de sábado (ALTO)

O anel não recebia `dia`; a `BarraDeMeta` doze linhas abaixo recebia. Um relógio
que sincronizou por último no sábado dá 14.200 passos a uma terça parada: a fila
mostrava o anel cheio sob o cabeçalho "METAS DE HOJE", em cima do ladrilho que
dizia "Leitura de outro dia". Contradiziam-se na mesma tela, e a afirmação
errada era a de cima e a maior. É o mesmo achado que o review de 02/10 tinha
feito na barra — o anel nasceu sem o `dia` e repetiu-o.

Agora há `estadoDoAnel(valor, meta, dia)` com três saídas: `sem-meta`,
`outro-dia`, `progresso`. Uma decisão, num sítio.

### 3. A fila aparecia sem meta nenhuma (ALTO/MÉDIO)

A guarda testava se a **métrica existe** (`d.chave === "passos"`), não se tem
meta. As metas são opt-in (T-7), logo o caso mais comum — ligou a Withings,
nunca abriu `/metas` — via "METAS DE HOJE" com dois círculos vazios e dois
travessões.

Pior: `metas.data` ainda `undefined` (a carregar, ou **para sempre** se o pedido
falhar) fazia toda a meta ler como ausente, e o anel afirmava *"sem meta
definida"* a quem tem meta. Falha nossa com a cara de escolha dela — a espécie
de defeito que esta base já pagou caro. Sem metas carregadas a fila não aparece;
o número continua no ladrilho de baixo.

### 4. O fundo claro novo pôs **cinco** tintas abaixo do piso (MÉDIO)

Eu escolhi `#EBE9E3` medindo **uma** cor, o cinzento apagado. O review mediu as
onze: `health` 4,37, `community` 4,19, `labWarm` 4,31, `ok` 4,47, `warn` 4,43 —
com o piso da WCAG em 4,5. São as cores do preço do exame, do número do
resultado e de cada rótulo de pilar. A paleta inteira está construída sobre o
bege; mexer no fundo é mexer no chão dela.

`#F0EEE8` é o degrau que serve os dois lados: o cartão branco separa-se em
**1,16** e a tinta fica toda acima de 4,5 — menos uma.

**A que sobrou é mudança de cor de marca, e está aqui para ser contestada:**
`community` foi de `#926531` para `#8C612F`, 96 % do brilho, o mesmo matiz
(4,38 → 4,68 sobre o fundo; 4,83 sobre o próprio `Soft`; 5,43 sobre o cartão).
Já tinha sido escurecido 13 % em 26/09 pela mesma régua. O outro caminho era
devolver o fundo ao bege e perder a separação do cartão — a pegada que o Bruno
aprovou.

### 5. O controle segmentado desaparecia (MÉDIO)

No escuro, `segmentTrack` era `palette.ink` (`#20242D`) — **a cor do cartão
antigo**. Com o cartão a ir para `#1F2024`, o trilho ficou a 1,05 contra ele: o
controle deixava de existir dentro de qualquer cartão. No claro, 1,01 contra o
fundo novo. Par novo: escuro `#2A2D34`/`#3C4150`, claro `#E0DDD5`/branco.

### 6. A costura do `_layout`, corrigida de um lado só (MÉDIO)

Arrumei o ramo escuro e deixei o claro no literal do splash: a vista raiz atrás
de todo o app em `#F5F4F1` com cada tela por cima no fundo do tema. A mesma
costura que o comentário existe para evitar, do outro lado. O teste só olhava
para o ramo escuro.

### 7. O trilho do anel não se via (MÉDIO)

`borderSubtle` dá 1,10 contra o cartão escuro. Como o trilho é o **único** sinal
de "sem meta", o paciente via um travessão solto em vez de um anel vazio. Passou
a `border` (1,23 escuro, 1,36 claro).

### 8. Dois números para o mesmo facto (BAIXO)

O anel escrevia 100 % e a barra doze linhas abaixo escrevia 150 %, porque um
cortava e o outro não. Quem corta é **o desenho** — um arco não passa da volta —
e isso é física, não informação. `percentagemDoAnel` diz a fracção inteira; o
`completo` deixou de ser calculado-testado-e-ignorado e veste o número com a cor
do pilar.

### 9. A asserção que nunca falhava (BAIXO)

`expect({par, contraste}).toEqual({par, contraste})` — o objeto contra ele
mesmo. O comentário dizia *"a mensagem leva o valor"*; não levava nada, porque o
Jest só imprime o diff de um `expect` que falha. Agora compara-se `passa` com
`true`.

### 10. O rótulo de acessibilidade só em português (BAIXO)

Um paciente com o app em inglês ouvia *"sem meta definida"*. Passou pelo `tr()`.

## Dívida assumida: o splash (precisa de build)

`app.json` tem `splash.backgroundColor: "#F5F4F1"`, sem variante escura, e não
existe entrada `expo-splash-screen` nos plugins — portanto não há onde pôr uma.
**Isto não entra por `eas update`.**

| tom | salto na abertura |
|---|---|
| escuro | era 15,50, passa a **17,41** — a piscada ficou mais forte |
| claro | era 1,00 (o splash **era** o fundo), passa a **1,10** — criou-se uma piscada |

Fica para a T-6, que é a tarefa que já espera build autorizado. O
`FUNDO_DO_SPLASH` do `_layout` continua a servir o vão antes das fontes, que é o
único sítio onde a tela tem de ser a cor do splash.

## Dívida antiga, confirmada e **não** tocada

- `surfaceMuted` do tema claro (`#EBEAE6`) com `health` 4,41, `labWarm` 4,35 e
  `warn` 4,47. Não vem desta mudança. Consertar é escolher entre escurecer três
  cores de marca ou clarear uma superfície usada em 75 sítios — decisão do
  Bruno. Está no teste como lista fechada que **só pode encolher**.
- Fora desta atividade, da mesma espécie, só a avisar: `(ba)/work/learn.tsx:37`
  usa `#E4E3DF` (cor do tema claro) como fundo nos **dois** temas — barra quase
  branca no escuro; e `src/lib/checkout.ts:22` tem `toolbarColor: "#F3F2EE"`
  fixo.

## Critérios de aceite

- [x] Nenhuma dependência nova em `mobile/package.json`
- [x] O arco que se **vê** medido, não só os ângulos calculados
- [x] Toda a tinta medida contra toda a superfície, nos dois temas, piso 4,5
- [x] A fila só aparece quando há meta, e nunca confunde "a carregar" com "sem meta"
- [x] O anel não afirma nada sobre hoje com um valor de outro dia
- [x] `eas update` chega ao binário instalado (o fingerprint não muda)
- [x] QA aprovado — [`qa/report-t-10.md`](qa/report-t-10.md)
- [x] Code review feito — 12 achados, 10 corrigidos, 2 documentados como dívida
- [x] 10 mutações, cada uma a matar um teste com nome
