# QA report — T-1 (Model + APIs preview/send/template) — atividade 068

**Veredito: APROVADO** (cenários 1–7, 14–16, 19). Ambiente local (`bpr_clinic_local`), dev server em porta isolada (`.next-qa068`), sessão por cookie fabricado. `OUTBOUND_MODE`/`OUTBOUND_ALLOWLIST` nunca definidos — todo envio ficou como `[OUTBOUND-SINK]` no log do dev server (confirmado por cenário), nenhum e-mail real. Executado pelo agente qa-tester; relatório consolidado pela sessão principal porque o agente não pôde gravar arquivos.

| # | Cenário | Resultado |
|---|---|---|
| 1 | preview válido → 200, HTML com logo, `toMasked`, `hash` | APROVADO |
| 2 | send com o mesmo conteúdo do preview → 200, log criado, HTML do log = HTML do preview | APROVADO |
| 3 | send com corpo/assunto/idioma alterado, sem hash, hash vazio/numérico/inválido → 409/400, nada gravado | APROVADO |
| 4 | validações (assunto vazio, corpo > 5000, idioma inválido, "both" com um idioma faltando, limites 200/5000 no boundary) | APROVADO |
| 5 | paciente sem e-mail → 400 em preview e send; paciente inexistente → 404 | APROVADO |
| 6 | sem sessão → 307 redirect; paciente logado → 403; staff tenant personal → 403 ("Not available for studio accounts"); staff de outra clínica → 404 | APROVADO |
| 7 | 6º envio em sequência → 429; 10 envios paralelos → só 6 passam (rate limit resiste a corrida) | APROVADO |
| 14 | POST `/api/admin/appointments` com `sendConfirmation:false` (presencial) → 201, sink só mostra cópia ao admin, nada ao paciente | APROVADO |
| 15 | POST sem `sendConfirmation` → comportamento antigo, e-mail ao paciente (descartado pelo guard local) | APROVADO |
| 16 | POST com `paymentMode:"online"` e `sendConfirmation:false` → e-mail ainda enviado (link de pagamento) | APROVADO |
| 19 | GET template com `appointmentId` de outro paciente → 404 (nos dois sentidos); sem `appointmentId` → 400 | APROVADO |

## Achados e tratamento
1. **CRLF no assunto não era bloqueado** (`subjectEn: "Hi\r\nBcc: x@evil.test"` passava no preview). Não chegava a ser header injection (Resend recebe `subject` como campo estruturado), mas era um ponto a fechar. **Corrigido**: `lib/patient-email.ts` rejeita `\r`/`\n` no assunto (400). Reverificado com 4 casos (CRLF, LF, assunto normal, quebra de linha no corpo continua permitida).

## Reteste após a correção de CRLF (code review) — APROVADO
Confirmado por leitura de código e teste de unidade: `subjectEn`/`subjectPt` com `\r` ou `\n` → 400; concatenação final do assunto (`subject1 / subject2`) também fica limpa, porque a validação roda antes da concatenação.
