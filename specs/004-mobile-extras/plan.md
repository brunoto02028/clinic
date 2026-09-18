# Atividade 4 — App nativo do paciente: Extras (Fase 4)

**Status geral:** concluído (T-1 a T-4; Stripe/push como stubs marcados)
**Criada em:** 07/06/2026
**Depende de:** Atividades 1-3 (concluídas)

> Documento sujeito à revisão do responsável técnico.

## Objetivo
Adicionar à conta do paciente: Conquistas, Assinatura (membership), Quizzes e
Notificações. Integrações externas (Stripe checkout, push nativo) entram como **stubs**
claramente marcados — não há credenciais/infra nesta fase (decisão do usuário).

## Decisões
- Telas com dados reais via auth dual já pronta (`/api/patient/*`): achievements, quizzes,
  membership/plans, subscription.
- **Stripe checkout**: STUB (botão Assinar exibe aviso; sem chaves Stripe).
- **Push notifications**: STUB (toggle visual; requer build nativo + Firebase/APNs + device,
  não testável no Expo Web).
- Acesso pelas opções "Conta" na aba Perfil.

## Tarefas
| Tarefa | Nome | Status | Depende de |
|--------|------|--------|------------|
| T-1 | Conquistas (achievements) — dados reais | concluído | — |
| T-2 | Assinatura: planos + status (assinar = stub Stripe) | concluído | — |
| T-3 | Quizzes — dados reais | concluído | — |
| T-4 | Notificações — stub (toggle) | concluído | — |

## Suposições
1. Achievements/quizzes exibem dados reais quando existirem; estado vazio tratado.
2. Membership lista planos ativos da clínica; assinar é stub até haver Stripe.
3. Push: opt-in visual; registro de token e envio reais ficam para o build nativo.
4. Acesso via seção "Conta" no Perfil (evita poluir a tab bar).
