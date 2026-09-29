# T-1: O telefone entrega a pressão

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

O app lê a pressão do Apple Health e do Health Connect e manda para a clínica.

## Contexto

Não há API do Hilo. O app deles escreve na saúde do telefone, e é de lá que se
lê — o que faz o caminho servir para **qualquer** aparelho que escreva ali.

`BloodPressureReading` já existe, com `source` distinguindo aparelho do paciente,
aparelho da clínica e digitado à mão.

## Passos

1. Dependência nativa de saúde (iOS HealthKit + Android Health Connect), com
   **leitura apenas** — nunca escrita. O app não devolve nada para a saúde do
   telefone.
2. Tela de consentimento própria, antes do pedido do sistema: **o que se lê,
   para quê, e quem vê**. Uma caixa do sistema sem contexto é um sim sem
   entendimento.
3. Sincronizar em lote, com marca d'água do que já foi enviado: nada de mandar
   as mesmas dezenas de leituras a cada abertura.
4. `source: PATIENT_DEVICE` e a origem real do dado (Hilo, Apple Watch, Omron)
   guardada junto — a clínica precisa saber de onde veio.
5. Desligar é um toque, e apaga a autorização do nosso lado também.

## Arquivos afetados
- `mobile/app.json` (entitlement e permissões), `mobile/package.json`
- `mobile/src/lib/saude-do-telefone.ts` (novo), com irmão `.web.ts`
- `mobile/app/(app)/(clinica)/wearables.tsx`
- `app/api/patient/blood-pressure/bulk` (novo ou estendido)
- `prisma/schema.prisma` (a origem do aparelho)

## Critérios de aceite
- [ ] Leitura apenas — provado por teste, não por intenção.
- [ ] O consentimento explica antes de o sistema perguntar.
- [ ] Reabrir o app não reenvia o que já foi mandado.
- [ ] A origem do aparelho chega ao prontuário.
- [ ] Desligar corta e não deixa resíduo.
- [ ] O bundle web continua compilando (módulo por plataforma).
