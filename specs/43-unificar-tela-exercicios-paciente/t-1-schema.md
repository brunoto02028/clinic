# T-1: Schema — log diário aceita prescrições soltas

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
`ExerciseCompletionLog` guarda o dia marcado tanto pra um item de protocolo quanto pra uma
prescrição solta (`ExercisePrescription`), sem duplicar tabela.

## Contexto
Ver plan.md, decisão 1. Hoje `ExerciseCompletionLog.protocolItemId` é obrigatório. Passa a ser
opcional, e ganha um par `exercisePrescriptionId` opcional — exatamente um dos dois preenchido.

## Passos
1. Em `prisma/schema.prisma`, `model ExerciseCompletionLog`:
   - `protocolItemId` vira `String?` (e a relação `protocolItem` vira opcional).
   - Adicionar `exercisePrescriptionId String?` + relação `exercisePrescription
     ExercisePrescription? @relation(fields: [exercisePrescriptionId], references: [id],
     onDelete: Cascade)`.
   - Trocar `@@unique([protocolItemId, patientId, completedDate])` por DOIS uniques: o mesmo de
     hoje + `@@unique([exercisePrescriptionId, patientId, completedDate])`. Postgres trata NULL
     como distinto em unique index, então uma linha com `protocolItemId: null` nunca colide com
     outra só por isso — a unicidade real fica garantida pelo lado que estiver preenchido.
   - Adicionar `@@index([exercisePrescriptionId])`.
2. Em `model ExercisePrescription`, adicionar a relação inversa
   `completionLogs ExerciseCompletionLog[]`.
3. `npx prisma generate` + `npx prisma db push` local (parar o dev server antes).

## Arquivos afetados
- `prisma/schema.prisma`

## Critérios de aceite
- [ ] `npx tsc --noEmit` limpo
- [ ] Local: criar um log com `exercisePrescriptionId` preenchido e `protocolItemId: null`, e um
      log de item de protocolo (o inverso) — confirmar que os dois convivem sem erro
- [ ] Local: criar dois logs com o mesmo `exercisePrescriptionId`+`patientId`+`completedDate` —
      a segunda gravação deve falhar por violação da constraint única
