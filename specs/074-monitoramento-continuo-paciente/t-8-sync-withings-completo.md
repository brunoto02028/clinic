# T-8: Sync Withings completo — SpO2, HRV, temperatura, FC intraday, ECG

**Status:** pendente
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

## Arquivos afetados
- `lib/withings.ts`
- `app/api/wearables/sync/route.ts`
- `prisma/schema.prisma` (só se faltar coluna)

## Critérios de aceite
- [ ] Conta com SpO2/HRV/temperatura traz os três
- [ ] Conta sem eles sincroniza o resto sem erro
- [ ] Nada é inventado: métrica ausente aparece como ausente, não como zero
- [ ] Token expirado renova e o sync continua (o refresh token da Withings gira a cada uso)
