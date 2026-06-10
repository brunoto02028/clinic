# QA Report — Atividade 4: Extras (Fase 4)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO · Playwright/Expo Web + curl.

| Tarefa | Cenário | Obtido | OK |
|--------|---------|--------|----|
| T-1 Conquistas | Tela renderiza (resumo + lista/vazio) | "0/0 desbloqueadas, 0 XP, Nenhuma conquista ainda" (estado vazio) | ✅ |
| T-2 Assinatura | Planos reais + status | "Sem assinatura ativa" + Plano Mensal £60/monthly + Plano Anual £600/yearly | ✅ |
| T-2 Assinatura | Assinar (integração REAL) | chama `POST /api/patient/membership/subscribe` (bearer); sem Stripe key → ativa em "manual payment mode"; "Plano atual" → "Plano Mensal" | ✅ |
| T-3 Quizzes | Lista (ou vazio) | API `{quizzes:[]}`; tela trata vazio | ✅ |
| T-4 Notificações | Toggle STUB + nota | switch + "ativação real depende do build nativo" | ✅ |
| Perfil | Seção "Conta" com 4 links | Conquistas/Assinatura/Quizzes/Notificações navegam | ✅ |

Evidências: `screenshots/{membership,achievements,profile-conta}.png`. 0 erros de console.

## Stripe checkout — integração REAL (não é mais stub)
O app chama `POST /api/patient/membership/subscribe` (endpoint já existente, dual-auth via
`getEffectiveUser`). O backend (`lib/stripe`) lê `STRIPE_SECRET_KEY` do ambiente:
- **com** `STRIPE_SECRET_KEY` + `plan.stripePriceId`: cria Stripe Checkout Session e o app
  abre a `checkoutUrl` (`Linking.openURL`);
- **sem** Stripe / sem `stripePriceId`: ativa em "manual payment mode" (sem cobrança).

Validado ponta a ponta no `clinic_test` **sem** `STRIPE_SECRET_KEY` (manual mode) — nenhuma
cobrança, sem tocar produção. **Não foram usadas as chaves `sk_live` de produção** (risco de
cobrança real). Para exercitar o checkout hospedado, basta `sk_test_` + `stripePriceId` num
`.env` local — código já pronto. Ativação com `sk_live` deve passar pelo COO (política interna).

## Stub remanescente
- **Push notifications**: toggle visual; sem registro de token nem envio. Requer build
  nativo + Firebase/APNs + device (não testável no Expo Web). `app/(app)/notifications.tsx`
  documenta o stub no código.

## Dados reais
Achievements, quizzes, membership/plans e subscription consomem `/api/patient/*` via auth
dual (sem mudança de backend nesta fase). Planos seedados (`status=ACTIVE`, `patientScope=all`).
