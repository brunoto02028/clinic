# T-10: Itens médios — checkout duplicado, webhook Connect, trigger/version, escapes

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Fechar os itens médios e baixos da auditoria que não se encaixam nas tarefas anteriores.

## Contexto e passos

| # | Onde | Problema | Correção |
|---|---|---|---|
| 1 | `app/api/billing/checkout/route.ts:36-44,63-94` | reaproveita a linha INCOMPLETE sem expirar a sessão Stripe anterior; "uma assinatura por aluno" só olha ACTIVE → duas abas = duas assinaturas, uma órfã cobrando | expirar a sessão anterior (`checkout.sessions.expire` na conta conectada); recusar checkout novo se já houver INCOMPLETE recente/ACTIVE/PAST_DUE |
| 2 | `app/api/webhooks/stripe-connect/route.ts:124-150,127` | evento atrasado (`subscription.updated`, `invoice.paid`) reativa assinatura CANCELLED; status não mapeado (`incomplete`, `paused`) vira ACTIVE | nunca sair de CANCELLED por evento que não seja de uma assinatura nova; mapear todos os status explicitamente (desconhecido → mantém o atual + log) |
| 3 | `app/api/admin/billing-subscriptions/[id]/route.ts:29-33` | engole erro da Stripe e marca CANCELLED localmente | se a Stripe falhar, não mudar o status; devolver erro ao personal |
| 4 | `app/api/notifications/trigger/route.ts:15-26` | qualquer ADMIN dispara a varredura da plataforma; `CRON_SECRET` tem default `"bpr-cron-secret"` | só SUPERADMIN ou header com `CRON_SECRET` **sem default** (sem env → rota desligada); conferir o env de prod |
| 5 | `app/api/version/update/route.ts` | sem auth, sob `/api/version` pública → anônimo força reload em todos | exigir SUPERADMIN (ou o mesmo segredo do deploy) |
| 6 | `app/api/patient/messages/route.ts:99-100` | conteúdo do aluno entra sem escape no HTML do e-mail para o staff | escapar HTML (helper existente, se houver) |
| 7 | `app/api/challenges/[id]/route.ts:17-36` | leaderboard expõe `studentId` dos outros; aluno vê challenge ARCHIVED | devolver só nome de exibição/posição; esconder ARCHIVED para aluno |
| 8 | `app/api/admin/assessments/route.ts:63`, `[id]/route.ts:73` | `performedAt` inválido → `Invalid Date` → 500 | validar → 400 |
| 9 | `lib/workout-access.ts` (`assertTrainingAccess`) | THERAPIST passa e pode reembolsar/iniciar onboarding Connect | reembolso e onboarding Connect → só ADMIN do tenant (decisão: ver Suposição) |

**Suposição do item 9:** num estúdio personal com mais de um profissional, só o dono (ADMIN) mexe em dinheiro (Connect, reembolso). THERAPIST continua montando treino e registrando avaliação.

## Arquivos afetados
- `app/api/billing/checkout/route.ts`, `app/api/webhooks/stripe-connect/route.ts`, `app/api/admin/billing-subscriptions/[id]/route.ts`
- `app/api/notifications/trigger/route.ts`, `app/api/version/update/route.ts`
- `app/api/patient/messages/route.ts`, `app/api/challenges/[id]/route.ts`
- `app/api/admin/assessments/route.ts`, `app/api/admin/assessments/[id]/route.ts`
- `lib/workout-access.ts` + rotas de reembolso/onboarding Connect

## Critérios de aceite
- [ ] Checkout aberto 2x (duas chamadas seguidas) → a 1ª sessão é expirada ou a 2ª recusada. Nunca duas sessões abertas (teste com Stripe mockado/test-mode quando o Connect for ativado; até lá, teste unitário da lógica).
- [ ] Webhook: `subscription.updated` com status `active` para assinatura CANCELLED → continua CANCELLED; status `paused` → não vira ACTIVE (teste unitário com payload assinado).
- [ ] Cancelamento com erro da Stripe → status inalterado + erro na resposta.
- [ ] `notifications/trigger` como ADMIN → 403; sem `CRON_SECRET` no env → rota recusa.
- [ ] `POST /api/version/update` anônimo → 401.
- [ ] Mensagem do aluno com `<img src=x onerror=alert(1)>` → e-mail ao staff com o texto escapado.
- [ ] Leaderboard sem `studentId` de outros; challenge ARCHIVED → 404 para aluno.
- [ ] `performedAt: "abc"` → 400.
- [ ] THERAPIST → reembolso/onboarding Connect → 403; ADMIN → funciona.
