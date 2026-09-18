# QA Report — T-1 a T-6: Notificações por email pro admin

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado com ressalvas

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Cascata sem nada configurado → ADMIN_EMAIL/hardcoded | API | ✅ |
| 2 | `notificationEmail` configurado tem prioridade | API | ✅ |
| 3 | Fallback pro `email` de contato | API | ✅ |
| 4 | Nenhuma duplicação hardcoded sobrando (fora dos 9 arquivos auditados) | Código | ✅ (ver ressalva) |
| 5 | Triagem continua indo pro destino certo | API | ✅ |
| 6 | Campo "Notification email" aparece e salva em `/admin/settings` | UI | ✅ |
| 7 | Deixar em branco não quebra | UI | ✅ |
| 8 | Pressão alta dispara os dois emails | API | ✅ |
| 9 | Leitura normal não dispara o alerta dedicado | API | ✅ |
| 10 | Signup dispara welcome + alerta dedicado | API | ✅ |
| 11 | Signup duplicado não dispara nada | API | ✅ |
| 12 | Cancelamento pela paciente dispara alerta | API | ✅ |
| 13 | Cancelamento pelo admin NÃO dispara o alerta novo | API | ✅ |
| 14a | Consentimento aceito dispara alerta | API | ✅ |
| 14b | Avaliação corporal enviada | API | ⚠️ não testado ao vivo (ver addendum) |
| 14c | Escaneamento de pé enviado | API | ⚠️ não testado ao vivo (ver addendum) |
| 14d | Pagamento confirmado (webhook Stripe) | API | ⚠️ não testado ao vivo (ver addendum) |
| 14e | Pagamento de pacote confirmado (webhook Stripe) | API | ⚠️ não testado ao vivo (ver addendum) |
| — | `getAdminNotificationEmail` nunca caiu no fallback errado nos alertas capturados | Todos | ✅ |

**16 de 19 sub-cenários aprovados com evidência ao vivo, 4 pendentes (ver addendum abaixo), 0 reprovados.**

## Ambiente
Dev server local (`npm run dev`, porta 4000), stdout capturado em arquivo pra evidência. Sistema tem um "outbound guard" (`lib/outbound-guard.ts`) que, fora de produção, nunca manda email de verdade — só loga `[OUTBOUND-SINK] email → <destinatário>: <assunto>` no console do servidor. Toda verificação foi feita lendo essas linhas de log, sem gastar cota de email real.

## Detalhes

### T-1 — Cascata de `getAdminNotificationEmail`

**1. Sem nada configurado ✅** — `notificationEmail=""`, `email=""`, `ADMIN_EMAIL` não setado. `POST /api/signup`:
```
[OUTBOUND-SINK] email → qa.novosignup3@example.test, brunotoaz@gmail.com: Welcome to BPR Physical Rehabilitation, QA! 👋
[OUTBOUND-SINK] email → brunotoaz@gmail.com: 👋 New Patient Signup: QA Fallback2
```

**2. `notificationEmail` tem prioridade ✅** — confirmado em todos os alertas com a config normal (`admin@bpr.clinic`), ver seção "Confirmação do destino".

**3. Fallback pro `email` de contato ✅** — `notificationEmail=""`, `email="qa-contact-fallback@example.test"`:
```
[OUTBOUND-SINK] email → qa.novosignup2@example.test, qa-contact-fallback@example.test: Welcome to BPR Physical Rehabilitation, QA! 👋
[OUTBOUND-SINK] email → qa-contact-fallback@example.test: 👋 New Patient Signup: QA Fallback1
```
Configuração restaurada e verificada via `GET /api/settings` → `{"notificationEmail":"admin@bpr.clinic","email":null}`.

### T-2 — Substituição das duplicações

**4. Nenhuma duplicação sobrando ✅ (com ressalva)** — `grep -rn "brunotoaz@gmail.com"` (fora de node_modules) retorna, além de `lib/admin-notify-email.ts`: `app/admin/email-test/page.tsx`, `app/api/admin/email-test/route.ts`, `app/admin/email-templates/page.tsx`, `app/api/admin/email-templates/test-all/route.ts`, `test-site.js`, `test-site2.js`, `scripts/test-email.js`, `scripts/test-emails.ts`. Nenhum desses é roteamento de alerta de admin — são ferramentas manuais de teste de SMTP/templates ou scripts de dev, fora do escopo da auditoria original. Os 9 arquivos da auditoria (`lib/email-templates.ts`, `lib/notify-patient.ts`, `lib/ai-coworker.ts`, `app/api/medical-screening/route.ts`, `app/api/appointments/route.ts`, `app/api/body-assessments/capture/[token]/route.ts`, `app/api/patient/messages/route.ts`, `app/api/patient/questions/route.ts`, `app/api/webhooks/vapi/route.ts`) todos usam `getAdminNotificationEmail()` — confirmado um a um.

**5. Triagem continua indo pro destino certo ✅**:
```
[OUTBOUND-SINK] email → qa.pacientea2@example.test, admin@bpr.clinic: Assessment screening received — we'll review it shortly, QA
[OUTBOUND-SINK] email → admin@bpr.clinic: Screening Submitted: QA qa.pacientea2
```

### T-3 — Campo em `/admin/settings`

**6. Campo aparece e salva ✅** — Aba Contact tem o campo "Notification email" com placeholder `admin@bpr.clinic` e texto de ajuda correto. Editado, salvo (`PUT /api/settings 200`), reload completo confirmou persistência via leitura direta do `input.value`. Screenshots: `t-3-settings-contact-inicial.png`, `t-3-settings-contact-persistido.png`. Valor restaurado para `admin@bpr.clinic` ao final.

**7. Deixar em branco não quebra ✅** — Campo apagado, salvo com sucesso (`200`), sem exceção no log, sem erro na tela.

**Observação não-bloqueante:** `/admin/settings` gera erros de hidratação React no console em todo carregamento — pré-existente, não relacionado à atividade 37.

### T-4 — Pressão alta

**8. Leitura alta dispara os dois emails ✅**:
```
[OUTBOUND-SINK] email → admin@bpr.clinic: 🚨 HYPERTENSIVE CRISIS: QA qa.pacientea — 185/125 mmHg
[OUTBOUND-SINK] email → qa.pacientea@example.test, admin@bpr.clinic: ⚠️ Blood Pressure Alert — QA
```

**9. Leitura normal não dispara ✅** — `POST` 115/75 → `200`, zero linhas novas de `[OUTBOUND-SINK]`.

### T-5 — Cadastro

**10. Signup dispara o novo alerta ✅**:
```
[OUTBOUND-SINK] email → qa.novosignup1@example.test, admin@bpr.clinic: Welcome to BPR Physical Rehabilitation, QA! 👋
[OUTBOUND-SINK] email → admin@bpr.clinic: 👋 New Patient Signup: QA NovoSignup
```

**11. Signup duplicado não dispara nada ✅** — repetição do mesmo email → `409`, contagem de `[OUTBOUND-SINK]` inalterada.

### T-6 — Alertas restantes

**12. Cancelamento pela paciente dispara alerta ✅**:
```
[OUTBOUND-SINK] email → qa.pacientea@example.test, admin@bpr.clinic: Appointment Cancelled — Tuesday, 15 September 2026
[OUTBOUND-SINK] email → admin@bpr.clinic: ❌ Appointment Cancelled by Patient: QA qa.pacientea
```

**13. Cancelamento pelo admin NÃO dispara o alerta novo ✅**:
```
[OUTBOUND-SINK] email → qa.pacientea@example.test, admin@bpr.clinic: Appointment Cancelled — Wednesday, 16 September 2026
```
(só o template do paciente, sem o alerta dedicado — correto.)

**14a. Consentimento aceito dispara alerta ✅**:
```
[OUTBOUND-SINK] email → admin@bpr.clinic: ✅ Consent Accepted: QA qa.pacientea
[OUTBOUND-SINK] email → qa.pacientea@example.test, admin@bpr.clinic: GDPR Consent Confirmed — QA
```

### Confirmação do destino
Com a config normal (`admin@bpr.clinic`), todos os alertas dedicados capturados foram pra lá — nenhum caiu no hardcoded: New Patient Signup, HYPERTENSIVE CRISIS, Consent Accepted, New Appointment (x2), Appointment Cancelled by Patient, Screening Submitted.

## Addendum — fechamento dos 4 cenários pendentes (feito pela sessão principal, pós-QA)
Ver `report-t-1-t-6-addendum.md`.
