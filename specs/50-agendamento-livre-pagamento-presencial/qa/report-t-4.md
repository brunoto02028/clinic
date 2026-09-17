# QA — T-4: API de criação de consulta — `paymentMethod` + confirmação automática

**Resultado: ✅ aprovado** (com uma verificação parcial documentada abaixo)

Ambiente: local (`npm run dev` na porta 4001, banco `bpr_clinic_local`), sessão autenticada de
`qa.pacientea@example.test`.

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | `paymentMethod: "IN_PERSON"` → `CONFIRMED` | API | ✅ |
| 2 | `paymentMethod: "ONLINE"` → `PENDING` | API | ✅ |
| 3 | Sem `paymentMethod` → `PENDING`, default `ONLINE` | API | ✅ |
| 4 | `paymentMethod: "CASH"` (inválido) → `400` | API | ✅ |
| 5 | Sem sessão → comportamento existente preservado | API | ✅ |
| 6 | E-mails refletem a escolha | Email | ⚠️ parcial (ver nota) |

## Evidências

```
ONLINE   → 200 { status: "PENDING",   paymentMethod: "ONLINE" }
ausente  → 200 { status: "PENDING",   paymentMethod: "ONLINE" }   (default preservado)
CASH     → 400 { error: "Invalid paymentMethod" }
IN_PERSON (via UI, T-3) → 200 { status: "CONFIRMED", paymentMethod: "IN_PERSON" }
```

**Sem sessão:**
```
curl -X POST http://localhost:4001/api/appointments ... (sem cookie)
→ 307, Location: /login?callbackUrl=%2Fapi%2Fappointments
```
Não é um `401` JSON literal — é um redirect 307 feito pelo `middleware.ts`, que trata
`/api/appointments` como rota protegida. `middleware.ts` não está no diff desta atividade, esse
comportamento é pré-existente e não regrediu.

**Nota sobre e-mails**: o ambiente local usa um sink de e-mail mockado
(`lib/outbound-guard.ts`, `[OUTBOUND-SINK]`) que só loga o assunto, não o corpo/HTML. Confirmado
nos logs que os e-mails foram disparados sem erro em ambos os casos (`Appointment Confirmed ✅`
para ambos), mas não foi possível capturar o corpo real para validar textualmente a ausência do
link de pagamento (IN_PERSON) e a linha "Payment: Pay in person" no e-mail interno ao admin.
Essa parte foi verificada por revisão de código (as duas variações condicionais de
`plainMessage`/`plainMessagePt` e a linha `<strong>Payment:</strong> ...` estão corretas no
diff), não por execução real do texto final. Recomenda-se checagem manual em staging/produção
antes de considerar esse critério 100% validado.
