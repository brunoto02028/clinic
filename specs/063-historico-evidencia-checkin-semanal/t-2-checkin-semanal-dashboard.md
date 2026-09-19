# T-2: Card passivo de check-in semanal no dashboard do paciente

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Convidar o paciente a registrar como está se sentindo (dor, função) uma vez por semana, do
início do tratamento até o fim — sem enviar nenhuma mensagem automática pra fora do app (regra
permanente do Bruno, ver `plan.md`).

## Contexto
`PatientOutcomeMeasure` e a tela `/dashboard/outcome-measures` já existem e não mudam aqui. Só
falta o convite. Padrão de referência: `components/dashboard/onboarding-wizard.tsx`, renderizado
condicionalmente em `components/dashboard/patient-dashboard.tsx:127` — mesmo modelo: componente
auto-contido que decide sozinho se aparece.

## Passos
1. Nova rota `GET /api/patient/outcome-measures/due` (ou parâmetro na rota existente, decidir
   durante a implementação o que fica mais simples) — usando `getRequestSession` como o resto de
   `app/api/patient/outcome-measures/route.ts`, retorna se o check-in está devido: busca o
   `PatientOutcomeMeasure` mais recente do paciente; se existe e `recordedAt` tem menos de 7 dias,
   `due: false`; se não existe nenhum, compara `User.createdAt` (7+ dias = devido); se existe e
   passou de 7 dias, devido.
2. Novo componente `components/dashboard/weekly-checkin-card.tsx` — busca essa rota ao montar; se
   `due: false`, não renderiza nada (`return null`); se `due: true`, mostra um card convidando o
   paciente a registrar como está se sentindo, com um link/botão pra `/dashboard/outcome-measures`.
   Textos em PT e EN (ver regra permanente de sempre mostrar as duas versões antes de aplicar).
3. Renderizar esse componente em `components/dashboard/patient-dashboard.tsx`, próximo ao
   `OnboardingWizard` (mesma área de avisos/checklists do topo do dashboard).
4. Nada de estado de "dispensar" ou snooze — o card só some quando o paciente de fato preenche o
   formulário (novo registro reseta a janela de 7 dias). Ver Suposição 3 do plan.md.

## Arquivos afetados
- `app/api/patient/outcome-measures/route.ts` (ou rota nova `due/route.ts` — decidir na
  implementação)
- `components/dashboard/weekly-checkin-card.tsx` (novo)
- `components/dashboard/patient-dashboard.tsx`

## Critérios de aceite
- [ ] Paciente sem nenhum registro e cadastrado há mais de 7 dias: card aparece.
- [ ] Paciente sem nenhum registro e cadastrado há menos de 7 dias: card não aparece.
- [ ] Paciente com registro recente (< 7 dias): card não aparece.
- [ ] Paciente com registro de 7+ dias atrás: card aparece.
- [ ] Preencher o formulário faz o card sumir na próxima visita (novo registro reseta a janela).
- [ ] Nenhuma mensagem (WhatsApp/email/SMS/push) é enviada em nenhum cenário — só UI dentro do
      dashboard já logado.
- [ ] Textos PT/EN corretos conforme `preferredLocale`/idioma ativo do paciente.
- [x] Impersonação: staff vendo "como paciente" também vê o card corretamente (mesmo padrão de
      `isImpersonating` já usado em outras partes do dashboard).

## QA e code review

QA (agente qa-tester): 12/12 cenários aprovados (API + UI + impersonação + mobile + confirmação
via AuditLog de zero notificações), `qa/report-t-2.md`. Fixture nova em
`scripts/qa/t063-checkin-due-fixtures.cjs`.

Code review: 1 achado de eficiência (baixa severidade) — a rota buscava `User.createdAt` em
paralelo mesmo quando já existia um `PatientOutcomeMeasure`, query supérflua no caso comum.
Corrigido: só busca `createdAt` quando o paciente nunca registrou nada. Sem outros achados —
confirmado sem caminho de notificação em nenhum branch da rota, cálculo de "devido" imune a bug
de fuso (diferença de timestamps absolutos, não aritmética de calendário).
