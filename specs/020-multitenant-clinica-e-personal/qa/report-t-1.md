# QA Report — T-1: Guarda de e-mail e mensagens fora de produção

**Data:** 2026-09-10
**Executado por:** agente qa-tester. O relatório foi gravado pela sessão principal porque a escrita do agente foi bloqueada.
**Ambiente:** `next dev` em http://localhost:4180 (NODE_ENV=development, sem `OUTBOUND_MODE`/`OUTBOUND_ALLOWLIST`), banco local. Nenhuma chamada a `https://bpr.clinic`.
**Resultado geral:** ⚠️ aprovado com ressalvas. Os critérios foram atendidos: S1 a S3 com `[OUTBOUND-SINK]` e **zero** `Sent via Resend`, S4 verde e limpeza executada. Ressalvas R1 e R2 abaixo, corrigidas e retestadas em seguida.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | S1 — Agendamento do aluno dispara notificações que caem no sink | API | ✅ |
| 2 | S2 — Código de verificação por e-mail cai no sink | API | ✅ |
| 3 | S3 — Esqueci minha senha (`/forgot-password`) cai no sink | UI + API | ✅ (ressalva R1) |
| 4 | S4 — Allowlist, modos e produção (testes unitários) | Unit | ✅ |
| 5 | S5 — Regressão: agendamento com resposta e linha no banco normais | API + DB | ✅ |
| 6 | Revisão — caminho de produção e cobertura dos pontos de envio | Review | ✅ |
| 7 | Checagem final — `Sent via Resend` no log inteiro | Log | ✅ (0) |
| 8 | Limpeza das fixtures | DB | ✅ (resíduos R2) |

## Detalhes

### Preparação
- O log do dev server já mostrava `✓ Ready in 3.5s` antes do primeiro teste.
- Fixtures criadas com `qa19-fixtures.cjs`.
- Login como `qa.aluno@example.test` em `/login`. Evidência: `screenshots/t-1-login-aluno-dashboard.png`.

### 1. S1 — Agendamento ✅
- **Request:** `POST /api/appointments` `{"dateTime":"2026-09-14T10:00:00.000Z","treatmentType":"QA T-1","therapistId":"<qa.trainer>","duration":60}`
- **Resposta:** HTTP 200 `{"success":true,"message":"Appointment booked successfully","appointment":{"status":"PENDING",...}}`
- **Log da janela** (endereços fora das fixtures mascarados):
  ```
  [OUTBOUND-SINK] email → qa.aluno@example.test, ADMIN_EMAIL (mascarado): Appointment Confirmed ✅ — Monday, 14 September 2026
  [OUTBOUND-SINK] email → ADMIN_EMAIL (mascarado): New Appointment: QA qa.aluno - 14/09/2026
   POST /api/appointments 200 in 539ms
  ```
- Na janela: `[OUTBOUND-SINK]` = 2; `Sent via Resend` = 0.
- A confirmação ao paciente leva o ADMIN_EMAIL em BCC. O guard avalia `to` e `bcc` juntos e derrubou a mensagem inteira, como esperado.

### 2. S2 — Código de verificação ✅
- **Preparação:** `send-code` recusa conta já ativa, então a fixture `qa.aluno` foi marcada como `isActive: false`.
- **Request:** `curl -X POST /api/auth/send-code -d '{"userId":"<qa.aluno>","channel":"EMAIL"}'`
- **Resposta:** 200 `{"success":true,"channel":"EMAIL","maskedContact":"qa******@example.test",...}`
- **Log:** `[OUTBOUND-SINK] email → qa.aluno@example.test: 595466 — Verification code`. `Sent via Resend` = 0.

### 3. S3 — Esqueci minha senha ✅ (ressalva R1)
- **Fluxo:** `/forgot-password` → e-mail `qa.aluno@example.test` → "Send Reset Link".
- **Tela:** "If an account exists for qa.aluno@example.test, you will receive a password reset link shortly." Evidência: `screenshots/t-1-forgot-password-enviado.png`.
- **Log:**
  ```
  [OUTBOUND-SINK] email → qa.aluno@example.test, ADMIN_EMAIL (mascarado): Reset your password — BPR Physical Rehabilitation 🔒
  prisma:error Invalid `prisma.emailMessage.create()` invocation: Unique constraint failed on the fields: (`messageId`)
  [email-templates] Failed to log sent email: PrismaClientKnownRequestError ... code: 'P2002'
   POST /api/auth/forgot-password 200 in 429ms
  ```
- `Sent via Resend` = 0. O fluxo concluiu com 200, mas o registro do e-mail falhou (R1).

### 4. S4 — Testes unitários ✅
- `npx jest __tests__/email`: 5 suítes, 28 testes, todos passando, incluindo os 7 de `outbound-guard`.
- A allowlist não foi exercitada em runtime de propósito, porque enviaria e-mail real.

### 5. S5 — Regressão do agendamento ✅
- A resposta tem o mesmo formato de antes.
- A linha no banco está normal: `status PENDING`, `price 60`, `mode IN_PERSON`.
- `clinicId: null` é o comportamento atual da rota, fora do escopo da T-1; é coberto pela T-5/T-14.

### 6. Revisão — produção e cobertura ✅
- `isLive()` é `true` com `NODE_ENV=production` quando `OUTBOUND_MODE` não está definido, então produção continua enviando (confirmado pelo teste unitário).
- O guard roda depois da checagem de configuração de cada provedor.
- O grep por chamadas diretas a provedores (Resend, Twilio, Meta, Telegram, FCM) encontrou todas cobertas por `outboundAllowed` e `logSunk`, inclusive os 2 pontos do `lib/whatsapp.ts`.

### 7. Checagem final do log ✅
Log inteiro da sessão (160 linhas): `Sent via Resend` = 0; `[OUTBOUND-SINK]` = 4; `Resend REJECTED/failed` = 0. O agendador em segundo plano também não gerou envio real.

### 8. Limpeza ✅ (com resíduos)
- O script removeu os usuários `qa.*`, o agendamento, a prescrição, o exercício, as disponibilidades e o tenant `qa-studio-pt`; a contagem posterior deu zero.
- **Resíduos (R2):** 1 `EmailMessage` com `messageId='outbound-sink'` e 1 `passwordResetToken` do `qa.aluno`.

## Erros de console
- Na página desta rodada: 0 erros.
- O histórico do browser tem `ERR_CONNECTION_REFUSED` para a porta 4170, que é o dev server antigo da atividade 19. Não tem relação com esta rodada.

## Falhas e recomendações

### R1 — ID fixo do sink colide com a unique de `EmailMessage.messageId`
- **Onde:** `lib/email.ts` devolvia `{ data: { id: 'outbound-sink' } }`, e `lib/email-templates.ts` grava esse ID em `messageId`, que é único.
- **Efeito:** do segundo e-mail de template em diante, o registro falha com P2002. O fluxo segue com 200, mas o e-mail não aparece no histórico e o log recebe um stack trace.

### R2 — Resíduos fora do script de limpeza
- `EmailMessage` e `passwordResetToken` do `qa.aluno`.

### Observações
- O código de verificação aparece em claro na linha do sink. Isso ajuda o QA local, mas não pode acontecer num servidor de produção rodando com `OUTBOUND_MODE=sink`.
- A fixture de conta ativa obrigou a ajustar `isActive` manualmente para o S2.

---

## Correções da sessão principal (após o QA)

| Achado | Correção |
|---|---|
| R1 | `sinkMessageId()` em `lib/outbound-guard.ts` gera `outbound-sink-<uuid>` por mensagem; usado em `lib/email.ts` e nos 2 pontos de `lib/whatsapp.ts` |
| Observação — código no log | Em `NODE_ENV=production`, `logSunk` mascara sequências de 4+ dígitos (`••••`). Local continua mostrando o código, para o QA |
| R2 | Resíduos apagados do banco local. O script de limpeza da T-2 passa a remover `EmailMessage`, `passwordResetToken` e `verificationCode` das fixtures |
| Observação — fixture ativa | A fixture da T-2 ganha `qa.pendente@example.test`, inativa, para os fluxos que recusam conta ativa |

Testes novos: "gives every dropped email its own id" e "keeps verification codes out of a production server's log in sink mode".

### Reteste após as correções (sessão principal, dev server :4180)
- `npx jest`: 11 suítes, **98 testes passando** (89 antigos + 9 do guard). `tsc` sem erro nos arquivos da T-1.
- R1 em runtime: dois `POST /api/auth/forgot-password` seguidos para a fixture `qa.aluno` → HTTP 200 e 200; duas linhas `[OUTBOUND-SINK]`; **P2002 na janela: 0**; `Sent via Resend` no log inteiro: 0.
- Banco: 2 `EmailMessage` com IDs distintos (`outbound-sink-ee60afa2-…` e `outbound-sink-b51de820-…`). Removidos na limpeza, junto com os 2 `passwordResetToken`.

**Veredito final da T-1: APROVADO.**
