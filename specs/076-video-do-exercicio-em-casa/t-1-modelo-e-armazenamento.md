# T-1: Modelo e armazenamento do envio de exercício

**Status:** implementada, aguarda QA
**Depende de:** nenhuma

## Objetivo
Um envio do paciente — vídeo ou foto — preso a um exercício, a um dia e a uma pessoa, com o
arquivo no R2 e o acesso autenticado.

## Contexto
O vídeo não pode ir para o banco como os anexos de conversa: infla o backup e a restauração. O R2
já guarda mídia de exercício (`lib/exercise-media.ts`). Mas o R2 serve por URL pública, e isto é
dado de saúde — então a URL crua não entra no registro; guarda-se a **chave** e serve-se por rota
autenticada, como `app/api/files/[id]` já faz.

A identidade do envio copia a que o `ExerciseCompletionLog` já usa: paciente + prescrição (ou
item do protocolo) + data.

## Passos
1. `ExerciseSubmission` no schema: `patientId`, `clinicId`, `exercisePrescriptionId?`,
   `protocolItemId?`, `kind` (VIDEO | PHOTO), `storageKey`, `mimeType`, `sizeBytes`,
   `durationSeconds?`, `submittedAt`, e o retorno do terapeuta
   (`reviewedById?`, `reviewedAt?`, `reviewNote?`).
2. Índices por `patientId` e por `clinicId + reviewedAt` — a fila da clínica é "ainda não
   revisados".
3. `lib/exercise-submission.ts`: gravar no R2 sob `exercise-submissions/<patientId>/<id>.<ext>`,
   validar tipo e tamanho, e apagar o objeto se o registro falhar (o padrão que a foto de perfil
   já usa).
4. Migração **aditiva** — nenhum DROP.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/exercise-submission.ts` (novo)

## Critérios de aceite
- [ ] Um envio sempre tem paciente, clínica e um exercício — nenhum dos três opcional na prática
- [ ] A chave do R2 nunca vira URL pública em resposta de API
- [ ] Falha ao gravar no banco remove o objeto do R2 (sem órfão)
- [ ] Tipo fora da lista → recusado com motivo
- [ ] `prisma migrate diff` contra o `main`: zero DROP
