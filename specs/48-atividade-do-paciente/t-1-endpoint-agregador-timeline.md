# T-1: Endpoint agregador da timeline

**Status:** em andamento
**Depende de:** nenhuma

## Objetivo
`GET /api/admin/patients/[id]/activity` devolve a timeline unificada de um paciente, juntando as 5
fontes existentes, mais recente primeiro, paginada por offset/limit.

## Contexto
Ver decisões 1, 3 e 4 do plano. Fontes e seus campos de data:
- `AuditLog` (`where: { userId: patientId }`) — login (`LOGIN_SUCCESS`) e, depois da T-2, vídeo
  assistido. `at = createdAt`.
- `ExerciseCompletionLog` (`where: { patientId }`, incluir `protocolItem.exercise.name` ou
  `exercisePrescription.exercise.name`) — `at = createdAt`.
- `ClinicMessage` (`where: { patientId }`) — `at = createdAt`, rotular por `senderRole`.
- `MedicalScreening` (`where: { userId: patientId }`) — registro único; `at = updatedAt`, rótulo
  "Enviou" se `createdAt === updatedAt`, senão "Atualizou".
- `PatientDocument` (`where: { patientId, uploadedById: patientId }`) — `at = createdAt`.

Autorização: mesma trava da Ativ. 47 — `sessionClinicId(session)`, 403
`{ error: "No clinic resolved for this account" }` se não resolver; e 404 se o paciente não
pertencer a essa clínica (não vazar que o paciente existe em outra clínica).

## Passos
1. Criar `app/api/admin/patients/[id]/activity/route.ts`, `GET`.
2. Autenticar (ADMIN/THERAPIST/SUPERADMIN), resolver clínica com `sessionClinicId`, 403 se nula.
3. Carregar o paciente por `id` + `clinicId` resolvido; 404 se não achar.
4. Ler `?limit` (default 50, máx 100) e `?offset` (default 0) da query string.
5. Buscar em paralelo (`Promise.all`) as 5 fontes acima, cada uma com
   `orderBy: { createdAt/updatedAt: "desc" }, take: offset + limit` (simples: busca até o fim da
   página pedida em cada fonte, já ordenada).
6. Normalizar cada linha para `{ id, type, title, description, at }` (`type` ∈ `LOGIN`,
   `EXERCISE_COMPLETED`, `VIDEO_WATCHED`, `MESSAGE_SENT`, `MESSAGE_RECEIVED`,
   `SCREENING_SUBMITTED`/`SCREENING_UPDATED`, `DOCUMENT_UPLOADED`).
7. Juntar as 5 listas, ordenar por `at` desc, aplicar `.slice(offset, offset + limit)`.
8. Responder `{ events, hasMore }` (`hasMore = total combinado > offset + limit`).

## Arquivos afetados
- `app/api/admin/patients/[id]/activity/route.ts` (novo)

## Critérios de aceite
- [ ] Sem clínica resolvida → 403, nenhuma query roda.
- [ ] Paciente de outra clínica → 404.
- [ ] Resposta ordenada por `at` desc, combinando as 5 fontes corretamente.
- [ ] `limit`/`offset` funcionam e `hasMore` reflete a realidade.
- [ ] `npx tsc --noEmit` limpo para o arquivo novo.
