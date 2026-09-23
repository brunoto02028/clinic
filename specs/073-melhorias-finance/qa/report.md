# QA Report — Atividade 073: Melhorias no Finance

## Code review — GO com ressalvas, 2 achados corrigidos

Achados "deveria corrigir", ambos corrigidos e confirmados com smoke test
isolado antes do QA local terminar:

1. **Race condition em "Mark as paid"** — dois cliques quase simultâneos
   (duplo clique, retry, duas abas) podiam passar os dois pelo guard de
   status e cada um criar seu próprio `FinancialEntry`, duplicando a
   receita. Corrigido: `app/api/admin/invoices/[id]/route.ts` agora tranca
   a linha (`SELECT ... FOR UPDATE`) e reconfirma o status de dentro da
   transação antes de marcar como paga — mesmo padrão já usado na edição
   de itens (ativ. 072). Teste isolado: 5 chamadas simultâneas → 1
   sucesso, 4 rejeitadas, exatamente 1 `FinancialEntry` criado.
2. **Segunda fatura pro mesmo agendamento virava 500 cru** — antes desta
   atividade já era possível gerar 2 faturas pro mesmo `appointmentId`
   (bug pré-existente, silencioso); agora que uma delas grava
   `stripePaymentIntentId` (`@unique`), a segunda tentativa colidia na
   constraint e devolvia um 500 sem explicação. Corrigido:
   `app/api/admin/appointments/[id]/invoice/route.ts` agora barra
   explicitamente com 409 + mensagem clara se já existe uma fatura não-VOID
   pro agendamento — fecha o bug original e o novo ao mesmo tempo. Teste
   isolado: primeira geração ok, segunda tentativa bloqueada corretamente.

Achado opcional (também corrigido, baixo custo): card do gráfico do
Dashboard ganhou uma legenda curta explicando que ele usa data de
pagamento, não data de criação (diferente dos cards acima) — evita
confusão quando um lançamento sincronizado do Stripe tem essas datas em
meses diferentes.

## QA local — 18/20 aprovado, 2 pendências esperadas (ambiente)

Fixtures `qa073-*`/`QA073*` em `bpr_clinic_local`, 2 clínicas (teste de
tenant), tudo limpo ao final e confirmado por SELECT (`PatientInvoice`/
`FinancialEntry` voltaram a 0 registros no banco local).

- **T-1** (fatura paga → `FinancialEntry`): 5/5 cenários aprovados —
  manual com seletor de forma de pagamento, automático via Stripe,
  categoria inferida certa, Dashboard reflete na hora, isolamento de
  tenant. Idempotência confirmada (guard de status já bloqueava re-pagar
  antes mesmo do fix da race condition acima).
- **T-2** (sync Stripe via cron): guard de auth (`401`/estrutura)
  confirmado; o corpo do sync em si (dedupe cruzado com T-1, rodar 2x)
  **não foi exercitado localmente** — falta `STRIPE_SECRET_KEY` real e
  `DEFAULT_CLINIC_SLUG` no ambiente local (só existem em produção). Fica
  pro QA online.
- **T-3** (despesa recorrente): 6/6 aprovado — gera, idempotente (2ª
  chamada no mesmo dia não duplica), dia errado não gera, entrada
  não-recorrente nunca tocada, auth, isolamento de tenant.
- **T-4** (gráfico do Dashboard): 3/3 aprovado — dados batendo com a API,
  não muda com o filtro de período, estado vazio limpo em EN/PT.
- **T-5** (nota em Categories): aprovado, texto + tooltip em EN/PT.
- Regressão: criar entrada manual em Income continua funcionando.
- `tsc --noEmit`/`eslint`: limpos nos arquivos da atividade.

Nota de ambiente (não é bug do produto): a primeira tentativa do agente de
QA achou o gráfico do T-4 "não renderizando" — era cache de chunk do
Next dev (`Cache-Control: immutable`) numa aba do Playwright já aberta
antes de um restart do servidor, mesmo problema já catalogado na memória
do usuário sobre cache/HMR obsoleto. Resolvido testando numa aba nova.

## Pendente para o QA online

- T-2: dedupe cruzado de verdade (fatura Stripe-paga via T-1 não deve ser
  duplicada quando o sync do Stripe depois vê a mesma cobrança) e o cron
  rodando ponta a ponta contra o Stripe real — só possível em produção
  (`STRIPE_SECRET_KEY`/`DEFAULT_CLINIC_SLUG` reais).
- Confirmar em produção que as 2 correções do code review (race condition,
  fatura duplicada) também se comportam certo com dado real.
