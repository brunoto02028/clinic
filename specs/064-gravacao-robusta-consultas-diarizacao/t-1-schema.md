# T-1: Schema (`AmbientRecordingSession` + enum de status)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Base de dados pra rastrear cada sessão de gravação, do início até o transcript pronto.

## Contexto
Ver plan.md, Decisão 3 e Suposição 3 (nome do model). Sem tabela separada pra chunks — eles vivem
só no R2, listados via `listR2(prefix)` quando necessário (ver `lib/r2.ts`).

## Passos
1. Adicionar em `prisma/schema.prisma`:
   ```prisma
   enum AmbientRecordingStatus {
     RECORDING
     ENDED
     MERGING
     TRANSCRIBING
     TRANSCRIBED
     FAILED
   }

   model AmbientRecordingSession {
     id           String                  @id @default(cuid())
     clinicId     String
     clinic       Clinic                  @relation(fields: [clinicId], references: [id], onDelete: Cascade)
     therapistId  String
     therapist    User                    @relation("AmbientRecordingTherapist", fields: [therapistId], references: [id])
     patientId    String?
     patient      User?                   @relation("AmbientRecordingPatient", fields: [patientId], references: [id], onDelete: SetNull)

     status       AmbientRecordingStatus  @default(RECORDING)
     language     String                  @default("pt")

     startedAt    DateTime                @default(now())
     endedAt      DateTime?
     lastChunkAt  DateTime?               // atualizado a cada chunk recebido — detecta sessão "morta"
     chunkCount   Int                     @default(0)

     mergedAudioR2Key      String?        @db.Text
     durationSeconds       Int?

     assemblyaiTranscriptId String?
     transcript             String?       @db.Text  // já formatado "Terapeuta: ...\nPaciente: ..."

     error        String?                 @db.Text
     attempts     Int                     @default(0)

     createdAt    DateTime                @default(now())
     updatedAt    DateTime                @updatedAt

     @@index([clinicId])
     @@index([therapistId])
     @@index([patientId])
     @@index([status])
   }
   ```
2. Adicionar as relações inversas em `Clinic` e `User` (`AmbientRecordingSession[]` com os nomes
   `"AmbientRecordingTherapist"` e `"AmbientRecordingPatient"`).
3. `npx prisma db push` local, confirmar migração limpa. **Não aplicar em produção ainda** — só
   quando a atividade inteira estiver QA'd (mesmo padrão já usado nas atividades anteriores).

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [x] `npx prisma db push` roda sem erro localmente.
- [x] `npx prisma generate` reflete o novo model/enum nos tipos.
- [x] Nenhum model existente foi alterado (só adição).

## QA e code review

QA (agente qa-tester): 5/5 cenários aprovados (db push, generate, shape real das colunas/enum no
Postgres, tsc sem regressão, diff é só adição). Relatório em `qa/report-t-1.md`.

Code review: 3 achados, todos corrigidos —
1. Relação `therapist` obrigatória sem `onDelete: Cascade` (inconsistente com o padrão do resto do
   schema pra relações terapeuta→User obrigatórias — deletar um terapeuta quebraria com FK
   violation). Corrigido.
2. Índice só em `clinicId`; T-7 vai listar histórico por clínica ordenado por `createdAt desc`.
   Trocado pra índice composto `@@index([clinicId, createdAt])`.
3. Comentário de `lastChunkAt` afirmava que o campo "detecta sessão morta", mas nenhuma tarefa do
   plano atual lê esse campo pra isso — comentário ajustado pra descrever só o que o campo
   realmente é hoje (documentação enganosa corrigida, sem adicionar escopo novo).
