# T-2: `Alert` + central de alertas do terapeuta

**Status:** concluído — QA aprovado (`qa/report-t-2.md`, `qa/report-t-2-recheck.md`)
**Depende de:** nenhuma

## Objetivo

O modelo `Alert`, a API e a tela onde o terapeuta vê o que precisa de atenção, por prioridade, com
"Ciente" e "Resolvido" registrando quem e quando.

É a única peça do §3 que não existe de nenhuma forma hoje — e é o que torna seguro o motor não
enviar nada sozinho: o terapeuta enxerga, mesmo sem mensagem sair.

## Contexto

Documento §3.3 (`CREATE_ALERT`), §10.1 (central de alertas). Prioridades `LOW | MEDIUM | HIGH |
URGENT`, status `OPEN | ACKNOWLEDGED | RESOLVED`.

Alerta é **interno**: não é mensagem ao paciente, então é criado automaticamente sem passar pela
fila de aprovação (decisão 3 do plano).

O `ClinicalEvidenceReport` já tem um caso real de "precisa de olho humano" que hoje não vira alerta
nenhum — é um primeiro produtor natural, mas fica para T-3.

## Passos

1. Modelo `Alert` no schema: `clinicId`, `patientId` (User), `ruleCode`, `priority`, `title`,
   `details Json`, `status`, `ackById`, `ackAt`, `resolvedById`, `resolvedAt`, `createdAt`.
   Índices por `clinicId + status + priority` e por `patientId`.
2. `lib/alerts.ts` com `createAlert()` — escopado por clínica, idempotente por
   (`ruleCode`, `patientId`, janela).
3. `GET /api/alerts` (lista da clínica do ator, filtro por status e prioridade) e
   `PATCH /api/alerts/[id]` (ack/resolve). Autorização por `getActor()`, nunca por
   `session.user.clinicId` cru.
4. Tela `/dashboard/alerts` (staff) — lista por prioridade, botões Ciente e Resolvido, quem e quando.
5. Contador de alertas abertos onde o staff já olha hoje.

## Arquivos afetados

- `prisma/schema.prisma` (só adição)
- `lib/alerts.ts` (novo)
- `app/api/alerts/route.ts`, `app/api/alerts/[id]/route.ts` (novos)
- `app/dashboard/alerts/page.tsx` + componente de lista (novos)

## Critérios de aceite

- [x] `prisma migrate diff` do schema novo **não contém `DROP`**
- [x] Terapeuta da clínica A não vê alerta da clínica B (teste com duas clínicas)
- [x] Paciente autenticado recebe 403 em `/api/alerts`
- [x] Ack e resolve gravam ator e horário, e aparecem na tela
- [x] Dois `createAlert()` com a mesma regra, paciente e janela criam **um** alerta
- [x] Nenhuma mensagem sai para o paciente nesta tarefa
