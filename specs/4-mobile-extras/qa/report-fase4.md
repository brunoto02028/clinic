# QA Report — Atividade 4: Extras (Fase 4)

**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO · Playwright/Expo Web + curl.

| Tarefa | Cenário | Obtido | OK |
|--------|---------|--------|----|
| T-1 Conquistas | Tela renderiza (resumo + lista/vazio) | "0/0 desbloqueadas, 0 XP, Nenhuma conquista ainda" (estado vazio) | ✅ |
| T-2 Assinatura | Planos reais + status | "Sem assinatura ativa" + Plano Mensal £60/monthly + Plano Anual £600/yearly | ✅ |
| T-2 Assinatura | Botão Assinar (STUB Stripe) | aviso "Pagamento … via Stripe estará disponível em breve" (sem cobrança) | ✅ |
| T-3 Quizzes | Lista (ou vazio) | API `{quizzes:[]}`; tela trata vazio | ✅ |
| T-4 Notificações | Toggle STUB + nota | switch + "ativação real depende do build nativo" | ✅ |
| Perfil | Seção "Conta" com 4 links | Conquistas/Assinatura/Quizzes/Notificações navegam | ✅ |

Evidências: `screenshots/{membership,achievements,profile-conta}.png`. 0 erros de console.

## Stubs (explícitos — sem credenciais/infra nesta fase)
- **Stripe checkout**: botão Assinar exibe aviso; não inicia cobrança. Integrar quando
  houver chaves Stripe de teste (validar com COO — política interna).
- **Push notifications**: toggle visual; sem registro de token nem envio. Requer build
  nativo + Firebase/APNs + device (não testável no Expo Web). `app/(app)/notifications.tsx`
  documenta o stub no código.

## Dados reais
Achievements, quizzes, membership/plans e subscription consomem `/api/patient/*` via auth
dual (sem mudança de backend nesta fase). Planos seedados (`status=ACTIVE`, `patientScope=all`).
