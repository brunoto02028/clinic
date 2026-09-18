# T-6: Fatura mensal do personal para aprovação

**Status:** pendente
**Depende de:** T-4, T-5

## Objetivo
Por botão, o SUPERADMIN gera a fatura de IA do mês de cada personal faturável. Cada fatura vira um rascunho no financeiro mais um e-mail **aguardando aprovação**. Só sai para o personal quando você aprova.

## Contexto
- Decisão do Bruno: medir + fatura para aprovar, nada automático. Regra do projeto: nenhum envio sem clique.
- `Invoice` (financeiro) aceita cliente livre (`clientName`/`clientEmail`), itens (`InvoiceItem`) e IVA do `BusinessProfile`.
- Fila da ativ. 39: `EmailMessage` com `folder: PENDING_APPROVAL`, revisada em `/admin/email` com "Approve & Send".
- Suposições do plano:
  - uma linha por funcionalidade + tabela por aluno no e-mail;
  - mínimo de £1,00 (abaixo disso acumula para o mês seguinte);
  - evento que chega depois do fechamento entra no mês seguinte.

## Passos
1. `POST /api/admin/ai-costs/invoices { month }` (SUPERADMIN). Para cada tenant faturável com repasse ≥ mínimo **e sem fatura** para aquele mês:
   1. selecionar os eventos do tenant com `billingPeriod = null` e `createdAt` até o fim do mês;
   2. em transação:
      - criar o `Invoice` DRAFT com itens por funcionalidade (quantidade = chamadas, valor = custo × margem × câmbio);
      - gravar nas notas: período, câmbio e margem usados;
      - marcar os eventos com `billingPeriod = month`;
      - gravar o vínculo tenant+mês → invoice (tabela `AiBillingPeriod` com `@@unique([clinicId, month])`, garantindo idempotência);
   3. criar o `EmailMessage` PENDING_APPROVAL para o e-mail do dono do tenant (ADMIN): resumo, itens e tabela por usuário (personal + cada aluno).
2. Tenant abaixo do mínimo: não gera nada. Os eventos continuam com `billingPeriod = null` e entram no mês seguinte.
3. Resposta: lista do que foi gerado, do que foi pulado (motivo) e do que já existia.
4. Painel (T-4):
   - botão "Gerar faturas de <mês>" com confirmação mostrando a prévia (tenant, valor);
   - depois, status por tenant com link para a fatura e para a fila de aprovação.
5. Sem câmbio configurado (T-5) → o botão fica desabilitado, com explicação.

## Arquivos afetados
- `prisma/schema.prisma` (`AiBillingPeriod`, aditivo)
- `app/api/admin/ai-costs/invoices/route.ts` (novo)
- `lib/ai-billing.ts` (novo: cálculo + montagem da fatura e do e-mail)
- componentes do painel (T-4)

## Critérios de aceite
- [ ] Com eventos do QA Studio PT no mês e margem/câmbio configurados → 1 `Invoice` DRAFT com itens por funcionalidade. Total = soma à mão (custo × (1 + margem) × câmbio + IVA conforme o `BusinessProfile`).
- [ ] 1 `EmailMessage` PENDING_APPROVAL para o dono do tenant, com a tabela por usuário. **Nada enviado** até o "Approve & Send".
- [ ] Rodar o POST de novo para o mesmo mês → nada duplicado ("já existia").
- [ ] Evento criado depois da geração → não entra na fatura fechada; entra na do mês seguinte.
- [ ] Tenant com repasse < £1,00 → pulado com motivo; eventos ficam para o mês seguinte.
- [ ] Clínica BPR / tenant não faturável → nunca gera fatura.
- [ ] Não-SUPERADMIN → 403.
- [ ] Aprovar na fila → e-mail sai (no QA, com envio desligado: status muda e o conteúdo é o esperado).
