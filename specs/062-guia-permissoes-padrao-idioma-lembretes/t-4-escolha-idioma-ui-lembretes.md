# T-4: Escolha de idioma na UI dos lembretes

**Status:** concluído
**Depende de:** T-3

## Objetivo
Terapeuta escolhe EN ou PT ao mandar Today/Yesterday/Onboarding manualmente, em vez de depender
só da detecção automática.

## Contexto
Ver `plan.md` decisão 4: toggle inline (não duplicar seções, diferente do Fechamento Semanal).
Rotas envolvidas: `app/api/admin/adherence/send-reminder`, `send-yesterday-followup`,
`send-onboarding-reminder`. UI: `components/admin/patient-adherence-panel.tsx`
(`AdherenceSection`, já usado pelas 3 seções + fechamento semanal).

## Passos
1. Cada rota de envio passa a aceitar `locale?: "en" | "pt"` no body do POST; quando presente,
   repassa como `forceLocale` pro `notifyPatient` (T-3).
2. `AdherenceSection`: acrescentar um seletor pequeno EN/PT (dois botões ou um switch) próximo do
   botão "Send now", com estado local (`useState`, inicializado a partir de algo razoável — ex.:
   idioma atual da paciente vindo de `status`/prop nova) — ao clicar "Send now", inclui o idioma
   escolhido em `sendBody`.
3. Preview (`previewUrl`) também deve refletir o idioma escolhido no momento — acrescentar
   `&locale=` na URL do preview, e as rotas `preview-patient-email`/`preview-yesterday-email`/
   `preview-onboarding-email` passam a aceitar esse parâmetro (mesma ideia do T-3, mas só pra
   renderização, sem enviar nada).

## Arquivos afetados
- `app/api/admin/adherence/send-reminder/route.ts`
- `app/api/admin/adherence/send-yesterday-followup/route.ts`
- `app/api/admin/adherence/send-onboarding-reminder/route.ts`
- `app/api/admin/adherence/preview-patient-email/route.ts`
- `app/api/admin/adherence/preview-yesterday-email/route.ts`
- `app/api/admin/adherence/preview-onboarding-email/route.ts`
- `components/admin/patient-adherence-panel.tsx`

## Critérios de aceite
- [ ] Selecionar PT e clicar "Send now" na seção Today manda o lembrete em português, mesmo numa
      paciente com `preferredLocale: en-GB`.
- [ ] Preview reflete o idioma selecionado antes de enviar.
- [ ] Sem mexer no seletor, comportamento continua sendo a detecção automática de hoje (default
      não quebra nada).
- [ ] Card "Adherence" continua com 3 seções (Today/Yesterday/Onboarding) + Fechamento Semanal,
      sem duplicar em 6 — layout compacto confirmado em mobile 390px.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
