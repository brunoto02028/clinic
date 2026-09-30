# T-4: Cada interruptor diz o que acende

**Status:** 🟢 concluída (30/09) — QA pendente
**Depende de:** T-2

## Objetivo

Que o nome no painel seja o nome que o paciente vê.

## Contexto

| o painel diz | o app mostra |
|---|---|
| BPR Journey | **Daily check-in** |
| Education | **Articles** |
| My Records | **Outcome measures** e **My reports** |
| Plans & Membership | Plans |

O primeiro é o pior: ligar "BPR Journey" faz aparecer o check-in diário, que é
outra coisa. O último é só nome curto no telefone, não defeito.

Depois da T-2, `mod_records` deixa de ser ambíguo — o prontuário passa a ser
`mod_clinical_notes` —, mas o rótulo *My Records* continua governando medidas e
relatórios, e precisa de dizer isso.

## O que foi feito, e por que não foi renomear

Renomear os quatro rótulos resolveria hoje e voltaria a divergir na próxima tela
que alguém acrescentasse. Em vez disso, o catálogo passou a **declarar o que cada
interruptor acende**, com o nome que o paciente lê no telefone:

```ts
mostraNoApp?: Array<{ en: string; pt: string }>;
```

Doze módulos declaram; os quatro sem tela declaram vazio. **As duas telas**
mostram a linha *"In the app: Daily check-in"* / *"No app: Check-in diário"*
abaixo da descrição.

Nas duas de propósito: a tela de padrão decide o que **todo** paciente novo
recebe, e é onde alguém marcaria *BPR Journey* achando que está dando a jornada
quando está dando o check-in diário. O QA da T-1 tinha apontado essa assimetria
— lá o selo aparecia nas duas e a frase que explica *por quê*, só numa.

**O par EN/PT e não só o inglês:** o painel em português tem de dizer
*"Check-in diário"*. Uma tradução errada ali só apareceria para quem usa a tela
em português — quer dizer, tarde.

**E é cobrado contra o menu de verdade**, nos dois sentidos:

- todo nome declarado tem de existir no menu, **sob a chave declarada**, e com o
  mesmo português;
- toda linha do menu com chave tem de estar declarada — sem este, declarar
  metade passaria: o painel diria "acende A" quando acende A e B, e o B voltaria
  a ser surpresa.

## A decisão do Bruno sobre o BPR Journey

> *"o BPR Journey ainda preciso revisar o conteúdo dele… só quero ele dentro das
> opções de aparecer ou não para o paciente no app por enquanto"*

Então **o interruptor continua um só**, com o nome que ele quer. O que mudou é o
painel parar de esconder que hoje ele acende o **check-in diário** — a tela da
jornada não existe no app; a da web existe e é a mesma chave.

Isto está travado por um teste nomeado, para não se perder quando o conteúdo for
revisto.

## O que **não** foi renomeado, e por quê

`Plans & Membership` → *Plans* no app é o mesmo lugar com nome curto no telefone,
não defeito. A declaração já diz qual é.

## Arquivos afetados

- `lib/module-registry.ts`
- possivelmente `mobile/app/(app)/(clinica)/(tabs)/profile.tsx`

## Critérios de aceite

- [x] Nenhum rótulo do painel nomeia coisa que o app não mostra com esse nome
- [x] Módulo que governa vários itens os lista
- [x] Um teste que compara a declaração com o menu do app, **nos dois sentidos**
- [x] O português é cobrado junto com o inglês

## Provas

`__tests__/permissoes/o-painel-nao-promete.test.ts` — 21 cenários no total.

**Por mutação:** um português errado (`"Jornada BPR"` no lugar de
`"Check-in diário"`) derruba 2 e diz exatamente o que diverge; declarar só
metade do que `mod_screening` acende derruba 1 e nomeia o item omitido.
