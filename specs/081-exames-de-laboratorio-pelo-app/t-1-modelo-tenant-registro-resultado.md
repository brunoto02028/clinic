# T-1: Modelo — tenant no pedido, registro do kit e resultado estruturado

**Status:** concluído — QA aprovado (qa/report-t-1.md, 7/7) e revisão feita em 25/09/2026
**Depende de:** nenhuma

## Objetivo
O schema que falta: de quem é o pedido, onde vive o kit entre o despacho e a coleta, e onde os
biomarcadores ficam.

## Contexto
`LabOrder` e `LabProduct` não têm `clinicId`. O pedido precisa saber qual clínica vendeu — pela
margem e para a equipe ver. Sem isso é o mesmo buraco das rotas antigas que vazaram entre tenants.

E o modelo pula de pedido para resultado, sem o passo do registro do kit — que é onde a pessoa
passa a maior parte do tempo esperando.

**Migração aditiva.** Zero DROP, conferido com `prisma migrate diff` contra o `main` antes de
qualquer push. O banco local é compartilhado entre worktrees: nada de `db push` nem `migrate dev`;
aplicar com `prisma db execute`.

## Passos
1. `LabOrder`: `clinicId` (opcional no schema para não quebrar linhas existentes, obrigatório em
   código), índice, relação com `Clinic`.
2. `LabOrderItem`: guardar `unitCost` além de `unitPrice` — a margem do momento da venda,
   congelada.
3. Novo `LabTestRegistration`: `orderId`, `lmlRegistrationId`, `status` (enum com os sete estados
   da LML), `resultsReady`, `assignedPatientAt`, `trfUrl`, `labelUrl`, `foreignId` (nosso id, para
   idempotência e para os valores mágicos da sandbox).
4. Novo `LabResultValue`: `registrationId`, `biomarker`, `value`, `unit`, `minRange`, `maxRange`,
   `status`, `outOfRange`, `measuredAt`. É o que permite ver a ferritina de três exames na mesma
   linha do tempo — e é o dado que o relatório de acompanhamento vai consumir.
5. `LabOrder.releasedToPatientAt` e `releasedBy` — a liberação do resultado (T-6).
6. Enum `LabRegistrationStatus` com os estados deles um para um: `awaiting_patient`, `pending`,
   `pending_authentication`, `success`, `partial_result`, `fail`, `processing_error`. Sem tradução
   criativa.

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] `prisma migrate diff` contra o `main` mostra **zero** DROP
- [ ] Nenhum `db push` nem `migrate dev` rodado no banco compartilhado; aplicado com `db execute`
- [ ] Um pedido antigo, sem `clinicId`, continua legível
- [ ] Teste que lê o enum do `schema.prisma` e compara com os estados que o código usa — a F1 da
      080 nasceu exatamente de assumir valor de enum, e 32 testes mockados não viram
