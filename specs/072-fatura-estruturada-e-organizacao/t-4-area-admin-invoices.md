# T-4: Seção de faturas dentro de `app/admin/finance/`

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo

O lugar que o Bruno pediu: organizar faturas de verdade, sem misturar com
a caixa de e-mail geral — e "tudo junto" com o resto de finance, não uma
área separada.

## Contexto

`app/admin/finance/page.tsx` é hoje uma página longa por seções
(categorias, transações, Stripe, perfil da empresa), sem abas. A seção de
faturas entra como mais um bloco nessa mesma página, extraída pro próprio
componente pra não inchar ainda mais o arquivo (já tem mais de 1700
linhas). Rotas de API ficam em `/api/admin/invoices/*` (URL da API não
precisa espelhar a URL da UI).

## Passos

1. `GET /api/admin/invoices` — lista escopada por `clinicId` (sessão),
   filtros: `patientId`, `status`, `dateFrom`/`dateTo` (por `issueDate`),
   `search` (nome do paciente ou `invoiceNumber`). Paginação simples.
2. `GET /api/admin/invoices/[id]` — detalhe: itens, status, valor,
   paciente, origem (agendamento/assinatura/avulsa), `paidMethod`
   (manual/stripe), histórico de `EmailMessage` vinculados.
3. `GET /api/admin/invoices/[id]/pdf` — serve o `pdfBase64` salvo direto
   no `PatientInvoice` (não depende do `EmailMessage` ainda existir).
4. `PATCH /api/admin/invoices/[id]` (rascunho) — editar itens/valor
   enquanto `status === DRAFT` (liberdade de editar/criar/apagar item,
   conforme decisão do Bruno). Itens congelam depois de `SENT`.
5. `DELETE /api/admin/invoices/[id]` — só permitido em `DRAFT` (apagar
   uma fatura já enviada não faz sentido — ali o caminho é `VOID`).
6. `components/admin/finance-invoices-section.tsx` (novo) — tabela/lista
   com os filtros acima, badge de status colorido, edição inline ou modal
   pra `DRAFT`, link pro perfil do paciente, botão "Baixar PDF", botão
   "Marcar como paga" (T-5) quando aplicável (esconder o botão quando
   `paidMethod === "stripe"`, já que ali é automático).
7. Incluir esse componente em `app/admin/finance/page.tsx`, como mais uma
   seção da página (perto de "Recent Transactions"/"Stripe Transactions",
   que já existem ali).
8. Nota de UX sobre as 4 faturas históricas (T-2 já fez o backfill delas)
   — devem aparecer normalmente na lista, sem tratamento especial, já que
   agora têm registro estruturado igual às novas.

## Arquivos afetados

- `app/api/admin/invoices/route.ts` (novo)
- `app/api/admin/invoices/[id]/route.ts` (novo — GET/PATCH/DELETE)
- `app/api/admin/invoices/[id]/pdf/route.ts` (novo)
- `components/admin/finance-invoices-section.tsx` (novo)
- `app/admin/finance/page.tsx` (inclui a seção nova)

## Critérios de aceite

- [ ] Staff de uma clínica nunca vê fatura de outra (mesma disciplina de
      isolamento já testada nas atividades 070/071).
- [ ] Filtro por paciente/status/período funciona e reflete os dados reais
      criados em T-2 (incluindo as 4 históricas).
- [ ] PDF baixa corretamente mesmo sem abrir o `EmailMessage`.
- [ ] Editar/apagar item só funciona em `DRAFT`; fatura `SENT` não pode
      ter item alterado.
- [ ] Fatura com `paidMethod: "stripe"` não mostra botão manual de marcar
      como paga (já está paga automaticamente).
