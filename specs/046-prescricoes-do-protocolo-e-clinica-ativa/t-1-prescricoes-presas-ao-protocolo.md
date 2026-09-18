# T-1: Prescrições presas ao protocolo

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Um plano arquivado ou voltado para rascunho sem substituto não devolve ao paciente os exercícios de
semanas que ele nunca liberou (app mobile, sino e tela web).

## Contexto
plan.md, decisões 1–3. Hoje: `lib/protocol-exercise-gating.ts` (Ativ. 45) considera só protocolos
enviados.

## Passos
1. `prisma/schema.prisma`: `ExercisePrescription.protocolId String?` + relação
   `protocol TreatmentProtocol? @relation(fields: [protocolId], references: [id], onDelete: SetNull)`,
   `@@index([protocolId])`; back-relation `prescriptions ExercisePrescription[]` em
   `TreatmentProtocol`. Coluna opcional → `db push` sem perda.
2. `app/api/admin/protocols/[id]/assign/route.ts`: preencher `protocolId` ao criar.
3. `lib/protocol-exercise-gating.ts`: calcular, dos protocolos enviados, os exercícios **visíveis**
   e os **só escondidos**; expor um filtro Prisma
   `OR: [{ protocolId: null, exerciseId: { notIn: escondidos } }, { protocolId: { not: null }, exerciseId: { in: visíveis } }]`.
   Usar em `GET /api/exercises` e na notificação de exercícios novos.
4. `scripts/backfill-prescription-protocolid.js` (novo) + `start.sh` (depois do `db push`) +
   `COPY` no Dockerfile: liga prescrições sem `protocolId` ao protocolo de template criado até 2 min
   antes, do mesmo paciente, cujo item usa o mesmo exercício. Idempotente, loga contagens.
5. Testes: regra (vinculada/avulsa, arquivado, restaurado, pacote não pago), rota assign
   (`protocolId`), filtro nas duas rotas.

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/protocols/[id]/assign/route.ts`
- `lib/protocol-exercise-gating.ts`, `app/api/exercises/route.ts`, `app/api/patient/notifications/route.ts`
- `scripts/backfill-prescription-protocolid.js`, `start.sh`, `Dockerfile`
- `__tests__/protocol/*`

## Critérios de aceite
- [x] Atribuir template → prescrições com `protocolId`
- [x] Arquivar o plano (sem outro enviado) → app/sino não mostram mais as prescrições dele;
      restaurar → voltam só as das semanas liberadas
- [x] Prescrição manual continua aparecendo como antes
- [x] Backfill liga as prescrições automáticas existentes (produção: as da Ana ficam todas ligadas;
      contagem registrada) e na 2ª execução não faz nada
- [x] O que a Ana vê hoje não muda (mesmos itens e exercícios antes/depois — conferência só de leitura)
