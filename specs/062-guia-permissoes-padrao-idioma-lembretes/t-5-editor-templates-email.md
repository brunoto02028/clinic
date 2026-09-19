# T-5: Editor de templates de e-mail (opcional)

**Status:** concluído

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

## Arquivos afetados (final)
- `prisma/schema.prisma` (`Clinic.reminderTemplatesJson`)
- `lib/reminder-templates.ts` (novo — helper compartilhado, fallback e tokens)
- `lib/daily-adherence-email.ts`, `lib/onboarding-reminder.ts`, `lib/weekly-closing.ts`,
  `lib/notify-patient.ts`
- `app/api/admin/adherence/preview-patient-email`, `preview-yesterday-email`,
  `preview-onboarding-email`, `preview-weekly-closing-email` (routes)
- `app/api/admin/patients/[id]/weekly-closing/route.ts`
- `app/api/admin/reminder-templates/route.ts` (novo)
- `app/admin/reminder-templates/page.tsx` (novo — movido de `/admin/settings/...` depois do
  bug de rota achado no QA, ver seção "T-5" acima)
- `lib/admin-sections.ts` (aba nova, corrige o destaque do nav)
- `components/admin/patient-adherence-panel.tsx` (link "Edit reminder text")

## Critérios de aceite
- [x] Admin edita o texto de qualquer um dos 4 tipos de lembrete, em EN e PT, separadamente.
- [x] Campo vazio = usa o texto padrão hardcoded (nenhuma regressão pra quem não configura nada).
- [x] Preview real (não só o client-side da tela de edição) reflete o texto customizado com os
      tokens substituídos por dados reais da paciente.
- [x] Isolado por clínica — configurar numa clínica não afeta outra.
- [x] Acessível por qualquer ADMIN/THERAPIST de clínica (não só SUPERADMIN).
