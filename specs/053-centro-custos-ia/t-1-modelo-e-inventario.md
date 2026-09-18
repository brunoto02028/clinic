# T-1: Modelo `AiUsageEvent` + inventário classificado das chamadas de IA

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Criar a tabela de eventos de uso de IA e o mapa completo de onde a IA é chamada, dizendo quem pode disparar cada chamada. Esse mapa guia a atribuição (T-3) e mostra o que é faturável.

## Contexto
- Não existe registro de uso de IA hoje.
- Entradas centrais: `lib/ai-provider.ts`, `lib/claude.ts`, `lib/ai-providers/*`.
- 12 rotas/libs chamam o provedor direto (lista no `plan.md`).
- Convenção do projeto: schema via `prisma db push` (sem pasta de migrations), sempre aditivo.

## Passos
1. `prisma/schema.prisma`, modelo `AiUsageEvent`:
   - `id`, `createdAt`;
   - `clinicId String?` (relação `Clinic`, `onDelete: SetNull`), `userId String?` (relação `User`, `SetNull`), `actorRole String?`;
   - `feature String` (chave estável, ex.: `workout.ai-generate`), `provider String`, `model String?`;
   - `inputTokens Int?`, `outputTokens Int?`, `audioSeconds Float?`, `imageCount Int?`;
   - `costUsd Decimal @db.Decimal(12,6) @default(0)`, `costSource String` (`provider` | `estimated` | `unknown`);
   - `success Boolean`, `latencyMs Int?`;
   - `billingPeriod String?` (`YYYY-MM`, preenchido quando a fatura do mês fecha, T-6);
   - índices: `(clinicId, createdAt)`, `(feature, createdAt)`, `(userId, createdAt)`.
2. `db push` local. Conferir que é só aditivo (`prisma migrate diff`).
3. Inventário em `specs/053-centro-custos-ia/inventario-chamadas-ia.md`: uma linha por ponto de chamada, com
   - arquivo;
   - função;
   - `feature` proposta;
   - quem alcança (SUPERADMIN / staff clínica / personal / aluno / paciente / sistema-cron);
   - bloqueada para personal? (sim/não, conforme `personal-blocked-routes` + ativ. 52);
   - faturável ao personal? (sim/não).
4. Marcar as de prioridade 1 para a T-3: tudo que o personal ou o aluno dele alcançam.

## Arquivos afetados
- `prisma/schema.prisma`
- `specs/053-centro-custos-ia/inventario-chamadas-ia.md` (novo)

## Critérios de aceite
- [ ] `prisma migrate diff` do banco local → só `CREATE TABLE` + índices + FKs; nada destrutivo.
- [ ] Client gerado; um evento de teste gravado e lido via Prisma.
- [ ] O inventário cobre **100%** dos arquivos que chamam IA: os 48 que usam as entradas centrais + as 12 chamadas diretas. Conferido por grep, com o comando anotado no próprio inventário.
- [ ] Cada linha com `feature`, quem alcança e se é faturável.
