# T-1: A janela decide de quem é cada medição

**Status:** concluído (03/10/2026) — QA e review feitos
**Depende de:** nenhuma

## Objetivo

Num aparelho que serve o dono **e** os pacientes, nenhuma medição cai na ficha
errada. A ação que diz de quem é já existe — a **janela de medição** que a
clínica abre na ficha do paciente antes de medir. Esta tarefa fá-la valer para
mais do que pressão.

## Contexto

O pedido do Bruno, sobre o BeamO:

> *"Eu quero que esse equipamento sirva para mim e sirva também para os
> pacientes. Quando eu for usar para o paciente eu tenho que ter algum tipo de
> ação, mas ele vai estar sincronizado com a minha conta."*

E, depois:

> *"O relógio cai em mim sempre. O BeamO pode ir tanto pra mim quanto para o
> paciente, eu escolho na hora de usar."*

A 092 T-1 já calava a ligação **pessoal** para pressão quando a mesma conta
Withings também é aparelho de clínica. Mas o BeamO mede **ECG, temperatura e
SpO₂**, e esses entravam pela pessoal sem passar por atribuição nenhuma.

## A regra

```
a janela decide  =  não é aparelho de pulso  E  a medição cai dentro de uma janela
```

- **dentro da janela** → não é do dono; é de quem a janela nomear;
- **fora da janela** → é dele, e entra como sempre (sem toque nenhum, que é o
  que ele pediu);
- **aparelho de pulso** → é sempre dele, haja janela ou não. Um relógio está no
  pulso de uma pessoa; não há instante que o torne de outra.

`APARELHOS_DE_PULSO` tem **só** os códigos vistos numa resposta real (`93`
ScanWatch, `94` ScanWatch 2). O `91` (Move ECG) é de pulso pela documentação
deles mas não o vimos, e um palpite aqui manda a medição de uma pessoa para a
ficha de outra.

## Porque não bastava calar a ligação pessoal

Era a minha primeira proposta, e estava errada: o ScanWatch dele mede ECG e
SpO₂ **dele**. Calar a pessoal custava-lhe o ECG do próprio relógio — uma
correção que tira mais do que o defeito que conserta.

## Arquivos afetados

- `lib/withings-routing.ts` — `APARELHOS_DE_PULSO`, `aJanelaDecide`,
  `ehDeQuemFoiMedido`
- `lib/withings-vitals.ts` — `WithingsEcgRecord.deviceId` / `.deviceModel`
- `lib/withings-ingest.ts` — `janelasDaClinica`, `medidaNoutraPessoa`, e os
  filtros dos vitais e do ECG
- `__tests__/wearables/o-aparelho-partilhado-sabe-de-quem-e.test.ts`

## Critérios de aceite

- [x] Dentro de janela, a ligação pessoal não escreve ECG nem vitais
- [x] Fora de janela, escreve — sem exigir ação
- [x] Aparelho de pulso é sempre do dono, mesmo com a janela aberta — **só para
      o ECG**. Nos vitais a resposta da Withings não traz o modelo do aparelho, e
      o `getdevice` que o traria exige um scope que não temos. Ver G4 no review e
      a T-3; até lá, um SpO₂ do relógio dele medido dentro de uma janela é
      descartado em vez de ir para a ficha errada.
- [x] Aparelho desconhecido (`null`) **não** é tratado como de pulso: o erro cai
      do lado de não pôr a medição de um paciente na ficha do dono
- [x] O log diz quantas medições ficaram de fora — uma medição que não entra não
      pode ser silenciosa
- [x] QA aprovado (`qa/report-t-1-e-t-2.md`)
- [x] Code review feito (`qa/review-t-1-e-t-2.md`) — 10 achados, 2 críticos, todos dispostos
