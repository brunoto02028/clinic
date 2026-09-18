# QA — T-1: Schema — `PaymentMethod` + `Appointment.paymentMethod`

**Resultado: ✅ aprovado**

Ambiente: local (`npm run dev`, banco `bpr_clinic_local`, schema aplicado via `npx prisma db push`).

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | `npx prisma validate` | Schema | ✅ |
| 2 | `Appointment` existente fica com `paymentMethod = ONLINE` (default) | DB | ✅ |
| 3 | `tsc --noEmit` limpo nos arquivos da atividade | Static | ✅ |

## Evidências

- `npx prisma validate` → `The schema at prisma\schema.prisma is valid 🚀`.
- Query direta num `Appointment` já existente antes da atividade:
  `{ id: 'cmspwu8up001cxz94jvrsgolp', paymentMethod: 'ONLINE', status: 'PENDING' }` — confirma
  que o default foi aplicado sem quebrar dado antigo.
- `tsc --noEmit` completo tem erros pré-existentes em `mobile/`, `prisma/seed-marketplace.ts`,
  `scripts/migrate-to-multitenant.ts` — nenhum desses arquivos está no diff da atividade 50.
  Nos 6 arquivos tocados pela atividade: zero erros.
