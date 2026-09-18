# T-4: Registrar ações clínicas no Activity log

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Criar SOAP note, atribuir protocolo e prescrever exercício aparecem no log de Activity do
paciente, igual login/mensagem/upload/screening já aparecem.

## Contexto
`app/api/admin/patients/[id]/activity/route.ts` já unifica várias fontes num timeline (ver
`specs/48-atividade-do-paciente/plan.md`), mas só lê `AuditLog` pra ações que já chamam
`logAudit()` — e as 3 ações abaixo nunca chamam. `logAudit()` grava por `userId` = o paciente
(confirmado: a query do timeline filtra `auditLog.findMany({ where: { userId: patientId } })`),
mesmo a ação tendo sido feita por um membro da equipe.

Padrão a seguir (igual `app/api/cron/onboarding-reminder/route.ts` e outros já existentes nesta
sessão):
```ts
await logAudit({
  userId: patientId,
  userEmail: "",
  userRole: "PATIENT",
  action: "<ACTION_CONSTANT>",
  entity: "<Entity>",
  entityId: <id do registro criado>,
  description: `<frase curta>`,
});
```

## Passos
1. **SOAP note**: em `app/api/admin/patients/[id]/route.ts`, action `"add_clinical_note"`
   (linha ~137-154), depois do `prisma.sOAPNote.create(...)`, chamar `logAudit` com
   `action: "SOAP_NOTE_CREATED"`, `entity: "SOAPNote"`, `entityId: note.id`.
2. **Protocolo atribuído**: achar o ponto de criação/envio em
   `app/api/admin/protocols/[id]/assign/route.ts` (ou `app/api/admin/patients/[id]/protocol/route.ts`,
   conferir qual dos dois é o caminho real de "enviar protocolo pro paciente" usado pela UI) e
   chamar `logAudit` com `action: "PROTOCOL_ASSIGNED"`, `entity: "TreatmentProtocol"`,
   `entityId: <id do protocolo>`.
3. **Exercício prescrito**: em `app/api/admin/exercise-prescriptions/route.ts`, `POST` (linha
   ~73+), depois de criar o `ExercisePrescription`, chamar `logAudit` com
   `action: "EXERCISE_PRESCRIBED"`, `entity: "ExercisePrescription"`, `entityId: <id>`.
4. Adicionar as 3 ações novas ao `AUDIT_LABELS` em
   `app/api/admin/patients/[id]/activity/route.ts:29-35`:
   ```ts
   SOAP_NOTE_CREATED: { type: "OTHER", title: "SOAP note added" },
   PROTOCOL_ASSIGNED: { type: "OTHER", title: "Treatment protocol assigned" },
   EXERCISE_PRESCRIBED: { type: "OTHER", title: "Exercise prescribed" },
   ```
5. Envolver cada `logAudit` em try/catch (best-effort, não deve quebrar a criação do registro
   principal se o log falhar) — mesmo padrão já usado em todo o resto do projeto.

## Arquivos afetados
- `app/api/admin/patients/[id]/route.ts`
- `app/api/admin/protocols/[id]/assign/route.ts` (ou o arquivo certo, confirmar no passo 2)
- `app/api/admin/exercise-prescriptions/route.ts`
- `app/api/admin/patients/[id]/activity/route.ts`

## Critérios de aceite
- [ ] Criar uma SOAP note pela ficha do paciente → aparece no Activity com o timestamp certo.
- [ ] Atribuir/enviar um protocolo → aparece no Activity.
- [ ] Prescrever um exercício (aba Exercises) → aparece no Activity.
- [ ] Falha ao gravar o log (simulável) não impede a criação do registro principal.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
