# T-4: Preview de e-mail + Activity log

**Status:** concluído
**Depende de:** T-2

## Objetivo
Botão "Preview" das duas novas seções mostra exatamente o e-mail que sairia, e o envio aparece
na aba Activity da paciente — mesmo padrão que a atividade 51 já deixou pronto pras outras ações
clínicas (SOAP note, protocolo, exercício).

## Contexto
Rotas de preview existentes seguem o padrão `app/api/admin/adherence/preview-*-email/route.ts`
(ex.: `preview-patient-email`, `preview-yesterday-email`) — leem `?patientId=`, montam o mesmo
HTML que `notifyPatient` mandaria no fallback de e-mail (`wrapInLayout`), devolvem como página
HTML pro `<iframe>` do `AdherenceSection` renderizar.

`AUDIT_LABELS` em `app/api/admin/patients/[id]/activity/route.ts` já mapeia `action` →
`{type, title}` (atividade 51 acrescentou `SOAP_NOTE_CREATED`, `PROTOCOL_ASSIGNED`,
`EXERCISE_PRESCRIBED` seguindo esse padrão).

## Passos
1. Criar `app/api/admin/adherence/preview-weekly-closing-email/route.ts`: lê `?patientId=` e
   `?locale=en|pt`, busca o `firstName` da paciente, monta o texto com `buildWeeklyClosingText`,
   envolve em `wrapInLayout` do mesmo jeito que o fallback de e-mail de `notify-patient.ts` faz
   pro caso genérico (parágrafo com saudação + mensagem), devolve como HTML.
2. Apontar o `previewUrl` das duas seções novas (T-3) pra essa rota com `&locale=en`/`&locale=pt`.
3. Em `AUDIT_LABELS`, acrescentar:
   ```ts
   WEEKLY_CLOSING_SENT_EN: { type: "OTHER", title: "Weekly closing sent (EN)" },
   WEEKLY_CLOSING_SENT_PT: { type: "OTHER", title: "Weekly closing sent (PT)" },
   ```

## Arquivos afetados
- `app/api/admin/adherence/preview-weekly-closing-email/route.ts` (novo)
- `app/api/admin/patients/[id]/activity/route.ts`

## Critérios de aceite
- [ ] Preview (EN) mostra o e-mail com o texto EN certo, nome da paciente interpolado.
- [ ] Preview (PT) mostra o texto PT.
- [ ] Depois de mandar um fechamento semanal, a entrada aparece na aba Activity da paciente com
      o rótulo certo por idioma.
- [ ] `npx tsc --noEmit` limpo.
