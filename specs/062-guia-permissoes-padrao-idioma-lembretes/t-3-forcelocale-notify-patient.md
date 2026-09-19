# T-3: `forceLocale` central em `notifyPatient`

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Torna possível forçar o idioma de um lembrete Today/Yesterday/Onboarding de fora da função,
mesmo nos branches especiais que hoje ignoram tudo que não seja `user.preferredLocale`.

## Contexto
`lib/notify-patient.ts`: `isPt` é calculado uma vez (`locale.startsWith("pt")`) e usado em todos
os branches — mas os branches especiais (`yesterdayMissingTitles`, `useReminderTemplate`,
`onboardingPending`) chamam seus builders (`buildYesterdayFollowupText`, `buildTodayReminderText`,
`buildOnboardingReminderText`) sempre com esse `isPt` calculado do `preferredLocale`, sem opção
de override — diferente do branch genérico, que já respeita `plainMessagePt` vindo do chamador.

## Passos
1. Adicionar `forceLocale?: "en" | "pt"` a `NotifyPatientParams`.
2. Mudar o cálculo: `const isPt = forceLocale ? forceLocale === "pt" : (locale === "pt-BR" || locale.startsWith("pt"));`
   — uma linha, usada em todos os branches (nenhuma lógica duplicada).
3. Não precisa mudar `send-weekly-closing`/`weekly-closing route` (T-2 da atividade 60) — esse já
   resolve o problema de outro jeito (só passa um idioma em `plainMessage`) e continua
   funcionando igual; `forceLocale` é aditivo, não obrigatório.

## Arquivos afetados
- `lib/notify-patient.ts`

## Critérios de aceite
- [ ] `notifyPatient({ patientId, yesterdayMissingTitles: [...], forceLocale: "en" })` manda o
      texto em inglês mesmo se `preferredLocale` do paciente for `pt-BR`.
- [ ] Mesmo teste com `forceLocale: "pt"` numa paciente `en-GB` — manda em português.
- [ ] Sem `forceLocale`, comportamento idêntico ao de hoje (nenhuma regressão nos lembretes
      já em produção).
- [ ] `npx tsc --noEmit` limpo.
