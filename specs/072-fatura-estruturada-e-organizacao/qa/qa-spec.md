# QA Spec — Atividade 072: Fatura estruturada + área de organização

## T-1: Model + numeração

**API/unitário**
1. Gerar 20 números de fatura em paralelo (`Promise.all`) pra mesma
   clínica → nenhuma colisão, nenhum furo, sequência 100% contígua
   (1,2,3...20, não 1,2,4,5...).
2. Gerar número pra clínicas diferentes no mesmo instante → sequências
   independentes, sem interferência entre elas.
3. Confirmar que criar/ler um `PatientInvoice` nunca depende nem interfere
   no módulo BA One (`Invoice`/`InvoiceItem`/`BusinessProfile` continuam
   funcionando exatamente como antes — smoke test na rota
   `app/api/mobile/work/invoices/route.ts`).

## T-2: Migração dos 3 pontos de geração

**API**
4. Fatura avulsa por paciente (happy path) — cria `PatientInvoice`+itens
   corretos, `EmailMessage` resultante com `patientInvoiceId` preenchido.
5. Fatura por agendamento — mesmo teste, com `appointmentId` correto no
   registro.
6. Fatura por assinatura mensal (cron) — mesmo teste, com
   `patientSubscriptionId` correto; `PatientSubscription.lastInvoicedAt`
   continua sendo atualizado como antes (sem regressão).
7. Override de valor / itens extra na fatura por agendamento — refletido
   corretamente nos itens estruturados.
8. **Tenant:** staff da Clínica A gera fatura só pra paciente da própria
   clínica — tentar gerar pra `patientId` de outra clínica falha (mesma
   checagem já existente nas rotas, agora também vale pro `PatientInvoice`
   criado).
9. **Stripe automático:** fatura gerada por agendamento com
   `Payment.status = SUCCEEDED` nasce direto `status: PAID`,
   `paidMethod: "stripe"`, `paidById: null`, valores batendo com o
   `Payment`.
10. **Assinatura Stripe fica fora do cron (confirmado com o Bruno,
    23/09/2026 — não é mais "nasce PAID"):** o cron de assinatura
    (`membership-invoices`) nunca sequer seleciona uma `PatientSubscription`
    com `stripeSubscriptionId` preenchido (filtro `stripeSubscriptionId:
    null`, já existia antes desta atividade) — nenhum `PatientInvoice` é
    criado pra ela por esse caminho. Pra uma assinatura sem Stripe, nasce
    `DRAFT` como sempre foi.
11. **Backfill:** as 4 `EmailMessage` de fatura já existentes em produção
    ganham exatamente 4 `PatientInvoice` correspondentes, com o
    `invoiceNumber` original preservado (não um novo da sequência),
    `patientInvoiceId` linkado de volta no e-mail, e nenhuma delas
    duplicada ou perdida (SELECT antes/depois).

## T-3: Sincronização de status

**API**
9. `approveSend` num e-mail com `patientInvoiceId` → `PatientInvoice.status`
   vira `SENT`.
10. `discard` → `PatientInvoice.status` continua `DRAFT` (fatura não
    afetada).
11. `permanentDelete` → `EmailMessage` some, `PatientInvoice` continua
    existindo (campo `patientInvoiceId` do e-mail apagado é irrelevante,
    já que o e-mail em si não existe mais).
12. Fatura já `PAID` recebe uma nova tentativa de `approveSend` (reenvio)
    → status continua `PAID`, não regride pra `SENT`.

## T-4: Seção de faturas dentro de `/admin/finance`

**UI**
13. Seção de faturas aparece dentro de `/admin/finance` (não em rota
    separada), carrega faturas da clínica, com paginação se houver
    volume.
14. Filtro por paciente — só mostra faturas daquele paciente.
15. Filtro por status — só mostra faturas naquele status.
16. Filtro por período (`issueDate` dentro do intervalo) — funciona
    corretamente nas bordas (data exata de início/fim).
17. Busca por `invoiceNumber` — encontra a fatura certa, incluindo uma
    das 4 históricas (backfill).
18. Abrir detalhe de uma fatura mostra itens, status, origem, e-mails
    vinculados, `paidMethod`.
19. Baixar PDF funciona a partir do detalhe, sem depender do e-mail
    original ainda existir (testar depois de um `permanentDelete` no
    e-mail correspondente).
20. Editar item de uma fatura `DRAFT` (adicionar/remover/alterar valor) —
    reflete no total; tentar editar item de uma fatura `SENT` é bloqueado.
21. Apagar uma fatura `DRAFT` funciona; tentar apagar uma `SENT` é
    bloqueado (usar `VOID` em vez disso).
22. **Tenant:** staff de outra clínica não vê a fatura na lista, e
    `GET /api/admin/invoices/[id]` de fatura alheia retorna 404.

## T-5: Marcar como paga

**API/UI**
23. Marcar fatura `SENT` (origem manual) como `PAID` — grava
    `paidAt`/`paidById`/`paidAmount`, reflete na lista/detalhe.
24. Fatura já `PAID` automaticamente via Stripe (`paidMethod: "stripe"`)
    não mostra botão de marcar como paga.
25. Marcar como `VOID` — reflete corretamente, fatura não aparece mais
    como pendente.
26. Fatura `SENT` com `dueDate` no passado e não paga aparece como
    "Overdue" na lista/detalhe (calculado, sem exigir job novo).
27. **Tenant:** staff de outra clínica não consegue marcar fatura alheia
    como paga (404).

## Transversal (todas as tarefas)

- Nenhum cenário deve afetar o módulo BA One (`Invoice` do autônomo).
- Nenhuma regressão nos fluxos já cobertos pelas `qa-spec.md` das
  atividades 070/071 (aprovação/envio de e-mail, PDF da fatura).
- `tsc --noEmit` e `eslint` limpos em todos os arquivos tocados.
- `npm run build` local limpo antes de qualquer push.
