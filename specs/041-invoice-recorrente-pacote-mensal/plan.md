# Atividade 41 — Geração automática de invoice pra pacotes mensais

## Objetivo

Pacientes com um pacote/plano mensal (`MembershipPlan` + `PatientSubscription`, sem
cobrança automática via Stripe — confirmado que Stripe não está funcional em produção)
recebem, todo mês, um invoice gerado automaticamente como **pendente de aprovação**
(nunca enviado sozinho). O admin só revisa e clica "Approve & Send", em vez de lembrar
de criar o invoice manualmente todo mês.

## Contexto

- `MembershipPlan`/`PatientSubscription` já existem no schema e já têm UI em
  `/admin/memberships` (reaproveitados ontem pro pacote da Ana Livia).
- O gerador de invoice avulso (`app/api/admin/patients/[id]/invoice`, ativ. 40) já sabe
  criar um invoice com itens manuais direto pro paciente, sem depender de consulta —
  a geração mensal vai reaproveitar esse mesmo caminho de "invoice sem appointment".
- Toda a infraestrutura de fila de aprovação (ativ. 39: `EmailMessage.PENDING_APPROVAL`,
  `lib/invoice-pending.ts`) já existe e será reaproveitada sem mudança.

## Decisões de design

1. **Novo campo** `PatientSubscription.lastInvoicedAt DateTime?` — marca quando o
   último invoice automático foi gerado pra essa assinatura.
2. **Nova função** `buildInvoiceForSubscription(subscriptionId)` (mesmo padrão de
   `buildInvoiceForAppointment`) — monta o `InvoiceData` a partir do
   `PatientSubscription` + `MembershipPlan` + paciente, usando
   `getInvoiceBusinessInfo` (já existe). Item único: `{plan.name} — {mês/ano}`,
   valor = `plan.price`.
3. **Nova rota** `POST /api/cron/membership-invoices?key=SECRET` — segue o MESMO padrão
   já usado pelas 8 rotas de cron existentes (`app/api/cron/*`, autenticação por query
   param `key` comparado a `CRON_SECRET`/`NEXTAUTH_SECRET`). Roda diariamente, busca
   `PatientSubscription` com `status: ACTIVE`, `plan.isFree: false`,
   `stripeSubscriptionId: null` (não cobrado via Stripe), e:
   - `lastInvoicedAt` nulo → gera o primeiro invoice.
   - `lastInvoicedAt` ≥ 1 intervalo atrás (respeitando `plan.interval`:
     MONTHLY/WEEKLY/YEARLY) → gera o próximo.
   Gera via `queueInvoiceForApproval` (já existe) e atualiza `lastInvoicedAt`.
4. **Disparo externo**: preciso saber como as 8 rotas de cron que já existem
   (`app/api/cron/appointment-reminders` etc.) são chamadas hoje em produção — crontab
   na VPS, algum serviço externo, ou outra coisa. Sem isso configurado do mesmo jeito
   pra essa rota nova, ela existe mas nunca roda sozinha. **Pergunta pro usuário.**

## Fora de escopo

- Cobrança automática de verdade (isso é o trabalho de Stripe já adiado — "Stripe
  depois" — fora desta atividade).
- Cancelar/pausar a geração automaticamente se o paciente atrasar (sem lógica de
  inadimplência por enquanto — cada mês gera um invoice novo independente do anterior
  ter sido aprovado/pago ou não).
- Editar o plano/valor depois de criado — segue o fluxo já existente do
  `/admin/memberships`.

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Schema: `lastInvoicedAt` em `PatientSubscription` | concluído |
| T-2 | `buildInvoiceForSubscription` + integração com `queueInvoiceForApproval` | concluído |
| T-3 | Rota `POST /api/cron/membership-invoices` | concluído (testado local: 401 c/ key errada, gera 1x, idempotente no mesmo dia) |
| T-4 | Configurar o disparo externo (mesmo mecanismo dos crons existentes) | pendente — aguardando usuário confirmar como o crontab/mecanismo existente funciona |

## Suposições (validar com o usuário)

- Assinaturas com Stripe configurado (`stripeSubscriptionId` preenchido) NÃO entram
  nesse fluxo — presume-se que o Stripe já cobra automaticamente essas (quando/se for
  ativado no futuro).
- Um invoice novo é gerado mesmo que o anterior ainda esteja pendente de aprovação
  (não implementamos trava de "só gera o próximo depois que o admin aprovar o atual") —
  confirmar se isso é aceitável ou se deveria esperar aprovação antes de gerar o
  próximo.
