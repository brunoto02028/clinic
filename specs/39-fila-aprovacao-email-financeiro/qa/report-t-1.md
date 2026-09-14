# QA Report — T-1: Schema — enum PENDING_APPROVAL + campo attachmentsJson

**Data:** 2026-09-14
**Ambiente:** local (`bpr_clinic_local`, `http://localhost:4000`) — produção não foi tocada.
**Resultado geral:** ✅ aprovado

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `EmailFolder` contém `PENDING_APPROVAL` no schema | Schema | ✅ |
| 2 | `EmailMessage.attachmentsJson` existe (`String? @db.Text`) | Schema | ✅ |
| 3 | Criar `EmailMessage` com `folder: PENDING_APPROVAL` + `attachmentsJson` e ler de volta | API (indireto) | ✅ |
| 4 | `GET /api/admin/email?folder=SENT` (e outras pastas) sem regressão | API | ✅ |
| 5 | `npx tsc --noEmit` limpo nos arquivos da atividade | Build | ⚠️ ver nota |

## Detalhes

### 1–2. Enum e campo no schema ✅
Conferido em `prisma/schema.prisma`:
```
enum EmailFolder {
  INBOX
  SENT
  DRAFT
  SPAM
  TRASH
  PENDING_APPROVAL
}
...
attachmentsJson String? @db.Text // Frozen [{filename, contentBase64}] ...
```

### 3. Round-trip de um `EmailMessage` PENDING_APPROVAL com attachmentsJson ✅
Não testado isoladamente via Prisma Studio — validado de forma equivalente e mais forte (dado
real de ponta a ponta) através do fluxo do T-2: `POST /api/admin/appointments/[id]/invoice`
grava um `EmailMessage` com `folder: PENDING_APPROVAL` e `attachmentsJson` preenchido, e o
`GET /api/admin/email?folder=PENDING_APPROVAL` leu esse registro de volta sem erro, com
`attachmentsJson` presente e decodificável (confirmado no T-3: `approveSend` decodifica o
JSON e usa o anexo para enviar). Ver `report-t-2.md` e `report-t-3.md` para as evidências de
comando.

### 4. Sem regressão nas pastas existentes ✅
- **Comando:** `GET http://localhost:4000/api/admin/email?folder=SENT&limit=1`
- **Resultado:** 200 OK, `folderCounts: { INBOX: 0, SENT: 7, DRAFT: 0, SPAM: 0, TRASH: 0,
  PENDING_APPROVAL: 0 }` antes de qualquer teste da atividade — todas as pastas responderam
  normalmente, incluindo a nova `PENDING_APPROVAL` (contagem 0, sem erro).

### 5. `npx tsc --noEmit` ⚠️
- **Comando:** `npx tsc --noEmit` (raiz do projeto)
- **Resultado:** o projeto tem **2087 erros de TypeScript pré-existentes**, em arquivos não
  relacionados à atividade 39 (ex.: `app/api/patient/documents/route.ts`,
  `lib/notifications/patient-notifications.ts`, `components/body-assessment/*`,
  `prisma/seed-marketplace.ts`, etc.).
- Filtrei especificamente por `invoice/route`, `admin/email/route`, `admin/email/page` e
  `schema.prisma` no output do `tsc` — **nenhum erro nesses arquivos**. Ou seja, a atividade 39
  não introduziu nenhum erro de tipo novo, mas o critério de aceite "`npx tsc --noEmit` limpo"
  não é literalmente verdadeiro para o projeto como um todo (débito técnico pré-existente, fora
  do escopo desta atividade — reportando para conhecimento, não é responsabilidade do dev desta
  tarefa consertar).

## Erros de console
Não aplicável (T-1 é só schema/banco).

## Falhas e recomendações
Nenhuma falha na T-1. Nota informativa: o `tsc --noEmit` global do projeto já estava sujo antes
desta atividade — vale abrir isso como débito técnico separado, não bloqueia esta tarefa.
