# T-2: Rota de envio + status (API)

**Status:** concluído
**Depende de:** T-1

## Objetivo
Endpoint que envia o fechamento semanal (EN ou PT) e outro que informa se já foi mandado essa
semana, pra cada idioma independentemente.

## Contexto
Ver `plan.md` — decisões 2 e 4, e a armadilha do `notifyPatient` (passar só o texto do idioma
escolhido em `plainMessage`, nunca preencher `plainMessagePt`, senão o `preferredLocale` da
paciente decide por conta própria e ignora o botão que o terapeuta clicou).

Modelo de referência pra tenant-guard e forma da resposta: `app/api/admin/patients/[id]/adherence-today/route.ts`.
Modelo de referência pra criar o `ClinicMessage` + notificar: `app/api/admin/patients/[id]/messages/route.ts` (POST).

## Passos
1. Criar `app/api/admin/patients/[id]/weekly-closing/route.ts`:
   - `GET`: `staffPatientAccess` primeiro. Retorna
     `{ en: { sentAt: ISO | null }, pt: { sentAt: ISO | null } }`, cada `sentAt` vindo do
     `AuditLog` mais recente com o `action` correspondente (`WEEKLY_CLOSING_SENT_EN`/`_PT`) e
     `createdAt >= startOfWeek(new Date())`.
   - `POST`: body `{ locale: "en" | "pt" }`. `staffPatientAccess` primeiro. Busca a paciente
     (`firstName`). Monta o texto com `buildWeeklyClosingText`. Cria o `ClinicMessage`
     (`senderRole: "staff"`, `senderId: actor.userId`, `kind: "notice"`,
     `title: WEEKLY_CLOSING_TITLE_EN` ou `_PT`, `content: texto`). Chama `notifyPatient` com
     `plainMessage: texto` (do idioma escolhido) e **sem** `plainMessagePt` — ver a armadilha
     acima. Registra `logAudit` com o `action` do idioma escolhido
     (`userId: patientId`, `description` incluindo o nome do terapeuta e o idioma). Retorna
     `{ sent: true, sentAt: <agora em ISO> }`.
2. Validar `locale` no body (só aceita `"en"` ou `"pt"`, senão 400).

## Arquivos afetados
- `app/api/admin/patients/[id]/weekly-closing/route.ts` (novo)

## Critérios de aceite
- [ ] `GET` sem acesso à paciente (staff de outra clínica) → 404, mesmo padrão de
      `staffPatientAccess` já usado no resto do projeto.
- [ ] `POST { locale: "en" }` cria um `ClinicMessage` com o texto EN certo e um `AuditLog`
      `WEEKLY_CLOSING_SENT_EN`.
- [ ] `POST { locale: "pt" }` cria o `ClinicMessage` com o texto PT e o `AuditLog` `_PT` —
      **mesmo que a paciente tenha `preferredLocale: en-GB`** (a escolha do terapeuta manda, não
      o cadastro dela).
- [ ] `POST { locale: "fr" }` (ou ausente) → 400.
- [ ] `GET` depois de um `POST { locale: "en" }` retorna `en.sentAt` preenchido e `pt.sentAt: null`.
- [ ] `npx tsc --noEmit` limpo.
