# QA — T-10: a pegada da referência

**Data:** 04/10/2026
**Veredicto:** aprovado, com duas dívidas escritas (splash e `surfaceMuted`)

## O que foi medido, e como

Esta tarefa é visual e o aparelho do Bruno está a dormir com ele, por isso o QA
não é por screenshot: é por **régua**. O que se mediu foi (a) a geometria do
desenho, calculada em 101 pontos, (b) o contraste de toda a tinta contra toda a
superfície nos dois temas, e (c) a ligação da tela às funções que decidem.

Nenhuma destas três coisas um screenshot apanharia — e o defeito mais grave da
tarefa (o anel a desenhar um quarto de volta) estava verde em cinco testes
quando eu o declarei pronto.

## Portões

| portão | resultado |
|---|---|
| `npx jest` | **4175 passam**, 284 suítes, 0 falhas |
| `npm run typecheck:mobile` | limpo |
| `npx tsc --noEmit` (raiz) | limpo |
| `NEXT_DIST_DIR=.build-verify npx next build` | compila |
| bytes de controlo (`0x08`) no código | 0 |
| dependências novas em `mobile/package.json` | nenhuma |

A suíte era de 4047 antes desta tarefa; os 128 novos são o teste de contraste
(129 asserções sobre 15 tintas × 4 superfícies × 2 temas), o do anel (29) e o da
ligação da tela (8), menos os que foram reescritos.

## O desenho do anel, ponto por ponto

`arcoVisivel()` soma os graus de anel que sobrevivem ao recorte das duas
metades. A régua é `progresso × 360`.

| passos (meta 8.000) | graus esperados | medido | a versão errada dava |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 800 | 36 | 36 | **0** — não aparecia nada |
| 2.000 | 90 | 90 | 45 |
| 3.000 | 135 | 135 | 90 |
| 4.000 | 180 | 180 | 90 |
| 4.800 | 216 | 216 | **90** — igual aos 4.000 |
| 6.000 | 270 | 270 | 134 |
| 7.200 | 324 | 324 | 180 |
| 8.000 | 360 | 360 | **180** — dois quartos opostos |
| 12.000 | 360 (fecha e fica) | 360 | 180 |

Mais 101 pontos contínuos (0 a 100 %), a exigir que o arco cresça sempre e nunca
salte.

## O contraste, 15 tintas × 4 superfícies × 2 temas

Todas ≥ 4,5 (piso WCAG AA), exceto a lista fechada da dívida antiga. Os valores
que esta tarefa **mexeu**:

| par | antes desta tarefa | depois | piso |
|---|---|---|---|
| `health` / fundo claro | 4,37 | **4,57** | 4,5 |
| `community` / fundo claro | 4,19 | **4,68** | 4,5 |
| `labWarm` / fundo claro | 4,31 | **4,51** | 4,5 |
| `ok` / fundo claro | 4,47 | **4,68** | 4,5 |
| `warn` / fundo claro | 4,43 | **4,64** | 4,5 |
| cartão / fundo claro | 1,21 | 1,16 | 1,15 |
| `segmentTrack` / cartão escuro | 1,05 | **1,18** | 1,15 |
| `segmentTrack` / fundo claro | 1,01 | **1,17** | 1,15 |
| `segmentThumb` / `segmentTrack` escuro | 1,33 | 1,35 | 1,15 |
| trilho do anel / cartão escuro | 1,10 | **1,23** | 1,15 |

## As dez mutações

Cada uma repõe um defeito que o review achou, e tem de matar um teste **com
nome**. Controlo (sem mutação) verde antes e depois de cada uma.

| # | mutação | testes mortos |
|---|---|---|
| M1 | o anel volta a pintar **um** lado da borda por metade | 1 |
| M2 | `OFFSET_DA_BORDA` vai a 0 (o arco descola das 12 h) | **10** |
| M3 | a percentagem volta a cortar nos 100 % | 2 |
| M4 | `estadoDoAnel` deixa de olhar para o dia | 1 |
| M5 | a tela deixa de passar `dia` ao anel | 1 |
| M6 | a guarda volta a testar a métrica em vez da meta | 3 |
| M7 | o fundo claro volta a `#EBE9E3` | **9** |
| M8 | `segmentTrack` escuro volta a `palette.ink` | 1 |
| M9 | o ramo claro do `_layout` volta ao literal do splash | 1 |
| M10 | o trilho do anel volta a `borderSubtle` | 1 |

## Cenários da `qa-spec`, cobertos por teste

| cenário | onde |
|---|---|
| paciente com meta e leitura de hoje → anel com a fracção certa | `o-anel-nao-inventa-meta` |
| paciente com meta e leitura de sábado → anel não afirma progresso | idem |
| paciente sem meta nenhuma → **a fila não aparece** | `a-fila-de-metas-liga-se-ao-que-decide` |
| metas a carregar, ou o pedido a falhar → a fila não aparece (não diz "sem meta") | idem |
| acima da meta → anel fechado, número a dizer a fracção inteira | `o-anel-nao-inventa-meta` |
| leitor de ecrã em inglês → rótulo em inglês | `AnelDeMeta` via `tr()` |

## O que **não** foi verificado, e precisa do Bruno

1. **A pegada, com os olhos.** Toda a geometria aqui é calculada. Que o anel
   pareça bem num ecrã de 6" com o polegar à frente é coisa que só se vê a
   abrir. O `eas update` vai publicado; é o primeiro item de amanhã.
2. **O splash.** A piscada de abertura ficou mais forte no escuro (15,50 →
   17,41) e passou a existir no claro (1,00 → 1,10). Não entra por update —
   `app.json` só muda com build.
3. **`surfaceMuted` do tema claro**, com `health` 4,41, `labWarm` 4,35 e `warn`
   4,47. Não vem desta tarefa. Consertar é escolher entre escurecer três cores
   de marca ou clarear uma superfície usada em 75 sítios.
4. **`community` escureceu 4 %** (`#926531` → `#8C612F`). É cor de marca, decidi
   por número e está escrito no token para ser contestado.
