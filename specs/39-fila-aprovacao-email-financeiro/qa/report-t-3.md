# QA Report — T-3: API — ações approveSend e discard

**Data:** 2026-09-14
**Ambiente:** local (`bpr_clinic_local`, `http://localhost:4000`) — produção não foi tocada.
**Login usado:** `qa.admina@example.test` (ver nota de segurança no `report-t-2.md`).
**Resultado geral:** ✅ aprovado (com uma nota importante sobre o envio real — ver item 1)

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `approveSend` em item pendente válido → 200, vira `SENT` com `sentAt`/`messageId` | API | ✅ (ver nota) |
| 2 | `approveSend` em `id` inexistente → erro, nada enviado | API | ✅ |
| 3 | `approveSend` em item já `SENT` (clique duplo) → erro, sem reenviar | API | ✅ |
| 4 | `discard` em item pendente válido → 200, vira `TRASH`, nada enviado | API | ✅ |
| 5 | `discard` em `id` inexistente → erro | API | ✅ |
| 6 | `discard` em item já processado (`TRASH`) → erro, idempotente | API | ✅ |

## Detalhes

### 1. `approveSend` em item pendente válido ✅ (com nota sobre "envio real")
- **Comando:**
  ```
  curl -X POST http://localhost:4000/api/admin/email \
    -H "Content-Type: application/json" \
    -d '{"action":"approveSend","id":"cmu1dxnzf0005xz8op61muo8m"}'
  ```
- **Resposta:** `200 OK` — `folder: "SENT"`, `sentAt: "2026-09-14T15:16:19.349Z"`,
  `messageId: "outbound-sink-745c799f-e12e-44b3-883a-4abafc03f99b"`.
- **Nota importante:** o `messageId` começa com `outbound-sink-`, não é um id real do Resend.
  Isso é **esperado e correto**: o projeto tem um guard (`lib/outbound-guard.ts`) que, fora de
  `NODE_ENV=production` (e sem `OUTBOUND_MODE=live`), "afunda" (sink) qualquer envio de email —
  loga no console e retorna sucesso fake, sem chamar o Resend de verdade. Isso é uma proteção
  já existente no projeto para local/QA (evita mandar email real sem querer), e faz sentido
  continuar valendo aqui. Então o que dá pra confirmar localmente é a **lógica da rota**: ela
  chamou `sendEmail()` com os dados certos (destinatário, assunto, HTML, anexo decodificado do
  `attachmentsJson`), tratou o retorno de sucesso, e atualizou `folder/sentAt/messageId`
  corretamente — mas o critério de aceite "Resend retorna id real" não é verificável em
  ambiente local por desenho (o guard existe justamente para isso). Se quiser validar o Resend
  de verdade, precisaria rodar com `OUTBOUND_MODE=live` e um destinatário de teste real — não
  fiz isso aqui por ser fora do escopo pedido (ambiente 100% local, sem tocar serviços
  externos).
- **folderCounts antes/depois:** `PENDING_APPROVAL` 2→1, `SENT` 8→9.

### 2. `approveSend` em id inexistente ✅
- **Comando:** `POST /api/admin/email {"action":"approveSend","id":"nonexistent-id-999"}`
- **Resultado:** `404 Not Found` — `{"error":"No pending item with this id"}`

### 3. `approveSend` em item já `SENT` (clique duplo) ✅
- **Comando:** repetição do mesmo `POST` do item 1, com o mesmo `id` (já `SENT`)
- **Resultado:** `404 Not Found` — `{"error":"No pending item with this id"}` — a rota checa
  `pending.folder !== 'PENDING_APPROVAL'` antes de agir, então não há reenvio nem duplicação.

### 4. `discard` em item pendente válido ✅
- **Setup:** gerei um segundo invoice de teste (`pendingId: cmu1dyj6l0007xz8oy8kozso3`).
- **Comando:** `POST /api/admin/email {"action":"discard","id":"cmu1dyj6l0007xz8oy8kozso3"}`
- **Resultado:** `200 OK` — `{"success":true}`.
- **folderCounts depois:** `TRASH: 1`, `SENT` permaneceu em `8` (não foi incrementado —
  confirma que `discard` não chama `sendEmail`).

### 5. `discard` em id inexistente ✅
- **Comando:** `POST /api/admin/email {"action":"discard","id":"nonexistent-id-999"}`
- **Resultado:** `404 Not Found` — `{"error":"No pending item with this id"}`

### 6. `discard` em item já processado ✅
- **Comando:** repetição do `discard` do item 4, mesmo `id` (já `TRASH`)
- **Resultado:** `404 Not Found` — `{"error":"No pending item with this id"}` — idempotente,
  sem erro 500 nem duplicação de estado.

## Erros de console
Não aplicável (T-3 é só API). No log do servidor (stdout do `next dev`), as chamadas de
`approveSend` aparecem como `[OUTBOUND-SINK] email → ...` (comportamento esperado do guard
local, não um erro).

## Falhas e recomendações
Nenhuma falha funcional. Única observação (não é bug): em ambiente local o "envio real" é
sempre simulado pelo outbound-guard — isso é intencional e correto, só documentando para não
ser confundido com um teste incompleto.
