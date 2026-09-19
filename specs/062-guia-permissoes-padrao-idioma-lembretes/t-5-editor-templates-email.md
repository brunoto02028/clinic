# T-5: Editor de templates de e-mail (opcional)

**Status:** pendente confirmação — NÃO implementar sem o Bruno confirmar explicitamente que
quer isso agora.

**Depende de:** nenhuma (independente das outras tarefas)

## Objetivo
Bruno edita, pelo admin, o texto dos lembretes (Today/Yesterday/Onboarding/Fechamento Semanal)
em PT e EN, sem precisar me pedir a cada ajuste.

## Contexto
Precedente já existe no projeto: `SiteSettings.consentTextsJson`/`consentTextsJsonPt`
(atividade 51, Termos e Condições) — texto em PT/EN salvo no banco, editável, com fallback pro
texto padrão hardcoded quando vazio. Este trabalho replicaria o mesmo padrão pros templates de
`lib/daily-adherence-email.ts`, `lib/onboarding-reminder.ts` e `lib/weekly-closing.ts`.

## Por que está marcada como opcional
O Bruno perguntou "onde e como edito esses textos" mas ainda não confirmou se quer isso
implementado agora ou se prefere continuar pedindo ajustes pontuais (mais rápido no curto prazo,
sem o custo de construir um editor). Essa é uma tarefa de escopo real (schema + rotas + UI de
edição com preview), não um ajuste pequeno.

## Passos (só ao confirmar)
1. Campo(s) novo(s) em `Clinic` (ou `SiteSettings`, seguir o padrão já usado) pra armazenar os
   textos customizados por tipo de lembrete, em PT e EN.
2. Cada builder de texto (`todayPlainMessage`, `yesterdayPlainMessage`,
   `buildOnboardingReminderText`, `buildWeeklyClosingText`) passa a checar o texto customizado
   antes de cair no hardcoded.
3. Tela de admin com um campo de texto por template/idioma + preview antes de salvar.

## Arquivos afetados (estimativa, confirmar ao decidir implementar)
- `prisma/schema.prisma`
- `lib/daily-adherence-email.ts`, `lib/onboarding-reminder.ts`, `lib/weekly-closing.ts`
- Nova tela de admin + rota de API

## Critérios de aceite
- [ ] (a definir quando confirmado)
