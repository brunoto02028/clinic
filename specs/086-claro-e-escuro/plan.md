# Atividade 086 — Claro e escuro

**Status:** T-1 implementada · QA pendente
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
| T-1 | Paleta escura, preferência e a escolha na conta | implementada · QA pendente |
| T-2 | Varredura das telas que cravam cor | pendente |
| T-3 | "Seguir o aparelho" (depende de um build) | bloqueada |

## O que a T-2 tem de alcançar

Estas telas cravam cor e **não acompanham o tom escuro**:

```
app/(app)/(clinica)/messages.tsx        5 ocorrências
app/(app)/(clinica)/blood-pressure.tsx  5
src/components/ui/Button.tsx            4
src/components/FileViewer.tsx           4
app/(app)/(ba)/(tabs)/work.tsx          4
app/index.tsx                           3
src/components/ui/Logo.tsx              2
src/components/LockOverlay.tsx          2
src/components/ExerciseVideo.tsx        2
app/(app)/(treino)/_layout.tsx          2
app/(app)/(nutricao)/_layout.tsx        2
```

**Algumas dessas cores podem ser acento de marca de propósito** (o `SAGE` e o `AMBER` das telas do
laboratório, por exemplo). A varredura precisa do Bruno olhando, não de uma substituição em massa.

## Suposições

1. **Dois modos agora, três depois.** `"system"` entra quando houver build.
2. **A preferência é do aparelho, não da conta.** Trocar de telefone recomeça no claro; sincronizar
   isso com o servidor é outra conversa.
3. **O vão antes das fontes continua da cor do splash** (`#F5F4F1`), que vive no `app.json`.
   Divergir dela faria a transição piscar.
4. **Diálogos do sistema seguem claros** enquanto `userInterfaceStyle` for `light` — um
   `Alert.alert` sobre tela escura vai parecer claro. Resolve-se com o mesmo build da T-3.
