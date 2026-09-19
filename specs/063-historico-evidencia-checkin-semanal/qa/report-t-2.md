# QA Report — T-2: Card passivo de check-in semanal no dashboard do paciente

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Devido — nunca registrou, cadastro antigo (8+ dias) | API | ✅ |
| 2 | Não devido — nunca registrou, cadastro recente (2 dias) | API | ✅ |
| 3 | Devido — último registro antigo (10 dias) | API | ✅ |
| 4 | Não devido — registro recente (1 dia) | API | ✅ |
| 5 | Auth — sem sessão / injeção de patientId | API | ✅ |
| 6 | Card aparece pro paciente devido, PT e EN | UI | ✅ |
| 7 | Card não aparece pro paciente não devido | UI | ✅ |
| 8 | Clicar no card leva pra `/dashboard/outcome-measures` | UI | ✅ |
| 9 | Preencher e salvar formulário → card some | UI | ✅ |
| 10 | Nenhuma notificação disparada (AuditLog + código) | API/UI | ✅ |
| 11 | Impersonação — staff vê card corretamente | UI | ✅ |
| 12 | Mobile — card não quebra layout com banner de impersonação | UI | ✅ |

**Bônus:** `npx tsc --noEmit -p .` não mostra nenhum erro nos arquivos entregues por esta tarefa
(`app/api/patient/outcome-measures/due/route.ts`, `components/dashboard/weekly-checkin-card.tsx`,
`components/dashboard/patient-dashboard.tsx`).

## Fixtures

Script novo `scripts/qa/t063-checkin-due-fixtures.cjs` (padrão idêntico ao script de referência
`t063-evidence-history-fixtures.cjs`, clínica QA A, senha `QaTenant#2026`, aborta se
`DATABASE_URL` não for local). Confirmado no schema (`prisma/schema.prisma`, model
`PatientOutcomeMeasure` e `User.createdAt`) que ambos os campos são `@default(now())` simples
(sem `@updatedAt`), então dá pra sobrescrever via `prisma.user.update({ data: { createdAt: ... } })`
normal — não foi preciso `$executeRaw`.

4 pacientes criados:
- `qa.checkin.duenorecord@example.test` — 0 registros, `createdAt` 8 dias atrás
- `qa.checkin.notduerecent@example.test` — 0 registros, `createdAt` 2 dias atrás
- `qa.checkin.dueoldrecord@example.test` — 1 `PatientOutcomeMeasure`, `recordedAt` 10 dias atrás
- `qa.checkin.notduerecord@example.test` — 1 `PatientOutcomeMeasure`, `recordedAt` 1 dia atrás

## Detalhes

### 1-4. `GET /api/patient/outcome-measures/due` ✅

Autenticação via curl replicando o fluxo NextAuth (GET `/api/auth/csrf` → POST
`/api/auth/callback/credentials`).

```
Fixture 1 (duenorecord):   {"due":true}
Fixture 2 (notduerecent):  {"due":false}
Fixture 3 (dueoldrecord):  {"due":true}
Fixture 4 (notduerecord):  {"due":false}
```

Os 4 resultados batem exatamente com a lógica esperada.

### 5. Auth ✅

**Sem sessão (browser/cookie):**
```
HTTP/1.1 307 Temporary Redirect
location: /login?callbackUrl=%2Fapi%2Fpatient%2Foutcome-measures%2Fdue
```
Comportamento do `middleware.ts` (linhas ~308-319): qualquer requisição sem cookie pra rota
protegida é redirecionada, antes de chegar no código da rota — não é bug do T-2. A rota irmã
`/api/patient/outcome-measures` tem o mesmo 307, confirmando que não é regressão.

**401 no nível da rota** (via caminho bearer-token, que pula o gate de cookie):
```
curl -H "Authorization: Bearer bogus.token.here" .../due
HTTP/1.1 401 Unauthorized
{"error":"Unauthorized"}
```
Confirma que `if (!effective || effective.role !== "PATIENT")` funciona como especificado quando
alcançado.

**Injeção de `patientId` via query param** (sessão de `notduerecent` + `?patientId=<outro-id>`) →
`{"due":false}`, exatamente o valor da própria sessão — parâmetro ignorado, confirmando que a
rota só lê `getEffectiveUser()`.

### 6. Card aparece pro paciente devido (PT e EN) ✅

Login via Playwright como `qa.checkin.duenorecord@example.test`.
- EN: "How are you feeling this week?" / "Takes less than a minute and helps track your progress
  throughout treatment." / "Check In Now"
- PT: "Como você está se sentindo esta semana?" / "Leva menos de 1 minuto e ajuda a acompanhar sua
  evolução ao longo do tratamento." / "Responder Agora"

Sem erros de console em nenhum idioma.
**Evidência:** `screenshots/t-2-card-devido-en.png`, `screenshots/t-2-card-devido-pt.png`

### 7. Card não aparece pro paciente não devido ✅

Login como `qa.checkin.notduerecord@example.test`. Card ausente em qualquer posição do dashboard.
Sem erros de console.
**Evidência:** `screenshots/t-2-card-nao-devido.png`

### 8. Clicar no card leva pra `/dashboard/outcome-measures` ✅

Clique em "Responder Agora" navegou corretamente.

### 9. Preencher e salvar formulário → card some ✅

Formulário salvo (VAS=5, função=50%, defaults) para `duenorecord` → redirecionou sem erro.
Voltando ao dashboard, o card não aparece mais (snapshot + screenshot). Confirmado também via
API: novo login do mesmo paciente → `{"due":false}`.
**Evidência:** `screenshots/t-2-card-sumiu-apos-preencher.png`

### 10. Nenhum envio real ✅

`AuditLog` dos últimos 30 minutos (cobrindo todo o teste) só tem entradas `LOGIN_SUCCESS` —
nenhuma notificação. Grep estático em `app/api/patient/outcome-measures/` por
`notify|sendWhatsapp|sendSms|sendEmail|Telegram` não retornou ocorrências.

### 11. Impersonação ✅

Staff `qa.admina@example.test` → "View as Patient" em `qa.checkin.dueoldrecord` → nova aba com
banner "Visualizando como: QA dueoldrecord" visível + card de check-in renderizado corretamente.
Sem erros de console.
**Evidência:** `screenshots/t-2-impersonacao-card.png`

### 12. Mobile ✅

Mesma aba impersonada, 375×667. Banner fixo no topo sem sobrepor menu/conteúdo; card renderiza
abaixo do onboarding, texto quebra em duas linhas, sem overflow horizontal.
**Evidência:** `screenshots/t-2-mobile-impersonacao-card.png`

## Erros de console

Nenhum erro/warning em nenhum fluxo testado (confirmado via `browser_console_messages` após cada
etapa).

## `npx tsc --noEmit -p .`

Filtrando `reconstruir/`, restam ~1898 linhas de erro pré-existentes, todas em `mobile/`
(React Native/`@types/react`), `prisma/seed-marketplace.ts` e `scripts/migrate-to-multitenant.ts`
— nenhum tocado pela T-2. Busca específica por `weekly-checkin-card`, `outcome-measures/due`,
`patient-dashboard` na saída: **zero ocorrências**.

## Falhas e recomendações

Nenhuma falha nos critérios de aceite. Uma observação não-bloqueante:

- **Cenário 5 — nuance no 401.** A spec esperava um 401 JSON direto pra requisição sem sessão; na
  prática o `middleware.ts` do projeto redireciona (307) qualquer requisição sem cookie pra
  `/login` antes de chegar na rota — comportamento idêntico ao da rota irmã já existente
  (`/api/patient/outcome-measures`), não uma regressão desta tarefa. O 401 JSON da rota em si foi
  confirmado pelo caminho bearer-token.
