# Atividade 086 — Claro e escuro

**Status:** T-1 e T-2 concluídas (QA aprovado) · T-3 bloqueada por build
**Data:** 26/09/2026

## Objetivo

> "nós queremos usar sempre os dois tons, o claro e o escuro. Ter essas opções é extremamente
> importante na dinâmica e na beleza do design do app." — Bruno

O app tinha **uma** paleta (`themes = { light }`), e a tela do seletor de áreas tinha `#20242D`
cravado no código — era a única escura, e não por escolha de tema. O Bruno via escuro ali e claro em
todo o resto, e pediu a escolha.

## Decisões de design

### 1. A escolha é manual, e por isso **não precisa de build**

`app.json` tem `userInterfaceStyle: "light"`, que força aparência clara no iOS — com ela,
`useColorScheme()` responde `"light"` para todo mundo, inclusive para quem usa o telefone no escuro.
Trocar para `"automatic"` muda o fingerprint e **obriga um build novo**, cortando a entrega de
updates ao binário instalado.

A escolha manual não depende disso: se a pessoa pede escuro, usamos a paleta escura. Quando houver
um build por outro motivo, `"automatic"` entra junto e o terceiro modo — **seguir o aparelho** —
aparece sem custo.

### 2. O escuro não é o claro invertido

Inverter escurece o que precisa clarear: o verde da marca (`#4F7361`) sobre fundo escuro dá
**1,9:1** — ilegível. Os pilares e os estados foram **clareados mantendo o matiz**, e os "Soft" (no
claro, fundos pálidos) viraram fundos escuros tingidos do mesmo tom. Alvo de 4,5:1, o mesmo do claro.

O fundo é um degrau **abaixo** do `ink` de propósito, para o card poder ser o próprio `ink` e a
hierarquia continuar existindo — no claro o card é mais claro que o fundo; no escuro também.

### 3. Dois botões, não um interruptor

"Claro / Escuro" lado a lado mostra o que existe. Um switch obriga a descobrir o que o estado
desligado significa.

### 4. A preferência é lida antes da primeira tela pintar

Senão o app abre claro e troca para escuro um instante depois — uma piscada branca na cara de quem
escolheu escuro justamente para não levar luz no rosto.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | Paleta escura, preferência e a escolha na conta | **concluída** — `qa/report-t-1.md` |
| T-2 | Varredura das telas que cravam cor | **concluída** — mesmo relatório |
| T-3 | "Seguir o aparelho" (depende de um build) | bloqueada |

## O que a T-2 alcançou

A lista original desta seção estava **errada** — foi tirada de uma contagem de ocorrências de hex por
arquivo, e contagem não separa defeito de acerto. Cinco dos seis defeitos que o QA mediu estavam em
arquivos que ela não listava (`Avatar`, `SegmentedControl`, `HeaderBack`, `ProfilePhotoPicker`,
`login`/`register`), porque cada um tem **uma** cor cravada — e a que importa.

O critério que funcionou não é "quantas cores tem" e sim **"esta cor está em cima de quê"**:

- cor cravada em cima de um **acento** (verde, azul, âmbar, vermelho) → defeito, porque o acento muda
  de valor entre os tons;
- cor cravada em cima de **preto** (visor de arquivo, vídeo, véu sobre miniatura) → acerto, porque o
  fundo não muda;
- cor cravada como **fundo** de tela ou card → defeito.

Treze nós corrigidos, medidos antes e depois. Três tokens novos, nenhum valor novo inventado —
`accentFg`, `accentFgSoft` e o par `segmentTrack`/`segmentThumb`. Detalhe e números em
`qa/report-t-1.md`.

### O que ficou fora, de propósito

| o que | por que |
|---|---|
| Card "próxima sessão" da home da clínica | decisão de design: consertar o escuro **muda o claro**, que já está aprovado |
| Telas da BA (`work`, `community`, `onboarding`, `invoice`) | *"a BA pode deixar fora, com certeza"* — Bruno |
| `FileViewer`, `ExerciseVideo`, miniplay dos exercícios | fundo preto nos dois tons; temar ali apagaria o texto |

## Suposições

1. **Dois modos agora, três depois.** `"system"` entra quando houver build.
2. **A preferência é do aparelho, não da conta.** Trocar de telefone recomeça no claro; sincronizar
   isso com o servidor é outra conversa.
3. **O vão antes das fontes continua da cor do splash** (`#F5F4F1`), que vive no `app.json`.
   Divergir dela faria a transição piscar.
4. **Diálogos do sistema seguem claros** enquanto `userInterfaceStyle` for `light` — um
   `Alert.alert` sobre tela escura vai parecer claro. Resolve-se com o mesmo build da T-3.
