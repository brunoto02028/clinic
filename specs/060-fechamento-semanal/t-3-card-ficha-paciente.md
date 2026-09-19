# T-3: Card na ficha do paciente (UI)

**Status:** concluído
**Depende de:** T-2

## Objetivo
Duas novas seções no card "Adherence" existente — "Weekly closing (EN)" e "Weekly closing
(PT)" — reaproveitando o componente `AdherenceSection` já pronto, sem criar UI nova do zero.

## Contexto
`components/admin/patient-adherence-panel.tsx` já tem o padrão exato (Preview + Send now + "Sent
[data]") em `AdherenceSection`, usado hoje por Today/Yesterday/Onboarding. Duas diferenças que
exigem um ajuste pequeno no componente:
- O `send()` de `AdherenceSection` hoje sempre manda `body: { patientId }` pra uma rota
  clínic-wide. A rota nova (T-2) é `patientId`-scoped na própria URL e espera `{ locale }` no
  corpo — precisa de um jeito de customizar o corpo do POST por instância.
- `AdherenceSection` decide "tudo feito" vs "faltando" olhando `status.allDone`/`status.missing`.
  Pro fechamento semanal não existe lista de itens — é só "mandei essa semana" ou não. Dá pra
  reaproveisar o mesmo componente tratando `missing: []` e a label ignorando a contagem (ver
  passo 3).

## Passos
1. Em `AdherenceSection`, trocar o `body: JSON.stringify({ patientId })` fixo por um prop novo
   opcional `sendBody?: Record<string, any>`, default `{ patientId }` quando omitido — as três
   seções existentes (Today/Yesterday/Onboarding) não passam esse prop, continuam iguais.
2. Em `PatientAdherencePanel`, buscar o status do fechamento semanal junto dos outros dois
   fetches já existentes (`Promise.all`): `GET /api/admin/patients/${patientId}/weekly-closing`.
3. Renderizar duas `AdherenceSection` novas dentro do mesmo `<Card>`, depois de "Onboarding":
   - `title="Weekly closing (EN)"`, `doneLabel="Sent this week."`,
     `missingLabel={() => "Not sent this week"}` (ignora o `n`), `status={{ hasPlan: <ver passo 4>, allDone: !!weeklyClosing.en.sentAt, missing: [], reminderSentAt: weeklyClosing.en.sentAt }}`,
     `sendUrl="/api/admin/patients/${patientId}/weekly-closing"`, `sendBody={{ locale: "en" }}`.
   - Mesma coisa pra PT, trocando os textos e `locale: "pt"`. Renderizar essa segunda um pouco
     menor/discreta (ex.: sem o bullet-list vazio, cor mais neutra) — é a "opção" que o Bruno
     pediu, não o caminho principal.
4. `hasPlan` das duas seções novas: `true` só se a paciente tiver pelo menos um protocolo
   `SENT_TO_PATIENT` ou prescrição ativa — reaproveitar o mesmo sinal que `data.hasPlan` (Today)
   já usa, não precisa buscar de novo.
5. Ajustar a rota `GET .../weekly-closing` (T-2) pra devolver esse mesmo formato
   `{ sentAt: ISO | null }` por idioma, já compatível com o que o componente espera.

## Arquivos afetados
- `components/admin/patient-adherence-panel.tsx`

## Critérios de aceite
- [ ] Card "Adherence" mostra "Weekly closing (EN)" com botão "Send now" quando ainda não
      mandou essa semana.
- [ ] Clicar em "Send now" (EN) manda a mensagem, o botão vira "Sent [data/hora]" e fica
      desabilitado.
- [ ] "Weekly closing (PT)" é independente — mandar EN não marca PT como enviado, e vice-versa.
- [ ] O onboarding/today/yesterday continuam funcionando exatamente como antes (nenhuma
      regressão visual ou funcional no `sendBody` default).
- [ ] Viewport mobile 390px: as duas seções novas não quebram layout.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
