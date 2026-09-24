# T-15: "Medir pressão" na ficha, caixa de entrada e origem da leitura

**Status:** ✅ concluída
**Depende de:** T-14
**Fonte:** `spec-medicao-pressao-clinica.md` (Bruno, 23/09/2026), seções 5.2, 5.4, 5.5 e 6.

## Objetivo

A parte que o terapeuta usa: o botão que abre a janela de medição, a tela que espera a leitura, a
caixa de entrada das que chegaram sem dono, e o histórico do paciente dizendo de onde veio cada
medida.

## Contexto

A T-14 entrega o mecanismo; esta entrega a interface. O fluxo real é de recepção: o paciente chega,
o terapeuta abre a ficha, aperta um botão, o paciente mede, e a leitura aparece sozinha. Se o
terapeuta esquecer de abrir a sessão — vai esquecer — a leitura não se perde: fica na caixa de
entrada para ele dizer de quem é.

## Passos

1. **Botão "Medir pressão" / "Measure blood pressure"** na ficha do paciente
   (`app/admin/patients/[id]/page.tsx`, junto da aba de pressão), visível só quando a clínica tem
   aparelho com `isClinicDevice`.
2. **Contexto antes de abrir**: antes da sessão / depois da sessão / outro. Um clique, não um
   formulário.
3. **Tela de espera**: "Aguardando medição de \<paciente\>…", contagem regressiva de 3 minutos,
   botão Cancelar, e o aparelho nomeado. **Polling de 3 em 3 segundos** em
   `GET /api/admin/measurement-sessions/[id]` até `COMPLETED`, `EXPIRED` ou `CANCELLED` — e o
   polling para ao sair da tela. (Fase 2, opcional e fora desta tarefa: `LISTEN/NOTIFY` + SSE.)
4. **Chegou**: mostra sistólica/diastólica/FC, horário e contexto, com "Salvo no histórico de
   \<paciente\>" — e a leitura aparece na aba de pressão sem recarregar a página.
5. **Expirou sem leitura**: "Nenhuma medição recebida. Se você mediu, ela está na caixa de
   entrada." Nada de sumir em silêncio.
6. **Caixa de entrada** em `/admin/measurements/inbox`: as `UnassignedMeasurement` pendentes da
   clínica, com valores e horário. Atribuir (busca de paciente + contexto) grava a
   `BloodPressureReading` com `CLINIC_DEVICE` e registra em `AuditLog` quem atribuiu.
7. **Badge de contagem** no menu, senão ninguém abre a caixa.
8. **Descartar** (foi teste do terapeuta, foi visita) com motivo obrigatório curto e auditoria —
   descartar é decisão, e a leitura não entra no prontuário de ninguém.
9. **Origem e contexto no histórico**: na aba de pressão do admin, no `/dashboard/blood-pressure` do
   paciente e na tela do app, cada leitura mostra se veio de casa ou da clínica e, quando é da
   clínica, se foi antes ou depois da sessão. É critério de aceite do Bruno e é o que torna o
   histórico legível quando as duas origens se misturam.
10. Bilíngue, inglês primeiro. "Terapeuta"/therapist, nunca "fisioterapeuta".

## Arquivos afetados

- `app/admin/patients/[id]/page.tsx` (botão + tela de espera)
- `components/admin/clinic-measurement-button.tsx` (novo)
- `app/admin/measurements/inbox/page.tsx` (novo)
- `app/api/admin/measurements/unassigned/route.ts` (novo: listar, atribuir, descartar)
- `components/admin/blood-pressure-tab.tsx`, `app/dashboard/blood-pressure/page.tsx`,
  `mobile/app/(app)/(clinica)/blood-pressure.tsx` (origem e contexto)

## Critérios de aceite

- [ ] Clínica sem aparelho configurado: o botão não aparece
- [ ] Abrir, medir e ver a leitura na tela em até ~30 segundos, sem digitar
- [ ] O polling para quando a tela fecha
- [ ] Janela expirada é dita, com o caminho para a caixa de entrada
- [ ] Atribuir da caixa põe a leitura no paciente certo e registra quem atribuiu
- [ ] Descartar exige motivo e não grava em prontuário nenhum
- [ ] Cada leitura no histórico mostra origem (casa/clínica) e contexto
- [ ] Staff de outra clínica não vê as leituras desta; paciente não acessa nenhuma destas rotas
- [ ] Bilíngue, inglês primeiro
