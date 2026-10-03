# T-7: O relatório que acabei de pedir não está no topo

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que o relatório que o paciente pediu agora apareça em primeiro na lista dele.

## Contexto

`app/api/patient/reports/route.ts:40` ordena por `periodStart: "desc"`.

Um relatório a pedido cobre **90 dias por omissão**, logo o `periodStart` dele é
de há três meses. Um relatório semanal gerado há duas semanas tem `periodStart`
mais recente. A lista põe o semanal antes do que a pessoa acabou de pedir.

Carregar o botão e não ver o resultado no topo lê-se como *"não funcionou"* — e
a pessoa carrega outra vez, que é o caso da T-8.

## Passos

1. Ordenar por `createdAt: "desc"` — é a ordem em que a pessoa os viu nascer, e é
   a que o `reaproveitarRelatorio` já usa para escolher o último.
2. O `periodStart` continua a ser **mostrado**: é o que diz de que período é o
   papel. O que muda é a ordem, não a informação.
3. `take: 52` fica: 52 semanas é um ano de relatórios semanais.

## Arquivos afetados

- `app/api/patient/reports/route.ts`
- `__tests__/wearables/o-relatorio-recem-pedido-fica-no-topo.test.ts` (novo)

## Critérios de aceite

- [ ] Um relatório a pedido criado agora, com período de 90 dias, vem antes de um
      semanal criado há duas semanas
- [ ] A lista continua a trazer `periodStart` e `periodEnd`
- [ ] Mutação: voltar a `periodStart` mata um teste nomeado
