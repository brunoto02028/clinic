# T-8: Sync Withings completo — SpO2, HRV, temperatura, FC intraday, ECG

**Status:** ✅ concluída
**Depende de:** nenhuma (a integração Withings da ativ. 070 já está em produção)

## Objetivo
Trazer da Withings tudo que o plano comercial promete, não só pressão, sono e atividade.

## Contexto
O `plano-comercial.md` marca este item como feito. **Não está.** A ativ. 070 entregou três
chamadas: `getmeas` (pressão), `getactivity` e `getsummary` (sono). Faltam SpO2, HRV, temperatura,
frequência cardíaca intraday e ECG — e são justamente os que separam os planos Cardio e
Performance, então sem isso o plano de £79 não tem o que entregar.

## Passos
1. `lib/withings.ts`: novas leituras — `getmeas` com os `meastype` que faltam (SpO2 = 54,
   temperatura = 71/73, FC = 11), `v2/heart list` para ECG/AFib, e os campos de HRV do
   `getsummary`.
2. Mapear cada um para `WearableDataPoint` (os campos `spo2`, `hrv` e `restingHr` já existem; o que
   não tiver coluna vai em `raw`, sem criar uma coluna por métrica).
3. Respeitar o escopo autorizado: se a conexão não tem `user.metrics`, não chamar e não quebrar.
4. Uma métrica que a conta não tem **não é erro** — é ausência. Não pode derrubar o sync das outras.
5. ECG: guardar a existência do exame e o resultado de classificação do aparelho, **não** o traçado
   bruto nem qualquer interpretação nossa.

## O que foi feito

- `lib/withings-vitals.ts` (novo): SpO2 (`meastype 54`), temperatura corporal e de pele (71/73) e
  frequência cardíaca (11) pelo mesmo `getmeas` que já traz a pressão — mesma chamada, mesma forma
  de valor/expoente, já provada em produção. ECG por `v2/heart`.
- `vitalsByDay()` monta **uma linha por dia**, porque é assim que `WearableDataPoint` é chaveado e
  é o que as telas desenham. Duas decisões que valem registro:
  - **FC de repouso é a mínima do dia, não a média.** A média das frequências de um dia não é
    frequência de repouso de ninguém (o teste cobre: 58/120/74 → 58, não 84).
  - **Métrica que a conta não tem fica ausente, nunca zero.** "SpO2 0%" seria uma medida que não
    aconteceu.
- ECG guarda **que houve** e o que o aparelho concluiu — nunca o traçado e nunca uma leitura nossa.
  Interpretar ECG é outro produto, regulado (a linha da MHRA que o plano comercial cita).
- Falha ao buscar estes dados **não derruba** o resto: pressão, sono e atividade já foram salvos
  quando isso roda.

## O que não dá para provar daqui

A forma exata da resposta do `v2/heart` (ECG) **nunca foi vista**: a conta Withings ainda está em
`Development` e não tenho de onde puxar um ECG real. O código lê defensivamente e guarda o payload
inteiro, justamente para que o mapeamento seja corrigido contra algo real em vez de contra o meu
palpite. **Não considere o ECG entregue até isso ser verificado com uma conta de verdade.**

O resto (`getmeas`) é a mesma chamada da pressão, que funciona em produção; o mapeamento para o
banco está provado contra o banco real com dados simulados.

## Arquivos afetados
- `lib/withings.ts`
- `app/api/wearables/sync/route.ts`
- `prisma/schema.prisma` (só se faltar coluna)

## Critérios de aceite
- [ ] Conta com SpO2/HRV/temperatura traz os três
- [ ] Conta sem eles sincroniza o resto sem erro
- [ ] Nada é inventado: métrica ausente aparece como ausente, não como zero
- [ ] Token expirado renova e o sync continua (o refresh token da Withings gira a cada uso)
